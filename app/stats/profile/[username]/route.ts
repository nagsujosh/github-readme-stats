import { usernameSchema, themeSchema, hexColorSchema } from "@/lib/utils/validate";
import { jsonResponse, svgResponse, cacheHeaders } from "@/lib/utils/http";
import { rateLimitIp } from "@/lib/cache/rateLimit";
import { renderProfileCard } from "@/lib/render/profileCard";
import { loadSnapshot, getSnapshotTtlSeconds, getVersion, saveSnapshot, tryAcquireAnalyzeLock, releaseAnalyzeLock } from "@/lib/cache/snapshotStore";
import { listUserRepos } from "@/lib/github/client";
import { normalizeRepos } from "@/lib/github/normalize";
import { computeClassicAggregates } from "@/lib/signals/classic";
import { computeMaturity } from "@/lib/signals/maturity";
import type { Snapshot } from "@/lib/github/types";

export const runtime = "nodejs";

function getIp(req: Request) {
  // Vercel provides x-forwarded-for
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "0.0.0.0").trim();
}

function pickTheme(theme: "light" | "dark" | "auto") {
  return theme === "dark" ? "dark" : "light";
}

async function analyzeAndSave(username: string): Promise<Snapshot> {
  const ttlSeconds = getSnapshotTtlSeconds();
  const version = getVersion();
  const nowIso = new Date().toISOString();

  const { repos: apiRepos, meta } = await listUserRepos(username);
  const repos = normalizeRepos(apiRepos);

  const aggregates = computeClassicAggregates(repos);
  const maturity = computeMaturity(repos);

  const snapshot: Snapshot = {
    version,
    username,
    generatedAt: nowIso,
    ttlSeconds,
    repoCount: repos.length,
    repos,
    aggregates,
    unique: { maturity },
    debug: {
      githubApiCalls: meta.calls,
      rateLimit: meta.rateLimit,
    },
  };

  await saveSnapshot(username, snapshot);
  return snapshot;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const params = await ctx.params;
  const ip = getIp(req);
  const rl = await rateLimitIp(ip);
  if (!rl.ok) {
    return jsonResponse(
      { error: "rate_limited", message: "Too many requests. Try again later." },
      { status: 429, headers: cacheHeaders({ sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }) }
    );
  }

  const parse = usernameSchema.safeParse(params.username);
  if (!parse.success) {
    return jsonResponse({ error: "bad_request", message: parse.error.issues[0]?.message ?? "Invalid username" }, { status: 400 });
  }
  const username = parse.data;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "svg" ? "svg" : "json";
  const includeRepos = url.searchParams.get("includeRepos") === "true";
  const includeDebug = url.searchParams.get("includeDebug") === "true";

  // SVG-specific params
  const theme = themeSchema.safeParse(url.searchParams.get("theme") ?? "auto").success
    ? themeSchema.parse(url.searchParams.get("theme") ?? "auto")
    : "auto";
  const accentParam = url.searchParams.get("accent");
  const bgParam = url.searchParams.get("bg");
  const border = (url.searchParams.get("border") ?? "true") !== "false";
  const accent = accentParam && hexColorSchema.safeParse(accentParam).success ? `#${accentParam}` : "#6366F1";
  const bg = bgParam && hexColorSchema.safeParse(bgParam).success ? `#${bgParam}` : (pickTheme(theme) === "dark" ? "#0B1220" : "#FFFFFF");

  const snap = await loadSnapshot(username);
  if (snap) {
    if (format === "svg") {
      const svg = renderProfileCard({
        username,
        repoCount: snap.repoCount,
        stars: snap.aggregates.starsTotal,
        forks: snap.aggregates.forksTotal,
        topLanguages: snap.aggregates.languages,
        archivedCount: snap.aggregates.archivedCount,
        forkedCount: snap.aggregates.forkedCount,
        maturityScore: snap.unique.maturity.score,
        updatedAt: new Date(snap.generatedAt).toISOString().slice(0, 10),
        theme: pickTheme(theme),
        accent,
        bg,
        border,
      });
      return svgResponse(svg, {
        status: 200,
        headers: {
          ...cacheHeaders({ sMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86400 }),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      });
    }
    const body = {
      ...snap,
      repos: includeRepos ? snap.repos : [],
      debug: includeDebug ? snap.debug : { githubApiCalls: snap.debug.githubApiCalls },
    };
    return jsonResponse(body, {
      status: 200,
      headers: {
        ...cacheHeaders({ sMaxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 }),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  }

  // Cache miss: analyze (lock to prevent stampede)
  const locked = await tryAcquireAnalyzeLock(username, 30);
  if (!locked) {
    // Another request is analyzing; return a predictable placeholder response.
    return jsonResponse(
      { status: "analyzing", username, message: "Snapshot is being generated. Retry shortly." },
      { status: 202, headers: cacheHeaders({ sMaxAgeSeconds: 10, staleWhileRevalidateSeconds: 60 }) }
    );
  }

  try {
    const fresh = await analyzeAndSave(username);
    if (format === "svg") {
      const svg = renderProfileCard({
        username,
        repoCount: fresh.repoCount,
        stars: fresh.aggregates.starsTotal,
        forks: fresh.aggregates.forksTotal,
        topLanguages: fresh.aggregates.languages,
        archivedCount: fresh.aggregates.archivedCount,
        forkedCount: fresh.aggregates.forkedCount,
        maturityScore: fresh.unique.maturity.score,
        updatedAt: new Date(fresh.generatedAt).toISOString().slice(0, 10),
        theme: pickTheme(theme),
        accent,
        bg,
        border,
      });
      return svgResponse(svg, {
        status: 200,
        headers: {
          ...cacheHeaders({ sMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86400 }),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      });
    }
    const body = {
      ...fresh,
      repos: includeRepos ? fresh.repos : [],
      debug: includeDebug ? fresh.debug : { githubApiCalls: fresh.debug.githubApiCalls },
    };
    return jsonResponse(body, {
      status: 200,
      headers: {
        ...cacheHeaders({ sMaxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 }),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  } catch (e: unknown) {
    const status = e instanceof Error && "status" in e && e.status === 404 ? 404 : 500;
    return jsonResponse(
      { error: status === 404 ? "not_found" : "server_error", message: status === 404 ? "GitHub user not found" : "Failed to analyze user" },
      { status }
    );
  } finally {
    await releaseAnalyzeLock(username);
  }
}

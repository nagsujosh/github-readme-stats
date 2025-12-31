import { usernameSchema, themeSchema, hexColorSchema } from "@/lib/utils/validate";
import { svgResponse, cacheHeaders } from "@/lib/utils/http";
import { rateLimitIp, rateLimitAnalyzeUser } from "@/lib/cache/rateLimit";
import { loadSnapshot, getSnapshotTtlSeconds, getVersion, saveSnapshot, tryAcquireAnalyzeLock, releaseAnalyzeLock } from "@/lib/cache/snapshotStore";
import { listUserRepos } from "@/lib/github/client";
import { normalizeRepos } from "@/lib/github/normalize";
import { computeClassicAggregates } from "@/lib/signals/classic";
import { computeMaturity } from "@/lib/signals/maturity";
import { renderMaturityCard } from "@/lib/render/maturityCard";
import type { Snapshot } from "@/lib/github/types";

export const runtime = "nodejs";

function getIp(req: Request) {
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
    debug: { githubApiCalls: meta.calls, rateLimit: meta.rateLimit },
  };

  await saveSnapshot(username, snapshot);
  return snapshot;
}

function placeholderSvg(username: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="540" height="140" role="img" aria-label="Analyzing ${username}" viewBox="0 0 540 140">
  <title>Analyzing ${username}</title>
  <desc>Generating engineering maturity snapshot.</desc>
  <rect x="0" y="0" width="540" height="140" rx="16" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="539" height="139" rx="16" fill="none" stroke="#e5e7eb"/>
  <text x="24" y="44" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700" fill="#111827">
    ${username} • Engineering Maturity
  </text>
  <text x="24" y="72" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="12" fill="#6b7280">
    Analyzing repositories… refresh soon.
  </text>
</svg>`;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const params = await ctx.params;
  const ip = getIp(req);
  const rl = await rateLimitIp(ip);
  if (!rl.ok) {
    return svgResponse(placeholderSvg(params.username), {
      status: 429,
      headers: cacheHeaders({ sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }),
    });
  }

  const parse = usernameSchema.safeParse(params.username);
  if (!parse.success) return svgResponse(placeholderSvg("invalid-user"), { status: 400 });
  const username = parse.data;

  const url = new URL(req.url);
  const theme = themeSchema.safeParse(url.searchParams.get("theme") ?? "auto").success
    ? themeSchema.parse(url.searchParams.get("theme") ?? "auto")
    : "auto";

  const accentParam = url.searchParams.get("accent");
  const bgParam = url.searchParams.get("bg");
  const border = (url.searchParams.get("border") ?? "true") !== "false";
  const details = (url.searchParams.get("details") ?? "low") === "high" ? "high" : "low";

  const accent = accentParam && hexColorSchema.safeParse(accentParam).success ? `#${accentParam}` : "#22C55E";
  const bg = bgParam && hexColorSchema.safeParse(bgParam).success ? `#${bgParam}` : (pickTheme(theme) === "dark" ? "#0B1220" : "#FFFFFF");

  const snap = await loadSnapshot(username);
  if (snap) {
    const m = snap.unique.maturity;
    const svg = renderMaturityCard({
      username,
      score: m.score,
      subscores: m.subscores,
      strengths: m.strengths,
      gaps: m.gaps,
      updatedAt: new Date(snap.generatedAt).toISOString().slice(0, 10),
      theme: pickTheme(theme),
      accent,
      bg,
      border,
      details,
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

  const rlUser = await rateLimitAnalyzeUser(username);
  if (!rlUser.ok) {
    return svgResponse(placeholderSvg(username), {
      status: 202,
      headers: cacheHeaders({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 }),
    });
  }

  const locked = await tryAcquireAnalyzeLock(username, 30);
  if (!locked) {
    return svgResponse(placeholderSvg(username), {
      status: 202,
      headers: cacheHeaders({ sMaxAgeSeconds: 10, staleWhileRevalidateSeconds: 120 }),
    });
  }

  try {
    const fresh = await analyzeAndSave(username);
    const m = fresh.unique.maturity;
    const svg = renderMaturityCard({
      username,
      score: m.score,
      subscores: m.subscores,
      strengths: m.strengths,
      gaps: m.gaps,
      updatedAt: new Date(fresh.generatedAt).toISOString().slice(0, 10),
      theme: pickTheme(theme),
      accent,
      bg,
      border,
      details,
    });

    return svgResponse(svg, {
      status: 200,
      headers: cacheHeaders({ sMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86400 }),
    });
  } catch (e: unknown) {
    const status = e instanceof Error && "status" in e && e.status === 404 ? 404 : 500;
    return svgResponse(placeholderSvg(status === 404 ? "user-not-found" : username), {
      status,
      headers: cacheHeaders({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 }),
    });
  } finally {
    await releaseAnalyzeLock(username);
  }
}

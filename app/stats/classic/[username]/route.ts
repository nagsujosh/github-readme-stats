import { usernameSchema, themeSchema, hexColorSchema } from "@/lib/utils/validate";
import { svgResponse, cacheHeaders } from "@/lib/utils/http";
import { rateLimitIp, rateLimitAnalyzeUser } from "@/lib/cache/rateLimit";
import {
  loadSnapshot,
  getSnapshotTtlSeconds,
  getVersion,
  saveSnapshot,
  tryAcquireAnalyzeLock,
  releaseAnalyzeLock,
} from "@/lib/cache/snapshotStore";
import { listUserRepos } from "@/lib/github/client";
import { normalizeRepos } from "@/lib/github/normalize";
import { computeClassicAggregates } from "@/lib/signals/classic";
import { computeMaturity } from "@/lib/signals/maturity";
import { renderClassicBoard } from "@/lib/render/classicBoard";
import type { Snapshot } from "@/lib/github/types";

export const runtime = "nodejs";
// Recommended for API-ish routes; avoids Next trying to optimize.
export const dynamic = "force-dynamic";

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "0.0.0.0").trim();
}

function pickTheme(theme: "light" | "dark" | "auto") {
  // For embeds, "auto" -> light; README backgrounds vary.
  return theme === "dark" ? "dark" : "light";
}

function computeActivityBins(repos: Snapshot["repos"]) {
  // bins: [0-7, 8-30, 31-90, 91-180, 181-365, 365+]
  const bins = [0, 0, 0, 0, 0, 0];
  for (const r of repos) {
    const d = r.activity.daysSincePush;
    if (d <= 7) bins[0] += 1;
    else if (d <= 30) bins[1] += 1;
    else if (d <= 90) bins[2] += 1;
    else if (d <= 180) bins[3] += 1;
    else if (d <= 365) bins[4] += 1;
    else bins[5] += 1;
  }
  return bins;
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
  // Match the board size so README doesn't "jump"
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="240" role="img" aria-label="Analyzing ${username}" viewBox="0 0 720 240">
  <title>Analyzing ${username}</title>
  <desc>Generating GitHub stats snapshot.</desc>
  <rect x="0" y="0" width="720" height="240" rx="16" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="719" height="239" rx="16" fill="none" stroke="#e5e7eb"/>
  <text x="24" y="52" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="18" font-weight="800" fill="#111827">
    ${username} • Classic Board
  </text>
  <text x="24" y="80" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="12" fill="#6b7280">
    Analyzing repositories… refresh soon.
  </text>
</svg>`;
}

function getStatusCode(err: unknown): number {
  // We sometimes throw `Error` with a `status` property (from GitHub client).
  if (typeof err === "object" && err !== null && "status" in err) {
    const s = (err as any).status;
    if (typeof s === "number") return s;
  }
  return 500;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const params = await ctx.params;
  const ip = getIp(req);
  const rl = await rateLimitIp(ip);

  const rawUsername = params.username;

  if (!rl.ok) {
    return svgResponse(placeholderSvg(rawUsername), {
      status: 429,
      headers: cacheHeaders({ sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }),
    });
  }

  const parsed = usernameSchema.safeParse(rawUsername);
  if (!parsed.success) {
    return svgResponse(placeholderSvg("invalid-user"), { status: 400 });
  }
  const username = parsed.data;

  const url = new URL(req.url);

  // Theme parsing (safe fallback)
  const themeParsed = themeSchema.safeParse(url.searchParams.get("theme") ?? "auto");
  const theme = themeParsed.success ? themeParsed.data : "auto";

  const accentParam = url.searchParams.get("accent") ?? undefined;
  const bgParam = url.searchParams.get("bg") ?? undefined;
  const border = (url.searchParams.get("border") ?? "true") !== "false";

  const accent =
    accentParam && hexColorSchema.safeParse(accentParam).success
      ? `#${accentParam}`
      : "#6366F1";

  const bg =
    bgParam && hexColorSchema.safeParse(bgParam).success
      ? `#${bgParam}`
      : pickTheme(theme) === "dark"
        ? "#0B1220"
        : "#FFFFFF";

  // ---------- Cache hit ----------
  const snap = await loadSnapshot(username);
  if (snap) {
    const activityBins = computeActivityBins(snap.repos);

    const svg = renderClassicBoard({
      username,
      repoCount: snap.repoCount,
      stars: snap.aggregates.starsTotal,
      forks: snap.aggregates.forksTotal,
      maturityScore: snap.unique.maturity.score,
      archivedCount: snap.aggregates.archivedCount,
      forkedCount: snap.aggregates.forkedCount,
      languages: snap.aggregates.languages,
      activityBins,
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

  // ---------- Cache miss ----------
  // Public/free service protection: per-user analyze rate limiting
  const rlUser = await rateLimitAnalyzeUser(username);
  if (!rlUser.ok) {
    return svgResponse(placeholderSvg(username), {
      status: 202,
      headers: cacheHeaders({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 }),
    });
  }

  // Stampede protection
  const locked = await tryAcquireAnalyzeLock(username, 30);
  if (!locked) {
    return svgResponse(placeholderSvg(username), {
      status: 202,
      headers: cacheHeaders({ sMaxAgeSeconds: 10, staleWhileRevalidateSeconds: 120 }),
    });
  }

  try {
    const fresh = await analyzeAndSave(username);
    const activityBins = computeActivityBins(fresh.repos);

    const svg = renderClassicBoard({
      username,
      repoCount: fresh.repoCount,
      stars: fresh.aggregates.starsTotal,
      forks: fresh.aggregates.forksTotal,
      maturityScore: fresh.unique.maturity.score,
      archivedCount: fresh.aggregates.archivedCount,
      forkedCount: fresh.aggregates.forkedCount,
      languages: fresh.aggregates.languages,
      activityBins,
      updatedAt: new Date(fresh.generatedAt).toISOString().slice(0, 10),
      theme: pickTheme(theme),
      accent,
      bg,
      border,
    });

    return svgResponse(svg, {
      status: 200,
      headers: cacheHeaders({ sMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 86400 }),
    });
  } catch (e: unknown) {
    const status = getStatusCode(e) === 404 ? 404 : 500;
    const svg = placeholderSvg(status === 404 ? "user-not-found" : username);
    return svgResponse(svg, {
      status,
      headers: cacheHeaders({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 600 }),
    });
  } finally {
    await releaseAnalyzeLock(username);
  }
}

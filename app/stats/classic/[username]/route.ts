import { usernameSchema, themeSchema, hexColorSchema } from "@/lib/utils/validate";
import { svgResponse, cacheHeaders } from "@/lib/utils/http";
import { rateLimitIp, rateLimitAnalyzeUser } from "@/lib/cache/rateLimit";
import { upgradeSnapshotIfNeeded } from "@/lib/cache/upgradeSnapshot";


import {
  loadSnapshot,
  saveSnapshot,
  tryAcquireAnalyzeLock,
  releaseAnalyzeLock,
  getSnapshotTtlSeconds,
  getVersion,
} from "@/lib/cache/snapshotStore";

import { listUserRepos } from "@/lib/github/client";
import { normalizeRepos } from "@/lib/github/normalize";

import { computeClassicAggregates } from "@/lib/signals/classic";
import { computeMaturity } from "@/lib/signals/maturity";
import { computeEngineering } from "@/lib/signals/engineering";
import { computeCoverage } from "@/lib/signals/coverage";

import { renderClassicBoard } from "@/lib/render/classicBoard";
import type { Snapshot } from "@/lib/github/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "0.0.0.0").trim();
}

function pickTheme(theme: "light" | "dark" | "auto") {
  return theme === "dark" ? "dark" : "light";
}

function computeActivityBins(repos: Snapshot["repos"]) {
  const bins = [0, 0, 0, 0, 0, 0];
  for (const r of repos) {
    const d = r.activity.daysSincePush;
    if (d <= 7) bins[0]++;
    else if (d <= 30) bins[1]++;
    else if (d <= 90) bins[2]++;
    else if (d <= 180) bins[3]++;
    else if (d <= 365) bins[4]++;
    else bins[5]++;
  }
  return bins;
}

/* ---------------- analysis ---------------- */

async function analyzeAndSave(username: string): Promise<Snapshot> {
  const version = getVersion();
  const ttlSeconds = getSnapshotTtlSeconds();
  const generatedAt = new Date().toISOString();

  const { repos: apiRepos, meta } = await listUserRepos(username);
  const repos = normalizeRepos(apiRepos);

  const aggregates = computeClassicAggregates(repos);
  const maturity = computeMaturity(repos);
  const engineering = computeEngineering(repos);
  const coverage = computeCoverage(repos);

  const snapshot: Snapshot = {
    version,
    username,
    generatedAt,
    ttlSeconds,

    repoCount: repos.length,
    repos,

    aggregates,

    unique: {
      maturity,
      engineering,
      coverage,
    },

    debug: {
      githubApiCalls: meta.calls,
      rateLimit: meta.rateLimit,
    },
  };

  await saveSnapshot(username, snapshot);
  return snapshot;
}

/* ---------------- route ---------------- */

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const ip = getIp(req);

  const rl = await rateLimitIp(ip);
  if (!rl.ok) {
    return svgResponse("", { status: 429 });
  }

  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return svgResponse("", { status: 400 });
  }

  const url = new URL(req.url);
  const theme = themeSchema.parse(url.searchParams.get("theme") ?? "auto");

  const accentParam = url.searchParams.get("accent");
  const bgParam = url.searchParams.get("bg");

  const accent =
    accentParam && hexColorSchema.safeParse(accentParam).success
      ? `#${accentParam}`
      : "#22C55E";

  const bg =
    bgParam && hexColorSchema.safeParse(bgParam).success
      ? `#${bgParam}`
      : pickTheme(theme) === "dark"
      ? "#0B1220"
      : "#FFFFFF";

  let snap = await loadSnapshot(username);
  if (snap) {
    snap = upgradeSnapshotIfNeeded(snap);
  }
  
  if (!snap) {
    const lock = await tryAcquireAnalyzeLock(username, 30);
    if (!lock) {
      return svgResponse("", { status: 202 });
    }

    try {
      const userRL = await rateLimitAnalyzeUser(username);
      if (!userRL.ok) {
        return svgResponse("", { status: 429 });
      }
      snap = await analyzeAndSave(username);
    } finally {
      await releaseAnalyzeLock(username);
    }
  }

  const svg = renderClassicBoard({
    username,
    updatedAt: snap.generatedAt.slice(0, 10),
    theme: pickTheme(theme),
    accent,
    bg,
    border: true,

    repoCount: snap.repoCount,
    stars: snap.aggregates.starsTotal,
    forks: snap.aggregates.forksTotal,
    archivedCount: snap.aggregates.archivedCount,
    forkedCount: snap.aggregates.forkedCount,

    maturityScore: snap.unique.maturity.score,
    engineeringScore: snap.unique.engineering.score,

    languages: snap.aggregates.languages,
    activityBins: computeActivityBins(snap.repos),
  });

  return svgResponse(svg, {
    headers: cacheHeaders({
      sMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86400,
    }),
  });
}

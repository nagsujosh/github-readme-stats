import { usernameSchema, themeSchema, hexColorSchema } from "@/lib/utils/validate";
import { svgResponse, cacheHeaders } from "@/lib/utils/http";
import { rateLimitIp } from "@/lib/cache/rateLimit";

import {
  loadSnapshot,
  tryAcquireAnalyzeLock,
  releaseAnalyzeLock,
  saveSnapshot,
  getSnapshotTtlSeconds,
  getVersion,
} from "@/lib/cache/snapshotStore";

import { upgradeSnapshotIfNeeded } from "@/lib/cache/upgradeSnapshot";

import { listUserRepos } from "@/lib/github/client";
import { normalizeRepos } from "@/lib/github/normalize";

import { computeEngineering } from "@/lib/signals/engineering";
import { computeMaturity } from "@/lib/signals/maturity";
import { computeCoverage } from "@/lib/signals/coverage";

import { renderProfileCard } from "@/lib/render/profileCard";
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

/* ---------------- analysis ---------------- */

async function analyzeAndSave(username: string): Promise<Snapshot> {
  const version = getVersion();
  const ttlSeconds = getSnapshotTtlSeconds();
  const generatedAt = new Date().toISOString();

  const { repos: apiRepos, meta } = await listUserRepos(username);
  const repos = normalizeRepos(apiRepos);

  const engineering = computeEngineering(repos);
  const maturity = computeMaturity(repos);
  const coverage = computeCoverage(repos);

  const snapshot: Snapshot = {
    version,
    username,
    generatedAt,
    ttlSeconds,

    repoCount: repos.length,
    repos,

    aggregates: {
      starsTotal: 0,
      forksTotal: 0,
      archivedCount: 0,
      forkedCount: 0,
      languages: [],
    },

    unique: {
      engineering,
      maturity,
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ username: string }> }
) {
  const { username } = await ctx.params;
  const ip = getIp(req);

  /* ---------- rate limit ---------- */
  const rl = await rateLimitIp(ip);
  if (!rl.ok) return svgResponse("", { status: 429 });

  /* ---------- validate ---------- */
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return svgResponse("", { status: 400 });

  const url = new URL(req.url);
  const theme = themeSchema.parse(url.searchParams.get("theme") ?? "auto");

  const accentParam = url.searchParams.get("accent");
  const bgParam = url.searchParams.get("bg");
  const border = url.searchParams.get("border") !== "false";

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

  /* ---------- load snapshot ---------- */
  let snap = await loadSnapshot(username);
  if (snap) {
    snap = upgradeSnapshotIfNeeded(snap);
  }

  /* ---------- analyze if missing ---------- */
  if (!snap) {
    const lock = await tryAcquireAnalyzeLock(username, 30);
    if (!lock) return svgResponse("", { status: 202 });

    try {
      snap = await analyzeAndSave(username);
    } finally {
      await releaseAnalyzeLock(username);
    }
  }

  /* ---------- render ---------- */
  const svg = renderProfileCard({
    username,
    theme: pickTheme(theme),
    accent,
    bg,
    border,

    engineering: snap.unique.engineering,
    maturity: snap.unique.maturity,
    coverage: snap.unique.coverage,
  });

  return svgResponse(svg, {
    headers: cacheHeaders({
      sMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86400,
    }),
  });
}

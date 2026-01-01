import type { Repo, EngineeringReport } from "@/lib/github/types";

const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

function scale01(x: number, a: number, b: number) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

function scaleTo100(x: number, a: number, b: number) {
  return clamp100(Math.round(scale01(x, a, b) * 100));
}

/**
 * Engineering signal (numeric-only, versioned).
 */
export function computeEngineering(repos: Repo[]): EngineeringReport {
  const all = repos;
  const active = repos.filter((r) => !r.isArchived);

  /* ---------- velocity ---------- */
  const pushed30 = active.filter((r) => r.activity.daysSincePush <= 30).length;
  const velocityRatio = pushed30 / Math.max(1, active.length);
  const velocity = scaleTo100(velocityRatio, 0.05, 0.6);

  /* ---------- impact ---------- */
  const stars = active.reduce((s, r) => s + r.stargazersCount, 0);
  const forks = active.reduce((s, r) => s + r.forksCount, 0);
  const weighted = stars + forks * 1.5;
  const impact = scaleTo100(weighted, 20, 2000);

  /* ---------- breadth ---------- */
  const nonFork = active.filter((r) => !r.isFork).length;
  const breadth = scaleTo100(nonFork, 2, 40);

  /* ---------- hygiene ---------- */
  const archivedRatio = all.filter((r) => r.isArchived).length / Math.max(1, all.length);
  const forkRatio = all.filter((r) => r.isFork).length / Math.max(1, all.length);
  const hygiene = clamp100(Math.round((1 - archivedRatio * 0.6 - forkRatio * 0.4) * 100));

  /* ---------- overall ---------- */
  const score = clamp100(
    Math.round(
      velocity * 0.4 +
      impact * 0.25 +
      breadth * 0.15 +
      hygiene * 0.2
    )
  );

  return {
    version: "v1",
    score,
    dimensions: { velocity, impact, breadth, hygiene },
  };
}

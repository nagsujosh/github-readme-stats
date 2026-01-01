import type { Repo, CoverageReport } from "@/lib/github/types";

const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

export function computeCoverage(repos: Repo[]): CoverageReport {
  const total = repos.length;
  if (total === 0) {
    return {
      version: "v1",
      reposSampledPct: 0,
      recentlyActivePct: 0,
    };
  }

  const sampled = repos.filter((r) => r.activity.ageDays > 0).length;
  const active90 = repos.filter((r) => r.activity.daysSincePush <= 90).length;

  return {
    version: "v1",
    reposSampledPct: clamp100(Math.round((sampled / total) * 100)),
    recentlyActivePct: clamp100(Math.round((active90 / total) * 100)),
  };
}

import type { Repo, MaturityReport } from "@/lib/github/types";

const clamp10 = (x: number) => Math.max(0, Math.min(10, x));
const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

const to100 = (x10: number) => clamp100(Math.round(clamp10(x10) * 10));

/**
 * Cheap, metadata-only maturity heuristics (numeric-only).
 */
function scoreDocs10(repos: Repo[]) {
  const sample = repos.slice(0, 20);

  const described = sample.filter(
    (r) => (r.description?.trim()?.length ?? 0) >= 20
  ).length;

  const topical = sample.filter((r) => r.topics.length >= 2).length;
  const wikiOrPages = sample.filter((r) => r.hasWiki || r.hasPages).length;

  let points = 0;
  points += Math.min(5, described / 4);
  points += Math.min(3, topical / 5);
  points += Math.min(2, wikiOrPages / 4);

  return clamp10(Math.round(points * 1.2));
}

function scoreMaintenance10(repos: Repo[]) {
  const sample = repos.filter((r) => !r.isArchived).slice(0, 50);
  if (sample.length === 0) return 0;

  const recent30 = sample.filter((r) => r.activity.daysSincePush <= 30).length;
  const recent90 = sample.filter((r) => r.activity.daysSincePush <= 90).length;

  const ratio30 = recent30 / sample.length;
  const ratio90 = recent90 / sample.length;

  return clamp10(Math.round(ratio30 * 6 + ratio90 * 4));
}

function scoreRepoHygiene10(repos: Repo[]) {
  const sample = repos.slice(0, 50);
  if (sample.length === 0) return 0;

  const forkRatio = sample.filter((r) => r.isFork).length / sample.length;
  const archivedRatio = sample.filter((r) => r.isArchived).length / sample.length;
  const issueSignal =
    sample.filter((r) => r.openIssuesCount > 0).length / sample.length;

  let score = 10;
  score -= forkRatio * 4;
  score -= archivedRatio * 4;
  score += issueSignal * 2;

  return clamp10(Math.round(score));
}

export function computeMaturity(repos: Repo[]): MaturityReport {
  const docs10 = scoreDocs10(repos);
  const maintenance10 = scoreMaintenance10(repos);
  const repoHygiene10 = scoreRepoHygiene10(repos);

  const score10 = clamp10(
    Math.round(docs10 * 0.35 + maintenance10 * 0.45 + repoHygiene10 * 0.2)
  );

  return {
    version: "v1",
    score: to100(score10),
    subscores: {
      docs: to100(docs10),
      maintenance: to100(maintenance10),
      repoHygiene: to100(repoHygiene10),
    },
  };
}

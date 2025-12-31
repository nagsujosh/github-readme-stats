import { Repo, MaturityReport } from "@/lib/github/types";
import { clampInt } from "@/lib/utils/validate";

/**
 * V1 maturity is intentionally heuristic and cheap:
 * - No extra GitHub calls (no contents API)
 * - Uses metadata we already have (pushedAt, hasWiki, hasPages, description, size, etc.)
 *
 * This is an MVP that can evolve later with optional extra calls.
 */

function scoreDocs(repos: Repo[]) {
  // Heuristic: having description + topics indicates some documentation effort.
  // Also: presence of GitHub Pages or Wiki hints at docs.
  let points = 0;
  const sample = repos.slice(0, 20);

  const described = sample.filter((r) => (r.description?.trim()?.length ?? 0) >= 20).length;
  const topical = sample.filter((r) => r.topics.length >= 2).length;
  const wikiOrPages = sample.filter((r) => r.hasWiki || r.hasPages).length;

  points += Math.min(5, described / 4); // up to ~5
  points += Math.min(3, topical / 5); // up to ~3
  points += Math.min(2, wikiOrPages / 4); // up to ~2

  return clampInt(Math.round(points * 1.2), 0, 10);
}

function scoreMaintenance(repos: Repo[]) {
  // Active repos: pushed within 30/90 days
  const sample = repos.filter((r) => !r.isArchived).slice(0, 50);
  if (sample.length === 0) return 0;

  const recent30 = sample.filter((r) => r.activity.daysSincePush <= 30).length;
  const recent90 = sample.filter((r) => r.activity.daysSincePush <= 90).length;

  const ratio30 = recent30 / sample.length;
  const ratio90 = recent90 / sample.length;

  const points = ratio30 * 6 + ratio90 * 4; // max 10
  return clampInt(Math.round(points), 0, 10);
}

function scoreRepoHygiene(repos: Repo[]) {
  // Heuristic: fewer forks/templates, fewer archived in top set, modest issue usage
  const sample = repos.slice(0, 50);
  if (sample.length === 0) return 0;

  const forkRatio = sample.filter((r) => r.isFork).length / sample.length;
  const archivedRatio = sample.filter((r) => r.isArchived).length / sample.length;

  // "Issues enabled" isn't accessible directly here; we approximate with open issues count.
  const hasIssuesSignal = sample.filter((r) => r.openIssuesCount > 0).length / sample.length;

  let score = 10;
  score -= forkRatio * 4; // heavy forks reduce
  score -= archivedRatio * 4;
  score += hasIssuesSignal * 2; // slight positive: people use issues

  return clampInt(Math.round(score), 0, 10);
}

export function computeMaturity(repos: Repo[]): MaturityReport {
  const docs = scoreDocs(repos);
  const maintenance = scoreMaintenance(repos);
  const repoHygiene = scoreRepoHygiene(repos);

  // Weighted overall (V1)
  const score = clampInt(
    Math.round(docs * 0.35 + maintenance * 0.45 + repoHygiene * 0.2),
    0,
    10
  );

  const strengths: string[] = [];
  const gaps: string[] = [];

  const dim = [
    { k: "Documentation", v: docs },
    { k: "Maintenance", v: maintenance },
    { k: "Repo hygiene", v: repoHygiene },
  ].sort((a, b) => b.v - a.v);

  if (dim[0].v >= 7) strengths.push(`${dim[0].k} looks strong`);
  if (dim[1].v >= 7) strengths.push(`${dim[1].k} is solid`);

  const low = [...dim].sort((a, b) => a.v - b.v);
  if (low[0].v <= 4) gaps.push(`Improve ${low[0].k.toLowerCase()}`);
  if (low[1].v <= 4) gaps.push(`Strengthen ${low[1].k.toLowerCase()}`);

  if (strengths.length === 0) strengths.push("Balanced profile (no single dominant dimension)");
  if (gaps.length === 0) gaps.push("Keep shipping and documenting consistently");

  return {
    score,
    subscores: { docs, maintenance, repoHygiene },
    strengths: strengths.slice(0, 2),
    gaps: gaps.slice(0, 2),
  };
}

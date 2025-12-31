import { Repo } from "@/lib/github/types";

export function computeClassicAggregates(repos: Repo[]) {
  const starsTotal = repos.reduce((s, r) => s + r.stargazersCount, 0);
  const forksTotal = repos.reduce((s, r) => s + r.forksCount, 0);
  const archivedCount = repos.filter((r) => r.isArchived).length;
  const forkedCount = repos.filter((r) => r.isFork).length;

  // Language share based on repo counts (cheap & stable).
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }

  const totalLangRepos = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
  const languages = Array.from(counts.entries())
    .map(([name, c]) => ({ name, share: c / totalLangRepos }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 6);

  return { starsTotal, forksTotal, archivedCount, forkedCount, languages };
}

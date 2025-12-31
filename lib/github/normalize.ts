import { GitHubRepoApi, Repo } from "./types";

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function normalizeRepos(apiRepos: GitHubRepoApi[], now = new Date()): Repo[] {
  return apiRepos.map((r) => {
    const createdAt = new Date(r.created_at);
    const pushedAt = new Date(r.pushed_at);

    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      description: r.description ?? undefined,
      isFork: !!r.fork,
      isArchived: !!r.archived,
      isTemplate: !!r.is_template,

      createdAt: r.created_at,
      updatedAt: r.updated_at,
      pushedAt: r.pushed_at,

      language: r.language ?? undefined,
      topics: r.topics ?? [],

      stargazersCount: r.stargazers_count,
      forksCount: r.forks_count,
      openIssuesCount: r.open_issues_count,

      sizeKB: r.size,
      defaultBranch: r.default_branch,

      hasWiki: r.has_wiki,
      hasPages: r.has_pages,

      activity: {
        daysSincePush: daysBetween(pushedAt, now),
        ageDays: daysBetween(createdAt, now),
      },
    };
  });
}

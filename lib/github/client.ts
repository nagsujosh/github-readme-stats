import { GitHubRepoApi } from "./types";

const GH_API = "https://api.github.com";

class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function getToken() {
  return process.env.GITHUB_TOKEN || "";
}

function ghHeaders(extra?: Record<string, string>) {
  const token = getToken();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

export type GitHubCallMeta = {
  calls: number;
  rateLimit?: { remaining: number; resetAt: string };
};

function parseRateLimit(res: Response): GitHubCallMeta["rateLimit"] | undefined {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (!remaining || !reset) return undefined;
  const resetAt = new Date(Number(reset) * 1000).toISOString();
  return { remaining: Number(remaining), resetAt };
}

async function ghFetch<T>(url: string, meta: GitHubCallMeta): Promise<T> {
  meta.calls += 1;

  const res = await fetch(url, {
    headers: ghHeaders(),
    // Vercel fetch caching is separate; we manage our own caching via Redis.
    cache: "no-store",
  });

  meta.rateLimit = parseRateLimit(res) ?? meta.rateLimit;

  if (res.status === 404) {
    throw new GitHubError("GitHub resource not found", 404);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new GitHubError(`GitHub API error ${res.status}: ${txt}`, res.status);
  }

  return (await res.json()) as T;
}

/**
 * List public repos for a user.
 * - Avoids extra calls: single endpoint with pagination (per_page=100)
 * - Sort by pushed to get active repos first
 */
export async function listUserRepos(username: string) {
  const meta: GitHubCallMeta = { calls: 0 };

  const repos: GitHubRepoApi[] = [];
  let page = 1;

  // Cap to prevent pathological cases; most users < 1000 repos.
  const MAX_PAGES = 10; // 1000 repos max

  while (page <= MAX_PAGES) {
    const url =
      `${GH_API}/users/${encodeURIComponent(username)}/repos` +
      `?per_page=100&page=${page}&sort=pushed&direction=desc`;

    const batch = await ghFetch<GitHubRepoApi[]>(url, meta);
    repos.push(...batch);

    if (batch.length < 100) break;
    page += 1;
  }

  return { repos, meta };
}

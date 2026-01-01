/* =========================
   Raw GitHub API Types
========================= */

export type GitHubRepoApi = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;

  fork: boolean;
  archived: boolean;
  is_template: boolean;

  created_at: string;
  updated_at: string;
  pushed_at: string;

  language: string | null;
  topics?: string[];

  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;

  size: number;
  default_branch: string;

  has_wiki: boolean;
  has_pages: boolean;
};

/* =========================
   Normalized Repo Model
========================= */

export type Repo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description?: string;

  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;

  createdAt: string;
  updatedAt: string;
  pushedAt: string;

  language?: string;
  topics: string[];

  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;

  sizeKB: number;
  defaultBranch: string;

  hasWiki: boolean;
  hasPages: boolean;

  activity: {
    daysSincePush: number;
    ageDays: number;
  };
};

/* =========================
   Metric Reports (Versioned)
========================= */

export type EngineeringReport = {
  version: "v1";
  score: number; // 0..100
  dimensions: {
    velocity: number; // 0..100
    impact: number;   // 0..100
    breadth: number;  // 0..100
    hygiene: number;  // 0..100
  };
};

export type MaturityReport = {
  version: "v1";
  score: number; // 0..100
  subscores: {
    docs: number;        // 0..100
    maintenance: number; // 0..100
    repoHygiene: number; // 0..100
  };
};

export type CoverageReport = {
  version: "v1";
  reposSampledPct: number;   // 0..100
  recentlyActivePct: number; // 0..100
};

/* =========================
   Snapshot (Persisted Cache)
========================= */

export type Snapshot = {
  version: string;
  username: string;
  generatedAt: string;
  ttlSeconds: number;

  repoCount: number;
  repos: Repo[];

  aggregates: {
    starsTotal: number;
    forksTotal: number;
    archivedCount: number;
    forkedCount: number;
    languages: Array<{
      name: string;
      share: number; // 0..1
    }>;
  };

  unique: {
    maturity: MaturityReport;
    engineering: EngineeringReport;
    coverage: CoverageReport;
  };

  debug: {
    githubApiCalls: number;
    rateLimit?: {
      remaining: number;
      resetAt: string;
    };
  };
};

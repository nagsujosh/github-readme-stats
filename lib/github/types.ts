export type GitHubRepoApi = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    fork: boolean;
    archived: boolean;
    is_template?: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    language: string | null;
    topics?: string[];
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    size: number; // KB
    default_branch: string;
    has_wiki: boolean;
    has_pages: boolean;
  };
  
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
  
  export type MaturityReport = {
    score: number; // 0..10
    subscores: {
      docs: number; // 0..10
      maintenance: number;
      repoHygiene: number;
    };
    strengths: string[];
    gaps: string[];
  };
  
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
      languages: Array<{ name: string; share: number }>;
    };
  
    unique: {
      maturity: MaturityReport;
    };
  
    debug: {
      githubApiCalls: number;
      rateLimit?: { remaining: number; resetAt: string };
    };
  };
  
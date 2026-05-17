export type RepoInfo = {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  stars: number;
  forks: number;
  defaultBranch: string;
  openIssuesCount: number;
  createdAt: number;
  pushedAt: number;
  language: string | null;
  topics: string[];
};

export type Contributor = {
  login: string;
  id: number;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
  isBot: boolean;
};

export type PullRequestRef = {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  author: string | null;
  reviewers: string[];
  mergedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CommitRef = {
  sha: string;
  message: string;
  author: string | null;
  authorDate: number;
  coAuthors: string[];
};

export type GraphNode = {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  commits: number;
  prsAuthored: number;
  prsReviewed: number;
  lastActiveAt: number;
  isBot: boolean;
  clusterId?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
  coAuthorCount: number;
  reviewCount: number;
};

export type Cluster = {
  id: string;
  color: string;
  memberCount: number;
  rank: number;
};

export type Insights = {
  topPair: { a: string; b: string; weight: number } | null;
  busFactor: { count: number; topContributorShare: number; topContributors: string[] };
  driftedContributors: string[];
  activeThisWeek: string[];
  mostActiveCluster: { color: string; count: number } | null;
  narrative: string;
};

export type ShipgraphDataset = {
  repo: RepoInfo;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Cluster[];
  personCluster: Record<string, string>;
  insights: Insights;
  generatedAt: number;
  totals: {
    contributors: number;
    commits: number;
    pullRequests: number;
    coAuthorPairs: number;
    reviewPairs: number;
  };
};

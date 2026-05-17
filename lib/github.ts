import type { CommitRef, Contributor, PullRequestRef, RepoInfo } from "./types";

const BASE = "https://api.github.com";

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "shipgraph",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function ghJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    next: { revalidate: 60 * 10 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GhError(`GitHub API ${res.status} for ${path}: ${body.slice(0, 200)}`, res.status);
  }
  return res.json() as Promise<T>;
}

export class GhError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RawRepo = {
  full_name: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  open_issues_count: number;
  created_at: string;
  pushed_at: string;
  language: string | null;
  topics?: string[];
  owner: { login: string };
  name: string;
};

export async function getRepo(owner: string, repo: string): Promise<RepoInfo> {
  const r = await ghJson<RawRepo>(`/repos/${owner}/${repo}`);
  return {
    owner: r.owner.login,
    repo: r.name,
    fullName: r.full_name,
    description: r.description,
    homepage: r.homepage,
    stars: r.stargazers_count,
    forks: r.forks_count,
    defaultBranch: r.default_branch,
    openIssuesCount: r.open_issues_count,
    createdAt: Date.parse(r.created_at),
    pushedAt: Date.parse(r.pushed_at),
    language: r.language,
    topics: r.topics ?? [],
  };
}

type RawContributor = {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
};

export async function getContributors(
  owner: string,
  repo: string,
  perPage = 100,
): Promise<Contributor[]> {
  const list = await ghJson<RawContributor[]>(
    `/repos/${owner}/${repo}/contributors?per_page=${perPage}&anon=false`,
  );
  return list.map((c) => ({
    login: c.login,
    id: c.id,
    avatarUrl: c.avatar_url,
    htmlUrl: c.html_url,
    contributions: c.contributions,
    isBot: c.type === "Bot" || c.login.endsWith("[bot]"),
  }));
}

type RawCommit = {
  sha: string;
  commit: {
    author: { name: string; email: string; date: string } | null;
    message: string;
  };
  author: { login: string } | null;
};

const COAUTHOR_RE = /Co-authored-by:\s*([^<]+)\s*<([^>]+)>/gi;

export async function getRecentCommits(
  owner: string,
  repo: string,
  perPage = 100,
  maxPages = 2,
): Promise<CommitRef[]> {
  const all: CommitRef[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const list = await ghJson<RawCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
    );
    if (list.length === 0) break;
    for (const c of list) {
      const coAuthors: string[] = [];
      const message = c.commit.message ?? "";
      let m;
      while ((m = COAUTHOR_RE.exec(message)) !== null) {
        coAuthors.push(m[1].trim());
      }
      all.push({
        sha: c.sha,
        message: message.split("\n")[0].slice(0, 140),
        author: c.author?.login ?? null,
        authorDate: c.commit.author ? Date.parse(c.commit.author.date) : 0,
        coAuthors,
      });
    }
    if (list.length < perPage) break;
  }
  return all;
}

type RawPull = {
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
  requested_reviewers: { login: string }[];
  assignees: { login: string }[];
};

export async function getPulls(
  owner: string,
  repo: string,
  perPage = 100,
  maxPages = 2,
): Promise<PullRequestRef[]> {
  const all: PullRequestRef[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const list = await ghJson<RawPull[]>(
      `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
    );
    if (list.length === 0) break;
    for (const p of list) {
      const reviewers = [
        ...new Set([
          ...p.requested_reviewers.map((r) => r.login),
          ...p.assignees.map((a) => a.login),
        ]),
      ].filter((login) => login !== p.user?.login);
      all.push({
        number: p.number,
        title: p.title,
        state: p.state,
        merged: !!p.merged_at,
        author: p.user?.login ?? null,
        reviewers,
        mergedAt: p.merged_at ? Date.parse(p.merged_at) : null,
        createdAt: Date.parse(p.created_at),
        updatedAt: Date.parse(p.updated_at),
      });
    }
    if (list.length < perPage) break;
  }
  return all;
}

type RawReview = { user: { login: string } | null; submitted_at: string | null };

export async function getReviewersForPRs(
  owner: string,
  repo: string,
  prNumbers: number[],
): Promise<Map<number, string[]>> {
  // Limit concurrency to avoid hammering API
  const result = new Map<number, string[]>();
  const CHUNK = 8;
  for (let i = 0; i < prNumbers.length; i += CHUNK) {
    const chunk = prNumbers.slice(i, i + CHUNK);
    const responses = await Promise.allSettled(
      chunk.map((n) =>
        ghJson<RawReview[]>(`/repos/${owner}/${repo}/pulls/${n}/reviews?per_page=100`),
      ),
    );
    chunk.forEach((n, idx) => {
      const r = responses[idx];
      if (r.status === "fulfilled") {
        const logins = [
          ...new Set(r.value.map((x) => x.user?.login).filter(Boolean) as string[]),
        ];
        result.set(n, logins);
      } else {
        result.set(n, []);
      }
    });
  }
  return result;
}

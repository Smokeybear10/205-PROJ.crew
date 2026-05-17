import { getContributors, getPulls, getRecentCommits, getRepo } from "./github";
import { computeInsights } from "./insights";
import { assignClusters } from "./clusters";
import type {
  Contributor,
  GraphEdge,
  GraphNode,
  PullRequestRef,
  ShipgraphDataset,
} from "./types";

const cache = new Map<string, { data: ShipgraphDataset; at: number }>();
const TTL_MS = 15 * 60 * 1000;

export async function getDataset(
  owner: string,
  repo: string,
  opts: { refresh?: boolean } = {},
): Promise<ShipgraphDataset> {
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  if (!opts.refresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  }
  const data = await buildDataset(owner, repo);
  cache.set(key, { data, at: Date.now() });
  return data;
}

async function buildDataset(owner: string, repo: string): Promise<ShipgraphDataset> {
  const [repoInfo, contributors, commits, pulls] = await Promise.all([
    getRepo(owner, repo),
    getContributors(owner, repo, 100),
    getRecentCommits(owner, repo, 100, 2),
    getPulls(owner, repo, 100, 2),
  ]);

  const realContribs = contributors.filter((c) => !c.isBot);
  const nodes = buildNodes(realContribs, pulls);
  const edges = buildEdges(nodes, commits, pulls);
  const { clusters, personCluster } = assignClusters(nodes, edges);
  const insights = computeInsights({ repo: repoInfo, nodes, edges });

  return {
    repo: repoInfo,
    nodes,
    edges,
    clusters,
    personCluster,
    insights,
    generatedAt: Date.now(),
    totals: {
      contributors: nodes.length,
      commits: commits.length,
      pullRequests: pulls.length,
      coAuthorPairs: edges.filter((e) => e.coAuthorCount > 0).length,
      reviewPairs: edges.filter((e) => e.reviewCount > 0).length,
    },
  };
}

function buildNodes(contributors: Contributor[], pulls: PullRequestRef[]): GraphNode[] {
  const byLogin = new Map<string, GraphNode>();
  for (const c of contributors) {
    byLogin.set(c.login, {
      id: c.login,
      login: c.login,
      name: c.login,
      avatarUrl: c.avatarUrl,
      htmlUrl: c.htmlUrl,
      commits: c.contributions,
      prsAuthored: 0,
      prsReviewed: 0,
      lastActiveAt: 0,
      isBot: c.isBot,
    });
  }

  for (const p of pulls) {
    if (p.author) {
      const node = byLogin.get(p.author);
      if (node) {
        node.prsAuthored += 1;
        node.lastActiveAt = Math.max(node.lastActiveAt, p.updatedAt);
      }
    }
    for (const r of p.reviewers) {
      const node = byLogin.get(r);
      if (node) {
        node.prsReviewed += 1;
        node.lastActiveAt = Math.max(node.lastActiveAt, p.updatedAt);
      }
    }
  }

  return [...byLogin.values()].sort((a, b) => b.commits - a.commits);
}

function buildEdges(
  nodes: GraphNode[],
  commits: { author: string | null; coAuthors: string[]; authorDate: number }[],
  pulls: PullRequestRef[],
): GraphEdge[] {
  const validLogins = new Set(nodes.map((n) => n.login));
  const map = new Map<string, GraphEdge>();
  const ensure = (a: string, b: string): GraphEdge => {
    const [s, t] = [a, b].sort();
    const key = `${s}::${t}`;
    let e = map.get(key);
    if (!e) {
      e = { source: s, target: t, weight: 0, coAuthorCount: 0, reviewCount: 0 };
      map.set(key, e);
    }
    return e;
  };

  // Co-author edges from commits
  for (const c of commits) {
    if (!c.author || !validLogins.has(c.author)) continue;
    const others = new Set<string>();
    for (const ca of c.coAuthors) {
      // ca is a name string from the commit trailer; try to match a known contributor by name fragment
      const match = nodes.find(
        (n) =>
          n.login.toLowerCase() === ca.toLowerCase() ||
          n.name.toLowerCase() === ca.toLowerCase(),
      );
      if (match) others.add(match.login);
    }
    for (const o of others) {
      if (o === c.author) continue;
      const e = ensure(c.author, o);
      e.weight += 2;
      e.coAuthorCount += 1;
    }
    // Bump last active for the author from this commit
    const authorNode = nodes.find((n) => n.login === c.author);
    if (authorNode) authorNode.lastActiveAt = Math.max(authorNode.lastActiveAt, c.authorDate);
  }

  // Review edges from PRs
  for (const p of pulls) {
    if (!p.author || !validLogins.has(p.author)) continue;
    for (const r of p.reviewers) {
      if (!validLogins.has(r) || r === p.author) continue;
      const e = ensure(p.author, r);
      e.weight += 1;
      e.reviewCount += 1;
    }
  }

  return [...map.values()];
}

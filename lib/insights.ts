import type { GraphEdge, GraphNode, Insights, RepoInfo } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export function computeInsights({
  repo,
  nodes,
  edges,
}: {
  repo: RepoInfo;
  nodes: GraphNode[];
  edges: GraphEdge[];
}): Insights {
  const now = Date.now();
  const sortedByCommits = [...nodes].sort((a, b) => b.commits - a.commits);
  const totalCommits = nodes.reduce((s, n) => s + n.commits, 0);

  // Top pair: strongest edge
  let topPair: Insights["topPair"] = null;
  let topWeight = -1;
  for (const e of edges) {
    if (e.weight > topWeight) {
      topWeight = e.weight;
      topPair = { a: e.source, b: e.target, weight: e.weight };
    }
  }

  // Bus factor — how many people contribute > 50% of commits
  let cumulative = 0;
  let busFactorCount = 0;
  const topContributors: string[] = [];
  for (const n of sortedByCommits) {
    cumulative += n.commits;
    busFactorCount += 1;
    topContributors.push(n.login);
    if (cumulative >= totalCommits * 0.5) break;
  }
  const topContributorShare = totalCommits > 0 ? sortedByCommits[0]?.commits / totalCommits : 0;

  // Drift detection: people who used to contribute but haven't been active in 90 days
  const drifted = nodes
    .filter(
      (n) =>
        n.commits >= 5 &&
        n.lastActiveAt > 0 &&
        now - n.lastActiveAt > 90 * DAY &&
        now - n.lastActiveAt < 365 * 2 * DAY,
    )
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10)
    .map((n) => n.login);

  // Active this week
  const activeWeek = nodes
    .filter((n) => n.lastActiveAt > 0 && now - n.lastActiveAt < 7 * DAY)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, 10)
    .map((n) => n.login);

  // Build narrative
  const narrative = buildNarrative({
    repo,
    nodes,
    sortedByCommits,
    topPair,
    busFactorCount,
    topContributorShare,
    drifted,
    activeWeek,
  });

  return {
    topPair,
    busFactor: {
      count: busFactorCount,
      topContributorShare,
      topContributors,
    },
    driftedContributors: drifted,
    activeThisWeek: activeWeek,
    mostActiveCluster: null,
    narrative,
  };
}

function buildNarrative({
  repo,
  nodes,
  sortedByCommits,
  topPair,
  busFactorCount,
  topContributorShare,
  drifted,
  activeWeek,
}: {
  repo: RepoInfo;
  nodes: GraphNode[];
  sortedByCommits: GraphNode[];
  topPair: Insights["topPair"];
  busFactorCount: number;
  topContributorShare: number;
  drifted: string[];
  activeWeek: string[];
}): string {
  const lines: string[] = [];

  const total = nodes.length;
  if (total === 0) return `${repo.fullName} has no contributors visible in the recent window.`;

  const headliner =
    total === 1
      ? `${sortedByCommits[0].login} is the sole contributor`
      : `${sortedByCommits[0].login} leads with ${sortedByCommits[0].commits.toLocaleString()} commits`;
  lines.push(`${total} contributors. ${headliner}.`);

  if (busFactorCount === 1) {
    lines.push(
      `Bus factor ${busFactorCount} — one person is responsible for ${Math.round(topContributorShare * 100)}% of all commits.`,
    );
  } else if (busFactorCount <= 3) {
    lines.push(
      `Bus factor ${busFactorCount} — three people or fewer cover the majority of work. Concentration risk.`,
    );
  } else {
    lines.push(`Bus factor ${busFactorCount} — work is reasonably spread.`);
  }

  if (topPair) {
    lines.push(
      `${topPair.a} and ${topPair.b} pair the most — ${topPair.weight} shared signals (co-commits + reviews).`,
    );
  }

  if (activeWeek.length > 0) {
    const list = activeWeek.slice(0, 4).join(", ");
    lines.push(
      `Active this week: ${list}${activeWeek.length > 4 ? `, +${activeWeek.length - 4} more` : ""}.`,
    );
  }

  if (drifted.length > 0) {
    lines.push(
      `${drifted.length} contributor${drifted.length === 1 ? " has" : "s have"} drifted (silent 90+ days but used to ship).`,
    );
  }

  return lines.join(" ");
}

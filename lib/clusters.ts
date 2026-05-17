import type { Cluster, GraphEdge, GraphNode } from "./types";

const PALETTE = [
  "#00ff9b",
  "#22d3ee",
  "#fbbf24",
  "#ff3d8a",
  "#818cf8",
  "#fb7185",
  "#a78bfa",
  "#facc15",
];

const UNCLUSTERED_COLOR = "#3a3e47";
const UNCLUSTERED_ID = "__solo__";

/**
 * Greedy modularity-style clustering:
 *   1. Sort nodes by degree (most connected first)
 *   2. Each top hub seeds a cluster; pull in their strongest neighbors
 *   3. Stop when we hit the palette size; rest become "solo / other"
 *
 * For typical OSS repos (5-100 contributors) this produces visibly meaningful
 * groupings without the complexity of full Louvain.
 */
export function assignClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { clusters: Cluster[]; personCluster: Record<string, string> } {
  const adjacency = new Map<string, Map<string, number>>();
  for (const n of nodes) adjacency.set(n.id, new Map());
  for (const e of edges) {
    adjacency.get(e.source)?.set(e.target, e.weight);
    adjacency.get(e.target)?.set(e.source, e.weight);
  }

  const degree = new Map<string, number>();
  for (const [id, neighbors] of adjacency.entries()) {
    let d = 0;
    for (const w of neighbors.values()) d += w;
    degree.set(id, d);
  }

  // Sort nodes by total edge weight (most central first)
  const sortedByDegree = [...nodes]
    .map((n) => ({ n, d: degree.get(n.id) ?? 0 }))
    .sort((a, b) => b.d - a.d);

  const assignment = new Map<string, string>();
  const seeds: GraphNode[] = [];

  // Pick seeds: top nodes with edges, that don't already share many neighbors with existing seeds
  for (const { n, d } of sortedByDegree) {
    if (seeds.length >= PALETTE.length) break;
    if (d <= 0) continue;
    const myNeighbors = adjacency.get(n.id) ?? new Map();
    let overlapsExisting = false;
    for (const seed of seeds) {
      const seedNeighbors = adjacency.get(seed.id) ?? new Map();
      let shared = 0;
      for (const k of myNeighbors.keys()) if (seedNeighbors.has(k)) shared += 1;
      // If this node is a neighbor of an existing seed (or strongly overlaps), skip — it'll be assigned to that seed
      if (seedNeighbors.has(n.id) || shared >= Math.min(3, myNeighbors.size * 0.6)) {
        overlapsExisting = true;
        break;
      }
    }
    if (!overlapsExisting) {
      seeds.push(n);
      assignment.set(n.id, n.id);
    }
  }

  // Assign remaining nodes to the seed they have the strongest edge to
  for (const node of nodes) {
    if (assignment.has(node.id)) continue;
    let bestSeed: string | null = null;
    let bestWeight = -1;
    for (const seed of seeds) {
      const w = adjacency.get(node.id)?.get(seed.id) ?? 0;
      // Also look at transitive: weight to the seed's existing cluster
      const transitiveMembers = [...assignment.entries()]
        .filter(([, sid]) => sid === seed.id)
        .map(([id]) => id);
      let transitive = 0;
      for (const tm of transitiveMembers) {
        transitive += adjacency.get(node.id)?.get(tm) ?? 0;
      }
      const total = w * 2 + transitive;
      if (total > bestWeight) {
        bestWeight = total;
        bestSeed = seed.id;
      }
    }
    if (bestSeed && bestWeight > 0) {
      assignment.set(node.id, bestSeed);
    } else {
      assignment.set(node.id, UNCLUSTERED_ID);
    }
  }

  // Count cluster sizes
  const sizes = new Map<string, number>();
  for (const cid of assignment.values()) {
    sizes.set(cid, (sizes.get(cid) ?? 0) + 1);
  }

  // Order clusters by size (excluding solo)
  const orderedSeeds = seeds
    .map((s) => ({ id: s.id, size: sizes.get(s.id) ?? 0 }))
    .sort((a, b) => b.size - a.size)
    .filter((s) => s.size > 0);

  const clusters: Cluster[] = orderedSeeds.map((s, idx) => ({
    id: s.id,
    color: PALETTE[idx % PALETTE.length],
    memberCount: s.size,
    rank: idx,
  }));

  if (sizes.has(UNCLUSTERED_ID) && (sizes.get(UNCLUSTERED_ID) ?? 0) > 0) {
    clusters.push({
      id: UNCLUSTERED_ID,
      color: UNCLUSTERED_COLOR,
      memberCount: sizes.get(UNCLUSTERED_ID) ?? 0,
      rank: clusters.length,
    });
  }

  const personCluster: Record<string, string> = {};
  for (const [pid, cid] of assignment.entries()) personCluster[pid] = cid;

  return { clusters, personCluster };
}

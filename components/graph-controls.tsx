"use client";

import { useState } from "react";
import { GraphCanvas } from "./graph-canvas";
import type { Cluster, GraphEdge, GraphNode } from "@/lib/types";

const PRESETS = [
  { label: "all-time", days: 365 * 20 },
  { label: "1y", days: 365 },
  { label: "90d", days: 90 },
  { label: "30d", days: 30 },
];

export function GraphView({
  nodes,
  edges,
  clusters,
  personCluster,
  generatedAt,
  org,
  repo,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Cluster[];
  personCluster: Record<string, string>;
  generatedAt: number;
  org: string;
  repo: string;
}) {
  const [days, setDays] = useState(PRESETS[0].days);

  return (
    <div className="relative w-full h-full graph-frame">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        clusters={clusters}
        personCluster={personCluster}
        generatedAt={generatedAt}
        org={org}
        repo={repo}
        driftCutoffDays={days}
      />

      {/* Top-right control: drift filter */}
      <div className="absolute top-3 right-3 border border-border bg-bg/85 backdrop-blur px-3 py-2 font-mono text-[10px] z-10">
        <div className="text-text-dim uppercase tracking-wider mb-1.5">active within</div>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              className={`px-2 py-0.5 transition-colors ${
                days === p.days
                  ? "text-accent border border-accent/50"
                  : "text-text-muted border border-border hover:text-text"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-left: cluster legend */}
      {clusters.length > 1 && (
        <div className="absolute bottom-3 left-3 border border-border bg-bg/85 backdrop-blur px-3 py-2 font-mono text-[10px] max-w-[280px] z-10">
          <div className="text-text-dim uppercase tracking-wider mb-1.5">clusters</div>
          <ul className="space-y-1">
            {clusters.slice(0, 7).map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: c.color }}
                />
                <span className="text-text truncate flex-1">
                  {c.id === "__solo__" ? "solo / other" : `@${c.id}`}
                </span>
                <span className="text-text-dim tabular-nums">{c.memberCount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

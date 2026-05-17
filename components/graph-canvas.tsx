"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Cluster, GraphEdge, GraphNode } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const DAY = 24 * 60 * 60 * 1000;

type Node = GraphNode & {
  val: number;
  color: string;
  daysSince: number;
  isRecent: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type Link = {
  source: string | Node;
  target: string | Node;
  weight: number;
  sourceColor?: string;
  targetColor?: string;
};

function alpha(hex: string, a: number): string {
  if (hex.length !== 7 || hex[0] !== "#") return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function shade(hex: string, amount: number): string {
  if (hex.length !== 7 || hex[0] !== "#") return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))));
  const h2 = (c: number) => c.toString(16).padStart(2, "0");
  return `#${h2(adj(r))}${h2(adj(g))}${h2(adj(b))}`;
}

// Module-level image cache so navigating away and back doesn't redownload
const avatarCache = new Map<string, HTMLImageElement | "loading" | "failed">();

function loadAvatar(url: string, onReady: () => void): HTMLImageElement | null {
  const cached = avatarCache.get(url);
  if (cached === "loading") return null;
  if (cached === "failed") return null;
  if (cached) return cached;
  avatarCache.set(url, "loading");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.src = `${url}&s=80`;
  img.onload = () => {
    avatarCache.set(url, img);
    onReady();
  };
  img.onerror = () => {
    avatarCache.set(url, "failed");
  };
  return null;
}

export function GraphCanvas({
  nodes: nodesIn,
  edges,
  clusters,
  personCluster,
  generatedAt,
  org,
  repo,
  driftCutoffDays,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Cluster[];
  personCluster: Record<string, string>;
  generatedAt: number;
  org: string;
  repo: string;
  driftCutoffDays?: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{
    zoomToFit: (ms?: number, padding?: number) => void;
  } | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clusterColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clusters) m.set(c.id, c.color);
    return m;
  }, [clusters]);

  const cutoffDays = driftCutoffDays ?? 365 * 10;

  const { nodes, links, neighborMap, avatarNodeIds } = useMemo(() => {
    const filtered = nodesIn.filter((n) => {
      if (!n.lastActiveAt) return cutoffDays > 365 * 5;
      const days = Math.floor((generatedAt - n.lastActiveAt) / DAY);
      return days <= cutoffDays;
    });
    const validIds = new Set(filtered.map((n) => n.id));

    const nodes: Node[] = filtered.map((n) => {
      const daysSince = n.lastActiveAt
        ? Math.floor((generatedAt - n.lastActiveAt) / DAY)
        : 9999;
      const clusterId = personCluster[n.id] ?? "__solo__";
      const baseColor = clusterColorMap.get(clusterId) ?? "#3a3e47";
      const color = daysSince > 180 ? alpha(baseColor, 0.55) : baseColor;
      return {
        ...n,
        val: Math.max(2, Math.log10(n.commits + 1) * 5 + Math.log10(n.prsAuthored + n.prsReviewed + 1) * 1.5),
        color,
        daysSince,
        isRecent: daysSince < 14,
      };
    });

    const links: Link[] = edges
      .filter((e) => validIds.has(e.source) && validIds.has(e.target))
      .map((e) => {
        const sourceColor = clusterColorMap.get(personCluster[e.source] ?? "") ?? "#3a3e47";
        const targetColor = clusterColorMap.get(personCluster[e.target] ?? "") ?? "#3a3e47";
        return { source: e.source, target: e.target, weight: e.weight, sourceColor, targetColor };
      });

    const neighborMap = new Map<string, Set<string>>();
    for (const n of nodes) neighborMap.set(n.id, new Set([n.id]));
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      neighborMap.get(s)?.add(t);
      neighborMap.get(t)?.add(s);
    }

    // Top 20 by commits get avatars rendered inside
    const avatarNodeIds = new Set(
      [...nodes]
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 20)
        .map((n) => n.id),
    );

    return { nodes, links, neighborMap, avatarNodeIds };
  }, [nodesIn, edges, generatedAt, cutoffDays, clusterColorMap, personCluster]);

  const isDimmed = (nodeId: string): boolean => {
    if (!hoveredId) return false;
    const neighbors = neighborMap.get(hoveredId);
    return !neighbors?.has(nodeId);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative dot-field">
      <ForceGraph2D
        ref={fgRef as never}
        graphData={{ nodes, links } as never}
        width={dims.width}
        height={dims.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={3}
        nodeVal={((n: Node) => n.val) as never}
        nodeLabel={
          ((n: Node) => {
            const ago = n.daysSince === 9999 ? "no activity" : n.daysSince === 0 ? "today" : `${n.daysSince}d ago`;
            return `${n.login} · ${n.commits} commits · ${ago}`;
          }) as never
        }
        nodeCanvasObject={
          ((node: Node, ctx: CanvasRenderingContext2D, globalScale: number) => {
            if (node.x === undefined || node.y === undefined) return;
            const isHovered = hoveredId === node.id;
            const dimmed = isDimmed(node.id);
            const r = Math.sqrt(node.val) * 3 + 1;

            // Recent-contributor glow
            if (node.isRecent && !dimmed) {
              const glowR = r + 10;
              const grad = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, glowR);
              grad.addColorStop(0, alpha(node.color, 0.45));
              grad.addColorStop(1, alpha(node.color, 0));
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
              ctx.fill();
            }

            // Try to render avatar for top nodes
            const showAvatar = avatarNodeIds.has(node.id) && r >= 8 && !dimmed && globalScale > 0.4;
            const avatarImg = showAvatar ? loadAvatar(node.avatarUrl, () => setTick((t) => t + 1)) : null;

            if (avatarImg) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.clip();
              try {
                ctx.drawImage(avatarImg, node.x - r, node.y - r, r * 2, r * 2);
              } catch {
                // fall back to color fill
                ctx.fillStyle = node.color;
                ctx.fillRect(node.x - r, node.y - r, r * 2, r * 2);
              }
              ctx.restore();

              // Cluster-colored ring around avatar
              ctx.lineWidth = 2;
              ctx.strokeStyle = isHovered ? "#ffffff" : node.color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              // Gradient fill
              const fillGrad = ctx.createLinearGradient(node.x, node.y - r, node.x, node.y + r);
              fillGrad.addColorStop(0, dimmed ? node.color : shade(node.color, 0.18));
              fillGrad.addColorStop(1, dimmed ? node.color : shade(node.color, -0.18));
              ctx.fillStyle = fillGrad;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.fill();

              // Outline
              if (isHovered) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
              } else if (!dimmed) {
                ctx.lineWidth = 0.6;
                ctx.strokeStyle = alpha("#000000", 0.4);
                ctx.stroke();
              }
            }

            // Labels at moderate zoom OR on hover OR for biggest nodes
            const showLabel =
              !dimmed && (isHovered || globalScale > 1.6 || (globalScale > 1.0 && node.val > 12));
            if (showLabel) {
              const fontSize = Math.max(10, 11 / globalScale);
              ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              const metrics = ctx.measureText(node.login);
              const padX = 4;
              const padY = 1.5;
              const y = node.y + r + 4;
              ctx.fillStyle = "rgba(8,9,11,0.85)";
              ctx.fillRect(
                node.x - metrics.width / 2 - padX,
                y - padY,
                metrics.width + padX * 2,
                fontSize + padY * 2,
              );
              ctx.fillStyle = isHovered ? "#ffffff" : "#ecedefcc";
              ctx.fillText(node.login, node.x, y);
            }
          }) as never
        }
        linkCurvature={0.18 as never}
        linkCanvasObject={
          ((link: Link, ctx: CanvasRenderingContext2D) => {
            const s = typeof link.source === "string" ? null : (link.source as Node);
            const t = typeof link.target === "string" ? null : (link.target as Node);
            if (!s || !t) return;
            if (s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined)
              return;

            const isActive = hoveredId === s.id || hoveredId === t.id;
            const isDim = hoveredId && !isActive;
            const baseAlpha = isActive ? 0.7 : isDim ? 0.05 : 0.2;

            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;
            const curvature = 0.18;
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            const offset = curvature * dist;
            const nx = -dy / dist;
            const ny = dx / dist;
            const cx = midX + nx * offset;
            const cy = midY + ny * offset;

            const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
            grad.addColorStop(0, alpha(link.sourceColor ?? "#888", baseAlpha));
            grad.addColorStop(1, alpha(link.targetColor ?? "#888", baseAlpha));

            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.quadraticCurveTo(cx, cy, t.x, t.y);
            ctx.strokeStyle = grad;
            const widthBase = Math.min(2.5, Math.log2(link.weight + 1) * 0.7);
            ctx.lineWidth = isActive ? widthBase + 1.2 : widthBase;
            ctx.stroke();
          }) as never
        }
        cooldownTicks={180}
        d3VelocityDecay={0.32}
        d3AlphaDecay={0.022}
        onNodeHover={
          ((node: Node | null) => {
            setHoveredId(node?.id ?? null);
            if (containerRef.current) {
              containerRef.current.style.cursor = node ? "pointer" : "default";
            }
          }) as never
        }
        onNodeClick={
          ((node: Node) => {
            router.push(`/g/${org}/${repo}/p/${node.login}`);
          }) as never
        }
        onNodeDragEnd={
          ((node: Node) => {
            node.fx = node.x;
            node.fy = node.y;
          }) as never
        }
        onEngineStop={
          (() => {
            fgRef.current?.zoomToFit(500, 60);
          }) as never
        }
        enableNodeDrag={true}
      />
    </div>
  );
}

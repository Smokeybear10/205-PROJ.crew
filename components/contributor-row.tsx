import Link from "next/link";
import Image from "next/image";
import type { GraphNode } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

function relativeDays(ts: number, now: number): string {
  if (!ts) return "—";
  const days = Math.floor((now - ts) / DAY);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function activityDot(ts: number, now: number): string {
  if (!ts) return "bg-text-dim";
  const days = Math.floor((now - ts) / DAY);
  if (days < 7) return "bg-accent";
  if (days < 30) return "bg-amber";
  if (days < 90) return "bg-rose";
  return "bg-text-dim";
}

export function ContributorRow({
  node,
  now,
  org,
  repo,
  rank,
}: {
  node: GraphNode;
  now: number;
  org: string;
  repo: string;
  rank?: number;
}) {
  return (
    <Link
      href={`/g/${org}/${repo}/p/${node.login}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors border-b border-border last:border-b-0 group"
    >
      {typeof rank === "number" && (
        <span className="font-mono text-[11px] text-text-dim w-5 text-right tnum">
          {rank}
        </span>
      )}
      <Image
        src={`${node.avatarUrl}&s=48`}
        alt={node.login}
        width={28}
        height={28}
        className="rounded-full bg-surface-2 shrink-0"
        unoptimized
      />
      <span className={`size-1.5 rounded-full shrink-0 ${activityDot(node.lastActiveAt, now)}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-text group-hover:text-text-strong transition-colors">
          {node.login}
        </div>
        <div className="font-mono text-[10px] text-text-dim truncate">
          {node.commits.toLocaleString()} commits · {node.prsAuthored} PRs · {node.prsReviewed} reviews
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[11px] text-text-muted tnum">
          {relativeDays(node.lastActiveAt, now)}
        </div>
      </div>
    </Link>
  );
}

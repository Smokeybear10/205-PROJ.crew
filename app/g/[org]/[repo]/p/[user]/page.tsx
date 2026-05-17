import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset } from "@/lib/graph";
import { GhError } from "@/lib/github";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAY = 24 * 60 * 60 * 1000;

function relativeDays(ts: number, now: number): string {
  if (!ts) return "no recent activity";
  const days = Math.floor((now - ts) / DAY);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default async function ContributorPage({
  params,
}: {
  params: Promise<{ org: string; repo: string; user: string }>;
}) {
  const { org, repo, user } = await params;

  let data;
  try {
    data = await getDataset(org, repo);
  } catch (err) {
    if (err instanceof GhError && err.status === 404) notFound();
    throw err;
  }

  const node = data.nodes.find((n) => n.login.toLowerCase() === user.toLowerCase());
  if (!node) notFound();

  const now = data.generatedAt;
  const collaborators = data.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = data.nodes.find((n) => n.id === otherId);
      return other ? { node: other, edge: e } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.edge.weight - a!.edge.weight)
    .slice(0, 10);

  const clusterId = data.personCluster[node.id];
  const cluster = data.clusters.find((c) => c.id === clusterId);
  const clusterPeers = data.nodes
    .filter((n) => data.personCluster[n.id] === clusterId && n.id !== node.id)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 8);

  const totalCommits = data.nodes.reduce((s, n) => s + n.commits, 0);
  const sharePct = totalCommits > 0 ? (node.commits / totalCommits) * 100 : 0;
  const rank =
    [...data.nodes].sort((a, b) => b.commits - a.commits).findIndex((n) => n.id === node.id) + 1;

  return (
    <div className="mx-auto max-w-3xl w-full px-6 py-8 space-y-10 fade-in">
      <Link
        href={`/g/${org}/${repo}`}
        className="font-mono text-[11px] text-text-muted hover:text-text-strong transition-colors inline-block"
      >
        ← back to {org}/{repo}
      </Link>

      <header className="flex items-start gap-5 flex-wrap">
        <Image
          src={`${node.avatarUrl}&s=200`}
          alt={node.login}
          width={96}
          height={96}
          className="rounded-full bg-surface-2 shrink-0 ring-1 ring-border-strong"
          unoptimized
        />
        <div className="flex-1 min-w-[260px]">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-1">
            contributor #{rank}
          </div>
          <h1 className="display text-3xl md:text-4xl text-text-strong leading-none">
            @{node.login}
          </h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <a
              href={node.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-text-muted hover:text-text transition-colors"
            >
              github profile ↗
            </a>
            <a
              href={`https://github.com/${org}/${repo}/commits?author=${node.login}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-text-muted hover:text-text transition-colors"
            >
              commits in this repo ↗
            </a>
            {cluster && cluster.id !== "__solo__" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: cluster.color }} />
                <span className="font-mono text-[11px] text-text-muted">
                  in cluster of {cluster.memberCount}
                </span>
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="commits" value={node.commits.toLocaleString()} tone="text-accent" />
        <Stat
          label="share of work"
          value={`${sharePct.toFixed(1)}%`}
          tone={sharePct > 30 ? "text-amber" : undefined}
        />
        <Stat label="PRs authored" value={node.prsAuthored.toLocaleString()} />
        <Stat label="PRs reviewed" value={node.prsReviewed.toLocaleString()} />
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-muted mb-3">
          last active
        </h2>
        <div className="border border-border bg-surface p-4">
          <div className="text-base text-text-strong">{relativeDays(node.lastActiveAt, now)}</div>
          {node.lastActiveAt > 0 && (
            <div className="font-mono text-[11px] text-text-dim mt-1">
              {new Date(node.lastActiveAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </section>

      {collaborators.length > 0 && (
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-muted mb-3">
            top collaborators
          </h2>
          <ul className="border border-border bg-surface">
            {collaborators.map((c) => (
              <li key={c!.node.id}>
                <Link
                  href={`/g/${org}/${repo}/p/${c!.node.login}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
                >
                  <Image
                    src={`${c!.node.avatarUrl}&s=48`}
                    alt={c!.node.login}
                    width={28}
                    height={28}
                    className="rounded-full bg-surface-2 shrink-0"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c!.node.login}</div>
                    <div className="font-mono text-[10px] text-text-dim">
                      {c!.edge.coAuthorCount} co-commits · {c!.edge.reviewCount} review interactions
                    </div>
                  </div>
                  <span className="font-mono text-xs text-accent tnum">
                    {c!.edge.weight}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {clusterPeers.length > 0 && (
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-muted mb-3">
            others in this cluster
          </h2>
          <div className="flex flex-wrap gap-2">
            {clusterPeers.map((p) => (
              <Link
                key={p.id}
                href={`/g/${org}/${repo}/p/${p.login}`}
                className="flex items-center gap-2 border border-border bg-surface pl-1 pr-3 py-1 hover:border-border-strong hover:bg-surface-2 transition-colors group"
              >
                <Image
                  src={`${p.avatarUrl}&s=44`}
                  alt={p.login}
                  width={22}
                  height={22}
                  className="rounded-full bg-surface-2"
                  unoptimized
                />
                <span className="text-xs group-hover:text-text-strong transition-colors">
                  {p.login}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border border-border bg-surface p-3">
      <div className={`text-lg font-semibold tnum ${tone ?? "text-text-strong"}`}>{value}</div>
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mt-0.5">
        {label}
      </div>
    </div>
  );
}

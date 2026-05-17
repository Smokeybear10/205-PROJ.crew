import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContributorRow } from "@/components/contributor-row";
import { GraphView } from "@/components/graph-controls";
import { getDataset } from "@/lib/graph";
import { GhError } from "@/lib/github";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAY = 24 * 60 * 60 * 1000;

export default async function RepoGraphPage({
  params,
}: {
  params: Promise<{ org: string; repo: string }>;
}) {
  const { org, repo } = await params;

  return (
    <div className="flex-1 flex flex-col">
      <Suspense fallback={<LoadingShell org={org} repo={repo} />}>
        <GraphPage org={org} repo={repo} />
      </Suspense>
    </div>
  );
}

async function GraphPage({ org, repo }: { org: string; repo: string }) {
  let data;
  try {
    data = await getDataset(org, repo);
  } catch (err) {
    if (err instanceof GhError && err.status === 404) notFound();
    return <ErrorShell org={org} repo={repo} message={err instanceof Error ? err.message : String(err)} />;
  }

  const now = data.generatedAt;
  const top = data.nodes.slice(0, 50);
  const activeWeek = data.nodes.filter((n) => n.lastActiveAt && now - n.lastActiveAt < 7 * DAY).length;
  const totalCommits = data.nodes.reduce((s, n) => s + n.commits, 0);

  return (
    <>
      {/* Hero header */}
      <section className="mx-auto max-w-7xl w-full px-6 pt-8 pb-4 fade-in">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
          <div className="min-w-0">
            <Link
              href="/"
              className="font-mono text-[11px] text-text-dim hover:text-text-muted transition-colors inline-block mb-2"
            >
              ← all
            </Link>
            <div className="flex items-baseline gap-2 flex-wrap">
              <a
                href={`https://github.com/${data.repo.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-text-muted hover:text-text transition-colors"
              >
                github.com/
              </a>
              <h1 className="display text-2xl md:text-3xl text-text-strong tracking-tight">
                {data.repo.fullName}
              </h1>
            </div>
            {data.repo.description && (
              <p className="text-sm text-text-muted mt-2 max-w-2xl leading-relaxed">
                {data.repo.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 font-mono text-[11px] text-text-dim">
              {data.repo.language && <span className="text-text-muted">{data.repo.language}</span>}
              <span>★ {data.repo.stars.toLocaleString()}</span>
              <span>⑂ {data.repo.forks.toLocaleString()}</span>
              {data.repo.topics.slice(0, 3).map((t) => (
                <span key={t} className="border border-border px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-5 items-end shrink-0">
            <BigStat value={data.nodes.length} label="contributors" />
            <BigStat value={totalCommits} label="commits" tone="text-accent" />
            <BigStat value={data.totals.pullRequests} label="PRs" />
            <BigStat value={activeWeek} label="active 7d" tone={activeWeek > 0 ? "text-accent" : "text-text-dim"} />
          </div>
        </div>

        {/* Narrative panel */}
        <div className="border border-border bg-surface p-4 flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <span className="size-2 rounded-full bg-accent pulse-ring" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
              read
            </span>
          </div>
          <p className="text-sm text-text leading-relaxed flex-1 min-w-[260px]">
            {data.insights.narrative}
          </p>
        </div>
      </section>

      {/* Main grid: graph + sidebar */}
      <section className="mx-auto max-w-7xl w-full px-6 pb-8 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 min-h-[700px]">
        <div className="border border-border bg-surface min-h-[560px] lg:min-h-0">
          <GraphView
            nodes={data.nodes}
            edges={data.edges}
            clusters={data.clusters}
            personCluster={data.personCluster}
            generatedAt={now}
            org={org}
            repo={repo}
          />
        </div>
        <aside className="border border-border bg-surface flex flex-col max-h-[820px]">
          <div className="px-4 py-3 border-b border-border flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-text-strong">top contributors</h2>
            <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
              by commits
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {top.map((n, i) => (
              <ContributorRow
                key={n.id}
                node={n}
                now={now}
                org={org}
                repo={repo}
                rank={i + 1}
              />
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function BigStat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className="text-right">
      <div className={`text-2xl md:text-3xl font-semibold tnum ${tone ?? "text-text-strong"}`}>
        {value.toLocaleString()}
      </div>
      <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mt-0.5">
        {label}
      </div>
    </div>
  );
}

function LoadingShell({ org, repo }: { org: string; repo: string }) {
  return (
    <div className="mx-auto max-w-7xl w-full px-6 pt-12 fade-in">
      <div className="font-mono text-[11px] text-text-dim mb-3">loading…</div>
      <div className="font-mono text-2xl text-text-muted mb-8">
        github.com/<span className="text-text">{org}/{repo}</span>
      </div>
      <div className="space-y-3">
        <div className="h-24 shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="h-[560px] shimmer" />
          <div className="h-[560px] shimmer" />
        </div>
      </div>
      <div className="font-mono text-[11px] text-text-dim mt-6">
        fetching contributors · recent commits · pull requests…
      </div>
    </div>
  );
}

function ErrorShell({ org, repo, message }: { org: string; repo: string; message: string }) {
  return (
    <div className="mx-auto max-w-2xl w-full px-6 pt-16 fade-in">
      <Link
        href="/"
        className="font-mono text-[11px] text-text-dim hover:text-text-muted transition-colors inline-block mb-4"
      >
        ← back
      </Link>
      <h1 className="display text-3xl text-text-strong mb-2">couldn&apos;t load that repo.</h1>
      <p className="text-sm text-text-muted mb-6">
        <span className="font-mono">{org}/{repo}</span> — either it doesn&apos;t exist, isn&apos;t public, or GitHub rate-limited us.
      </p>
      <div className="border border-pink/30 bg-pink/[0.04] p-4 font-mono text-[11px] text-text-muted">
        {message}
      </div>
    </div>
  );
}

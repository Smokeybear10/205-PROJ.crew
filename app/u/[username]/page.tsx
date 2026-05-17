import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser, getUserRepos, GhError, type GhUser, type GhUserRepo } from "@/lib/github";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function relativeDays(ts: number, now: number): string {
  if (!ts) return "—";
  const days = Math.floor((now - ts) / DAY);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div className="flex-1 flex flex-col">
      <Suspense fallback={<UserShell username={username} />}>
        <UserContent username={username} />
      </Suspense>
    </div>
  );
}

async function UserContent({ username }: { username: string }) {
  let user: GhUser;
  let repos: GhUserRepo[];
  try {
    [user, repos] = await Promise.all([getUser(username), getUserRepos(username, { maxPages: 2 })]);
  } catch (err) {
    if (err instanceof GhError && err.status === 404) notFound();
    throw err;
  }

  const now = Date.now();
  const liveRepos = repos.filter((r) => !r.archived);
  const activeWeek = liveRepos.filter((r) => now - r.pushedAt < 7 * DAY).length;
  const activeMonth = liveRepos.filter((r) => now - r.pushedAt < 30 * DAY).length;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl w-full px-6 pt-10 pb-6 fade-in">
        <Link
          href="/"
          className="font-mono text-[11px] text-text-dim hover:text-text-muted transition-colors inline-block mb-4"
        >
          ← home
        </Link>

        <div className="flex items-start gap-5 flex-wrap mb-8">
          <Image
            src={`${user.avatarUrl}&s=200`}
            alt={user.login}
            width={96}
            height={96}
            className="rounded-full bg-surface-2 shrink-0 ring-1 ring-border-strong"
            unoptimized
          />
          <div className="flex-1 min-w-[260px]">
            <div className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-1">
              {user.type === "Organization" ? "organization" : "user"}
            </div>
            <h1 className="display text-3xl md:text-4xl text-text-strong leading-none">
              {user.name ? user.name : `@${user.login}`}
            </h1>
            {user.name && (
              <div className="font-mono text-sm text-text-muted mt-1">@{user.login}</div>
            )}
            {user.bio && (
              <p className="text-sm text-text-muted mt-3 max-w-xl leading-relaxed">{user.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-3 font-mono text-[11px] text-text-dim flex-wrap">
              {user.company && <span>🏢 {user.company}</span>}
              {user.location && <span>📍 {user.location}</span>}
              {user.blog && (
                <a
                  href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-muted hover:text-text transition-colors"
                >
                  {user.blog.replace(/^https?:\/\//, "")} ↗
                </a>
              )}
              <a
                href={user.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-muted hover:text-text transition-colors"
              >
                github profile ↗
              </a>
            </div>
          </div>

          <div className="flex gap-5 items-end shrink-0">
            <BigStat value={user.publicRepos} label="public repos" />
            <BigStat
              value={activeWeek}
              label="active 7d"
              tone={activeWeek > 0 ? "text-accent" : "text-text-dim"}
            />
            <BigStat value={user.followers} label="followers" />
          </div>
        </div>

        <div className="border border-border bg-surface px-4 py-2.5 flex items-center gap-3 text-xs flex-wrap">
          <span className="font-mono text-[11px] uppercase tracking-widest text-text-dim">
            tip
          </span>
          <span className="text-text-muted">
            click any repo to see its contributor graph
          </span>
          <span className="ml-auto font-mono text-[11px] text-text-dim">
            showing {liveRepos.length} repos · {activeMonth} active this month
          </span>
        </div>
      </section>

      {/* Repos grid */}
      <section className="mx-auto max-w-6xl w-full px-6 pb-12">
        {liveRepos.length === 0 ? (
          <div className="border border-border bg-surface p-10 text-center text-sm text-text-muted">
            no public repos yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveRepos.map((r) => (
              <RepoCard key={r.fullName} repo={r} owner={user.login} now={now} />
            ))}
          </div>
        )}

        {repos.some((r) => r.archived) && (
          <details className="mt-10">
            <summary className="font-mono text-xs text-text-dim cursor-pointer hover:text-text-muted transition-colors">
              + {repos.filter((r) => r.archived).length} archived repos
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 opacity-60">
              {repos
                .filter((r) => r.archived)
                .map((r) => (
                  <RepoCard key={r.fullName} repo={r} owner={user.login} now={now} />
                ))}
            </div>
          </details>
        )}
      </section>
    </>
  );
}

function RepoCard({
  repo,
  owner,
  now,
}: {
  repo: GhUserRepo;
  owner: string;
  now: number;
}) {
  const isRecent = now - repo.pushedAt < 7 * DAY;
  return (
    <Link
      href={`/g/${owner}/${repo.name}`}
      className="group block border border-border bg-surface hover:bg-surface-2 hover:border-border-strong transition-all p-4 relative overflow-hidden"
    >
      {isRecent && (
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-accent" aria-hidden />
      )}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm text-text-strong font-medium tracking-tight truncate group-hover:text-accent transition-colors">
          {repo.name}
        </span>
        {repo.fork && (
          <span className="font-mono text-[10px] text-text-dim">fork</span>
        )}
      </div>
      <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-3 min-h-[2.5em]">
        {repo.description ?? <span className="text-text-dim italic">no description</span>}
      </p>
      <div className="flex items-center gap-3 font-mono text-[11px] text-text-dim">
        {repo.language && <span className="text-text-muted">{repo.language}</span>}
        {repo.stars > 0 && <span>★ {repo.stars.toLocaleString()}</span>}
        <span className="ml-auto">{relativeDays(repo.pushedAt, now)}</span>
      </div>
    </Link>
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

function UserShell({ username }: { username: string }) {
  return (
    <div className="mx-auto max-w-6xl w-full px-6 pt-12 fade-in">
      <div className="font-mono text-[11px] text-text-dim mb-3">loading…</div>
      <div className="font-mono text-2xl text-text-muted mb-8">
        github.com/<span className="text-text">{username}</span>
      </div>
      <div className="h-32 shimmer mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 shimmer" />
        ))}
      </div>
    </div>
  );
}

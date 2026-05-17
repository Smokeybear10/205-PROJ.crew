export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-6 py-12 space-y-10 fade-in">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-text-dim mb-2">
          what is shipgraph
        </div>
        <h1 className="display text-4xl md:text-5xl text-text-strong">
          your team, but <span className="text-accent">visible.</span>
        </h1>
      </header>

      <section className="prose-spacing">
        <p className="text-base text-text leading-relaxed">
          Every dev tool shows you tasks: tickets, PRs, commits, sprints. Almost none of them
          show you the <strong className="text-text-strong">people</strong> and how they
          actually work together. shipgraph reads any GitHub repo and renders its contributors as
          a force-directed social graph — clumped by who pairs with whom, sized by output, colored
          by recency.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-text-strong mb-3">how it&apos;s built</h2>
        <ul className="text-sm text-text-muted space-y-2 list-disc pl-5 leading-relaxed">
          <li>
            <span className="text-text">Nodes</span> are contributors. Size = total commits.
            Color = the cluster (sub-team) we infer from collaboration patterns.
          </li>
          <li>
            <span className="text-text">Edges</span> connect two people if they&apos;ve
            co-authored a commit (via the <code className="font-mono text-xs bg-surface px-1">Co-authored-by</code> trailer)
            or one has reviewed the other&apos;s PR. Edge weight = how often they collaborate.
          </li>
          <li>
            <span className="text-text">Clusters</span> are computed via a greedy modularity
            algorithm — seed hubs become anchor points, everyone else gets pulled toward the
            cluster they have the strongest collaboration with.
          </li>
          <li>
            <span className="text-text">Recency</span> dims contributors whose last activity was
            over 6 months ago. Recent contributors get a glowing halo.
          </li>
          <li>
            Bots (anything ending in <code className="font-mono text-xs bg-surface px-1">[bot]</code>) are filtered out so the graph reflects humans.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-text-strong mb-3">privacy</h2>
        <ul className="text-sm text-text-muted space-y-2 list-disc pl-5 leading-relaxed">
          <li>Only reads <span className="text-text">public</span> GitHub data via the official API.</li>
          <li>No login. No tracking. No analytics beyond Vercel&apos;s default request logs.</li>
          <li>
            Server caches each repo&apos;s graph for 15 minutes — refreshing the page within the window
            is instant.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-text-strong mb-3">what&apos;s next</h2>
        <ul className="text-sm text-text-muted space-y-2 list-disc pl-5 leading-relaxed">
          <li>GitHub OAuth so you can see your private repos and org-wide rollups.</li>
          <li>Time travel — scrub through history, watch the graph grow.</li>
          <li>Side-by-side compare — &quot;this week vs. last week&quot;.</li>
          <li>Multi-repo view — paste an org or your portfolio.</li>
          <li>Embed snippets — drop a live mini-graph in any README.</li>
        </ul>
      </section>

      <footer className="pt-6 border-t border-border">
        <p className="text-xs text-text-dim">
          built by <a className="hover:text-text-muted transition-colors" href="https://thomasou.com" target="_blank" rel="noreferrer">thomas ou</a> · source on <a className="hover:text-text-muted transition-colors" href="https://github.com/Smokeybear10/shipgraph" target="_blank" rel="noreferrer">github</a>
        </p>
      </footer>
    </div>
  );
}

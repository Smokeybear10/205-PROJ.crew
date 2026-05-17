import { DemoTiles } from "@/components/demo-tiles";
import { PasteInput } from "@/components/paste-input";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="relative mx-auto max-w-4xl w-full px-6 pt-20 md:pt-28 pb-10 fade-in">
        {/* Eyebrow */}
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim mb-5">
          <span className="text-accent">●</span> live · no signup · no setup
        </div>

        {/* Hero */}
        <h1 className="display display-xl text-text-strong mb-5">
          see your team&apos;s
          <br />
          <span className="text-accent">actual shape.</span>
        </h1>

        <p className="text-base md:text-lg text-text-muted max-w-xl leading-relaxed mb-9">
          Paste any GitHub repo. We render the contributors as a force-directed graph — who&apos;s pairing, who&apos;s siloed, who&apos;s been carrying.
        </p>

        <PasteInput autofocus />

        <div className="font-mono text-[11px] text-text-dim mt-3">
          tip: <span className="text-text-muted">vercel/next.js</span>, or paste a github.com URL
        </div>
      </section>

      <section className="mx-auto max-w-4xl w-full px-6 py-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            or try a demo
          </h2>
          <span className="font-mono text-[10px] text-text-dim">click any · no signup</span>
        </div>
        <DemoTiles />
      </section>

      <section className="mx-auto max-w-4xl w-full px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Feature
          accent="var(--accent)"
          title="who pairs with whom"
          body="Edges connect contributors who co-author commits or review each other's PRs. The graph clumps naturally into the team's actual sub-teams."
        />
        <Feature
          accent="var(--amber)"
          title="who's been carrying"
          body="Node size = commits. Color = recency. Big bright nodes are the workhorses. Big dim nodes are the people who used to carry — now drifted."
        />
        <Feature
          accent="var(--pink)"
          title="bus factor at a glance"
          body="The summary above the graph tells you how many people cover 50% of commits, who's drifted, and who's been pairing the most this cycle."
        />
      </section>

      <section className="mx-auto max-w-4xl w-full px-6 py-12">
        <div className="border border-border bg-surface p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-text-strong mb-3">
            why open another tab?
          </h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
            Linear, Asana, Jira show you tasks. GitHub Projects shows you tickets. shipgraph shows
            you <span className="text-text">people</span> — and how they actually work together,
            inferred from what they already commit and review. Skip the standup. Open one URL.
          </p>
        </div>
      </section>
    </div>
  );
}

function Feature({
  accent,
  title,
  body,
}: {
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-border bg-surface p-5 relative overflow-hidden">
      <span
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <h3 className="text-sm font-medium text-text-strong mb-2 tracking-tight">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{body}</p>
    </div>
  );
}

import Link from "next/link";

type Demo = {
  org: string;
  repo: string;
  label: string;
  hint: string;
  scale: "tiny" | "small" | "medium" | "large";
  accent: string;
};

const DEMOS: Demo[] = [
  {
    org: "rogerSuperBuilderAlpha",
    repo: "cursor-boston",
    label: "cursor boston cohort",
    hint: "the hackathon repo itself — see who's actually shipping",
    scale: "medium",
    accent: "var(--accent)",
  },
  {
    org: "anthropics",
    repo: "claude-code",
    label: "anthropics/claude-code",
    hint: "Claude Code's growing contributor mesh",
    scale: "medium",
    accent: "var(--cyan)",
  },
  {
    org: "vercel",
    repo: "next.js",
    label: "vercel/next.js",
    hint: "what scale looks like — hundreds of contributors",
    scale: "large",
    accent: "var(--amber)",
  },
  {
    org: "Smokeybear10",
    repo: "knowngraph",
    label: "Smokeybear10/knowngraph",
    hint: "solo project — what a one-person graph looks like",
    scale: "tiny",
    accent: "var(--pink)",
  },
];

const SCALE_LABEL: Record<Demo["scale"], string> = {
  tiny: "solo",
  small: "small team",
  medium: "mid-size",
  large: "huge",
};

export function DemoTiles() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {DEMOS.map((d) => (
        <Link
          key={`${d.org}/${d.repo}`}
          href={`/g/${d.org}/${d.repo}`}
          className="group border border-border bg-surface hover:bg-surface-2 hover:border-border-strong transition-all p-4 relative overflow-hidden"
        >
          <div
            className="absolute right-0 top-0 size-16 opacity-[0.07] group-hover:opacity-[0.13] transition-opacity"
            style={{
              background: `radial-gradient(circle at top right, ${d.accent}, transparent 70%)`,
            }}
          />
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-mono text-[11px] text-text-dim uppercase tracking-wider">
              {SCALE_LABEL[d.scale]}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: d.accent }}
            >
              →
            </span>
          </div>
          <div className="text-base text-text font-medium tracking-tight mb-1 group-hover:text-text-strong transition-colors">
            {d.label}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">{d.hint}</p>
        </Link>
      ))}
    </div>
  );
}

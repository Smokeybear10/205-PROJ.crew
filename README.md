# crew | see your team's actual shape

**Live: [crewmesh.vercel.app](https://crewmesh.vercel.app)**

Paste any GitHub repo. We render its contributors as a force-directed graph — who's pairing, who's siloed, who's been carrying. No signup, no setup, no extra tab.

Every dev tool shows you tasks: tickets, PRs, commits, sprints. Almost none show you the *people* and how they actually work together. crew infers that from what teams already do — co-authored commits and PR reviews — and renders it visually.

## Quick Start

```bash
git clone https://github.com/Smokeybear10/205-PROJ.crew
cd 205-PROJ.crew
bun install
bun run dev
```

Open http://localhost:3000

Optional: set `GITHUB_TOKEN` in `.env.local` to bump the GitHub API rate limit from 60/hr to 5,000/hr.

## What It Does

**Paste any GitHub repo** — `org/repo` or a github.com URL. The graph renders in a few seconds.

**Force-directed contributor view** — nodes are people, sized by commit count, colored by inferred sub-team cluster. Recent contributors glow; drifted ones fade.

**Edges = collaborations** — two contributors are connected if they've co-authored a commit (via the `Co-authored-by` trailer) or one has reviewed the other's PR. Heavier edges = more shared work.

**Cluster detection** — a greedy modularity algorithm seeds hubs and pulls everyone else toward their strongest collaboration cluster. The graph naturally clumps into sub-teams.

**Narrative summary** — one-paragraph auto-generated read: top contributor, bus factor, top pair, who's active this week, who's drifted.

**Contributor detail** — click any node to see their stats, top collaborators, cluster peers, and a link to their commits in the repo.

## Tech Stack

| Layer    | Tools                                                |
|----------|------------------------------------------------------|
| Framework | Next.js 16 App Router                                |
| UI       | React 19, Tailwind v4, Geist Sans/Mono              |
| Graph    | react-force-graph-2d (canvas, custom node rendering) |
| Data     | GitHub REST API (server-side, 15-min in-memory cache) |
| Hosting  | Vercel                                               |

## Project Structure

```
app/
  page.tsx                          # landing — paste input + demo tiles
  g/[org]/[repo]/page.tsx           # graph view for any repo
  g/[org]/[repo]/p/[user]/page.tsx  # contributor detail
  about/page.tsx
components/
  graph-canvas.tsx     # client — force-directed canvas with avatars + clusters
  graph-controls.tsx   # filter buttons + cluster legend
  paste-input.tsx      # URL parser + submit
  demo-tiles.tsx       # quick-pick demo repos
  contributor-row.tsx
  logo-mark.tsx
lib/
  github.ts            # GitHub REST client (repos, contributors, commits, PRs, reviews)
  graph.ts             # builds nodes + edges from raw GitHub data
  clusters.ts          # greedy clustering algorithm
  insights.ts          # bus factor, top pair, drift, narrative
  types.ts
```

## How the Graph Is Built

For a given `org/repo`, crew fetches in parallel:

1. **Repo metadata** — name, stars, language, topics.
2. **Top 100 contributors** — login, avatar, total commit count. Bots filtered (`[bot]` suffix or type `Bot`).
3. **Recent 200 commits** — author + `Co-authored-by` trailers from commit messages.
4. **Recent 200 PRs** — author + requested reviewers + assignees.

Then it computes:

- **Nodes** — one per non-bot contributor, sized by `log10(commits + 1) * 5`, colored by cluster.
- **Edges** — for each co-author pair, add weight 2 (commits show real pairing). For each PR-author/reviewer pair, add weight 1.
- **Clusters** — greedy seed selection: take the highest-degree node, assign it as a cluster seed, then pull all its neighbors. Skip nodes that already strongly overlap with existing seeds. 8 colors max; everyone else becomes "solo / other".
- **Insights** — bus factor (people covering 50% of commits), top collaborating pair (strongest edge), drift (contributors silent 90+ days who used to ship), narrative prose summary.

## Privacy

- Only reads **public** GitHub data via the official API.
- No login. No tracking.
- Server caches each repo for 15 minutes — repeat visits are instant.

## Demos

Try these from the landing page:

- **rogerSuperBuilderAlpha/cursor-boston** — the cohort repo itself
- **anthropics/claude-code** — Claude Code's growing contributor mesh
- **vercel/next.js** — what scale looks like
- **Smokeybear10/shipped** — solo project, single contributor

---

Built by Thomas Ou

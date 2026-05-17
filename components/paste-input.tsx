"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Strip anything that prefixes the actual `org/repo` or `user`:
 *   - protocol (http://, https://)
 *   - host (github.com, www.github.com)
 *   - trailing slashes / dotgit / tree+branch / blob+sha paths
 *
 * Called both on every keystroke (so paste auto-cleans) and on submit.
 */
function cleanInput(raw: string): string {
  let v = raw.trim();
  v = v.replace(/^https?:\/\//i, "");
  v = v.replace(/^(www\.)?github\.com\/?/i, "");
  v = v.replace(/^github\.com$/i, "");
  v = v.replace(/\.git$/i, "");
  return v;
}

type Parsed =
  | { kind: "repo"; owner: string; repo: string }
  | { kind: "user"; username: string }
  | null;

function parseInput(raw: string): Parsed {
  const cleaned = cleanInput(raw);
  if (!cleaned) return null;
  const parts = cleaned.split(/[/\s?#]/).filter(Boolean);
  if (parts.length === 0) return null;

  const owner = parts[0].replace(/[^A-Za-z0-9_.-]/g, "");
  if (!owner) return null;

  if (parts.length === 1) {
    return { kind: "user", username: owner };
  }
  const repo = parts[1].replace(/[^A-Za-z0-9_.-]/g, "").replace(/\.git$/, "");
  if (!repo) return { kind: "user", username: owner };
  return { kind: "repo", owner, repo };
}

export function PasteInput({ autofocus = false }: { autofocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = parseInput(value);
  const buttonLabel =
    isPending
      ? "loading…"
      : parsed?.kind === "user"
        ? "see all repos →"
        : "see graph →";

  const submit = () => {
    const p = parseInput(value);
    if (!p) {
      setError("paste a repo (org/repo) or just a username");
      return;
    }
    setError(null);
    startTransition(() => {
      if (p.kind === "user") {
        router.push(`/u/${p.username}`);
      } else {
        router.push(`/g/${p.owner}/${p.repo}`);
      }
    });
  };

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex items-stretch border border-border-strong bg-surface focus-within:border-accent transition-colors"
      >
        <span className="flex items-center pl-4 pr-2 font-mono text-text-dim text-sm select-none">
          github.com/
        </span>
        <input
          autoFocus={autofocus}
          value={value}
          onChange={(e) => {
            const cleaned = cleanInput(e.target.value);
            setValue(cleaned);
            if (error) setError(null);
          }}
          placeholder="org/repo  or  username"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-text placeholder:text-text-dim py-3.5 pr-2 outline-none text-base"
        />
        <button
          type="submit"
          disabled={isPending || !value}
          className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm whitespace-nowrap"
        >
          {buttonLabel}
        </button>
      </form>
      {error && <div className="font-mono text-xs text-pink mt-2">{error}</div>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function parseRepoInput(raw: string): { owner: string; repo: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept: org/repo, https://github.com/org/repo, github.com/org/repo, org/repo/anything
  const url = trimmed.replace(/^https?:\/\//, "").replace(/^github\.com\//, "");
  const parts = url.split(/[/\s]/).filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0].replace(/[^A-Za-z0-9_.-]/g, "");
  const repo = parts[1].replace(/[^A-Za-z0-9_.-]/g, "").replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function PasteInput({ autofocus = false }: { autofocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const parsed = parseRepoInput(value);
    if (!parsed) {
      setError("paste a repo like vercel/next.js or a github.com url");
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/g/${parsed.owner}/${parsed.repo}`);
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
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="org/repo"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-text placeholder:text-text-dim py-3.5 pr-2 outline-none text-base"
        />
        <button
          type="submit"
          disabled={isPending || !value}
          className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
        >
          {isPending ? "loading…" : "see graph →"}
        </button>
      </form>
      {error && (
        <div className="font-mono text-xs text-pink mt-2">{error}</div>
      )}
    </div>
  );
}

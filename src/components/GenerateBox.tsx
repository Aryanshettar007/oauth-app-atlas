"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function GenerateBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="search-bar flex flex-col sm:flex-row sm:items-center gap-2 p-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length > 1) router.push(`/generate?q=${encodeURIComponent(q.trim())}`);
        else input.current?.focus();
      }}
    >
      <label htmlFor="app-input" className="sr-only">App name or website</label>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="hidden sm:block shrink-0 ml-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="app-input"
        ref={input}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Any app or website, e.g. Salesforce or https://attio.com"
        className="flex-1 min-w-0 bg-transparent px-3 sm:px-1 py-2.5 text-base text-ink placeholder:text-muted outline-none"
      />
      <button type="submit" className="btn-primary px-5 py-2.5 whitespace-nowrap">
        Research this app
      </button>
    </form>
  );
}

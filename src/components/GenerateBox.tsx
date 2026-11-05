"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length > 1) router.push(`/generate?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor="app-input" className="sr-only">App name or website</label>
      <input
        id="app-input"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Any app or website, e.g. Salesforce or https://attio.com"
        className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-4 py-3 text-base outline-none focus:border-ink"
      />
      <button type="submit" className="btn-primary px-5 py-3 disabled:opacity-50" disabled={q.trim().length < 2}>
        Research this app
      </button>
    </form>
  );
}

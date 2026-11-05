"use client";
import { useState } from "react";

export function ShareBar({ slug }: { slug: string }) {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2000);
  };
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash("Copy failed; select the text manually");
    }
  };
  const btn = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => copy(window.location.href, "Link copied")}>Copy link</button>
      <button
        className={btn}
        onClick={async () => {
          const md = await fetch(`/apps/${slug}/markdown`).then((r) => r.text());
          copy(md, "Markdown copied");
        }}
      >
        Copy as Markdown
      </button>
      <a className={btn} href={`/api/guides/${slug}`} target="_blank" rel="noreferrer">JSON</a>
      <span className="text-sm text-muted" role="status" aria-live="polite">{msg}</span>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComposioToolkit } from "@/lib/composio";
import type { Difficulty } from "@/lib/schema";
import type { GuideSummary } from "@/lib/store";
import { ComposioAuthChip, DifficultyBadge, ToolkitLogo } from "./ui";

type Row = { slug: string; name: string; category: string; logo: string; managed: boolean | null; rank: number; guide?: GuideSummary };
type Filter = "all" | "ready" | "byo" | "managed" | Difficulty;

export function Library({ toolkits, guides }: { toolkits: ComposioToolkit[]; guides: GuideSummary[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows: Row[] = useMemo(() => {
    const bySlug = new Map(guides.map((g) => [g.slug, g]));
    const used = new Set<string>();
    const fromToolkits: Row[] = toolkits.map((t) => {
      const g = bySlug.get(t.slug);
      if (g) used.add(g.slug);
      return { slug: t.slug, name: t.name, category: t.categories[0] ?? "", logo: t.logo, managed: t.managedOAuth, rank: t.popularityRank, guide: g };
    });
    const extra: Row[] = guides
      .filter((g) => !used.has(g.slug))
      .map((g) => ({ slug: g.slug, name: g.appName, category: g.category, logo: g.logo ?? "", managed: g.managed ?? null, rank: 9999, guide: g }));
    return [...fromToolkits, ...extra].sort((a, b) => Number(!!b.guide) - Number(!!a.guide) || a.rank - b.rank);
  }, [toolkits, guides]);

  const shown = rows.filter((r) => {
    const t = q.toLowerCase();
    if (t && !`${r.name} ${r.category} ${r.slug}`.toLowerCase().includes(t)) return false;
    if (filter === "ready") return !!r.guide;
    if (filter === "byo") return r.managed === false;
    if (filter === "managed") return r.managed === true;
    if (filter !== "all") return r.guide?.difficulty === filter;
    return true;
  });

  const count = (f: (r: Row) => boolean) => rows.filter(f).length;
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${rows.length}` },
    { id: "ready", label: `Guide ready · ${count((r) => !!r.guide)}` },
    { id: "byo", label: `Bring your own · ${count((r) => r.managed === false)}` },
    { id: "managed", label: `Composio-managed · ${count((r) => r.managed === true)}` },
    { id: "easy", label: "Easy" },
    { id: "moderate", label: "Moderate" },
    { id: "hard", label: "Hard" },
    { id: "gated", label: "Gated" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter toolkits">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={`rounded-full border px-3 py-1 text-[13px] ${filter === c.id ? "border-ink bg-ink text-[var(--bg)]" : "border-line bg-surface text-muted hover:text-ink"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label htmlFor="lib-filter" className="sr-only">Search toolkits</label>
        <input id="lib-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search toolkits" className="card px-3 py-1.5 text-sm lg:w-56 outline-none focus:border-ink" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="eyebrow px-4 py-2.5">Toolkit</th>
              <th className="eyebrow px-4 py-2.5">OAuth app</th>
              <th className="eyebrow px-4 py-2.5">Own-app difficulty</th>
              <th className="eyebrow px-4 py-2.5 hidden md:table-cell">Approval wait</th>
              <th className="px-4 py-2.5"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.slug} className="border-b border-line last:border-0 hover:bg-[color-mix(in_srgb,var(--bg)_60%,transparent)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ToolkitLogo src={r.logo} name={r.name} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.guide ? <Link href={`/apps/${r.slug}`} className="hover:text-accent">{r.name}</Link> : r.name}</div>
                      <div className="text-xs text-muted truncate">
                        {r.rank < 9999 ? `#${r.rank} on Composio` : "Researched live"}{r.category ? ` · ${r.category}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><ComposioAuthChip managed={r.managed} compact /></td>
                <td className="px-4 py-3">{r.guide ? <DifficultyBadge level={r.guide.difficulty} /> : <span className="text-muted">·</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted max-w-[16rem]">{r.guide?.approvalWait ?? ""}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.guide ? (
                    <Link href={`/apps/${r.slug}`} className="font-medium text-accent">Open guide →</Link>
                  ) : (
                    <Link href={`/generate?q=${encodeURIComponent(r.slug)}`} className="text-muted hover:text-ink font-mono text-xs">Research →</Link>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No toolkits match. Use “Research an app” to investigate any app.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

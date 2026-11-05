import type { Difficulty, Evidence } from "@/lib/schema";
import { DIFFICULTY_META } from "@/lib/schema";

const DIFF_STYLE: Record<Difficulty, React.CSSProperties> = {
  easy: { color: "var(--easy)", background: "var(--easy-soft)" },
  moderate: { color: "var(--moderate)", background: "var(--moderate-soft)" },
  hard: { color: "var(--hard)", background: "var(--hard-soft)" },
  gated: { color: "var(--gated)", background: "var(--gated-soft)" },
};

/** Four-segment meter so difficulty reads by shape as well as color. */
export function DifficultyBadge({ level, size = "sm" }: { level: Difficulty; size?: "sm" | "lg" }) {
  const order: Difficulty[] = ["easy", "moderate", "hard", "gated"];
  const n = order.indexOf(level) + 1;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ${size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
      style={DIFF_STYLE[level]}
      title={DIFFICULTY_META[level].blurb}
    >
      <span className="inline-flex gap-[2px]" aria-hidden>
        {order.map((_, i) => (
          <span key={i} className="w-[5px] h-[10px] rounded-[1px]" style={{ background: "currentColor", opacity: i < n ? 1 : 0.22 }} />
        ))}
      </span>
      {DIFFICULTY_META[level].label}
    </span>
  );
}

const EVIDENCE_META: Record<Evidence, { label: string; help: string; style: React.CSSProperties }> = {
  tested: { label: "Tested", help: "Our server observed this directly with an HTTP probe", style: { background: "var(--easy)", color: "var(--surface)" } },
  documented: { label: "Documented", help: "Stated on the provider's own documentation", style: { background: "var(--accent-soft)", color: "var(--accent)" } },
  community: { label: "Community", help: "Reported in forums, blogs or Q&A sites; not official", style: { background: "var(--moderate-soft)", color: "var(--moderate)" } },
  inferred: { label: "Inferred", help: "The agent reasoned this; no direct source", style: { border: "1px dashed var(--muted)", color: "var(--muted)" } },
};

export function EvidenceChip({ kind }: { kind: Evidence }) {
  const m = EVIDENCE_META[kind];
  return (
    <span className="inline-block shrink-0 rounded px-1.5 py-[1px] text-[11px] font-semibold uppercase tracking-wide" style={m.style} title={m.help}>
      {m.label}
    </span>
  );
}
export { EVIDENCE_META };

const ACTOR: Record<"agent" | "you" | "provider", { label: string; style: React.CSSProperties }> = {
  agent: { label: "Agent can do", style: { background: "var(--accent-soft)", color: "var(--accent)" } },
  you: { label: "You", style: { background: "var(--ink)", color: "var(--surface)" } },
  provider: { label: "Wait on provider", style: { background: "var(--gated-soft)", color: "var(--gated)" } },
};

export function ActorChip({ actor }: { actor: "agent" | "you" | "provider" }) {
  return (
    <span className="inline-block rounded px-1.5 py-[1px] text-[11px] font-semibold whitespace-nowrap" style={ACTOR[actor].style}>
      {ACTOR[actor].label}
    </span>
  );
}

export function ExternalLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`text-accent underline decoration-1 underline-offset-2 hover:decoration-2 break-words ${className}`}>
      {children}
    </a>
  );
}

/** Whether Composio provides the OAuth app for this toolkit. */
export function ComposioAuthChip({ managed, compact = false }: { managed: boolean | null; compact?: boolean }) {
  if (managed === null) return <span className="tag text-muted">Not a toolkit</span>;
  return managed ? (
    <span className="tag-grad" title="Composio provides a shared OAuth app. You can connect users without registering your own.">
      <span>{compact ? "Managed" : "Composio-managed OAuth"}</span>
    </span>
  ) : (
    <span className="tag" style={{ color: "var(--muted)" }} title="Composio has no shared OAuth app for this toolkit. You must register your own.">
      {compact ? "Bring your own" : "Bring your own OAuth app"}
    </span>
  );
}

export function ToolkitLogo({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  if (!src) {
    return (
      <span className="grid place-items-center rounded-md bg-code font-mono text-xs text-muted shrink-0" style={{ width: size, height: size }} aria-hidden>
        {name.slice(0, 1)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="rounded-md shrink-0 object-contain bg-white p-0.5 border border-line" style={{ width: size, height: size }} loading="lazy" />;
}

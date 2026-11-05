"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent";
import { GenerateBox } from "./GenerateBox";

type Item =
  | { kind: "tool"; id: string; name: string; label: string; done?: { ok: boolean; summary: string } }
  | { kind: "probe"; ok: boolean; text: string }
  | { kind: "status"; text: string }
  | { kind: "note"; text: string };

const ICON: Record<string, string> = {
  search_web: "Search",
  fetch_page: "Read",
  check_url: "Check",
  check_oauth_discovery: "Probe",
  probe_authorize_endpoint: "Probe",
  probe_token_endpoint: "Probe",
};

export function LiveResearch({ input, force }: { input: string; force: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [doneSlug, setDoneSlug] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!input || started.current) return;
    started.current = true;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);

    const handle = (e: AgentEvent & { cached?: boolean }) => {
      if (e.type === "status") setItems((xs) => [...xs, { kind: "status", text: e.message }]);
      else if (e.type === "tool") setItems((xs) => [...xs, { kind: "tool", id: e.id, name: e.name, label: e.label }]);
      else if (e.type === "tool_done") setItems((xs) => xs.map((x) => (x.kind === "tool" && x.id === e.id ? { ...x, done: { ok: e.ok, summary: e.summary } } : x)));
      else if (e.type === "probe") setItems((xs) => [...xs, { kind: "probe", ok: e.probe.ok, text: `${e.probe.kind}: ${e.probe.finding}` }]);
      else if (e.type === "note") setItems((xs) => [...xs, { kind: "note", text: e.message }]);
      else if (e.type === "error") setError(e.message);
      else if (e.type === "done") {
        setDoneSlug(e.slug);
        router.replace(`/apps/${e.slug}`);
      }
    };

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input, force }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || `Request failed (${res.status})`);
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) if (line.trim()) handle(JSON.parse(line));
        }
        if (buf.trim()) handle(JSON.parse(buf));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        clearInterval(timer);
      }
    })();
    return () => clearInterval(timer);
  }, [input, force, router]);

  if (!input) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Research an app</h1>
        <GenerateBox autoFocus />
      </div>
    );
  }

  const running = !error && !doneSlug;
  const toolCount = items.filter((i) => i.kind === "tool").length;
  const probes = items.filter((i) => i.kind === "probe").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Live research</p>
        <h1 className="text-2xl font-semibold tracking-tight">{input}</h1>
        <p className="text-sm text-muted tnum" role="status" aria-live="polite">
          {running ? (
            <><span className="pulse inline-block w-2 h-2 rounded-full bg-accent mr-2 align-middle" />Working · {elapsed}s · {toolCount} steps · {probes} probes. This usually takes 1–3 minutes.</>
          ) : doneSlug ? "Done. Opening the guide…" : "Stopped."}
        </p>
      </div>

      {error && (
        <div className="rounded-md p-4 text-sm flex flex-col gap-2" style={{ background: "var(--hard-soft)", color: "var(--hard)" }}>
          <strong>The research run failed.</strong>
          <span>{error}</span>
          <span className="text-muted">Try again, or try the app&apos;s website instead of its name.</span>
        </div>
      )}

      <ol className="flex flex-col gap-0 border-l-2 border-line ml-1">
        {items.map((it, i) => (
          <li key={i} className="relative pl-5 py-1.5 text-sm">
            <span
              aria-hidden
              className="absolute -left-[5px] top-3 w-2 h-2 rounded-full"
              style={{
                background:
                  it.kind === "probe" ? (it.ok ? "var(--easy)" : "var(--hard)") : it.kind === "tool" && !it.done ? "var(--accent)" : "var(--line)",
              }}
            />
            {it.kind === "status" && <span className="font-semibold">{it.text}</span>}
            {it.kind === "tool" && (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-2 min-w-0">
                <span className="eyebrow w-14 shrink-0">{ICON[it.name] ?? "Tool"}</span>
                <span className="break-all min-w-0">{it.label}</span>
                <span className="text-xs text-muted sm:ml-auto shrink-0">{it.done ? it.done.summary : <span className="pulse">…</span>}</span>
              </div>
            )}
            {it.kind === "probe" && (
              <div className="flex gap-2 items-baseline">
                <span className="eyebrow w-14 shrink-0" style={{ color: it.ok ? "var(--easy)" : "var(--hard)" }}>Result</span>
                <span className="text-muted break-words min-w-0">{it.text}</span>
              </div>
            )}
            {it.kind === "note" && (
              <details className="text-muted">
                <summary className="cursor-pointer">Research notes</summary>
                <pre className="whitespace-pre-wrap font-sans text-xs mt-2">{it.text}…</pre>
              </details>
            )}
          </li>
        ))}
        {running && items.length === 0 && <li className="pl-5 py-1.5 text-sm text-muted pulse">Starting…</li>}
      </ol>

      {doneSlug && <Link href={`/apps/${doneSlug}`} className="text-accent font-semibold">Open the guide →</Link>}
    </div>
  );
}

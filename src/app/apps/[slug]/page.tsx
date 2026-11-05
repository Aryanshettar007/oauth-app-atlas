import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/store";
import { DIFFICULTY_META, type Guide } from "@/lib/schema";
import { ActorChip, DifficultyBadge, EvidenceChip, ExternalLink, ToolkitLogo } from "@/components/ui";
import { ComposioSection } from "@/components/ComposioSection";
import { ShareBar } from "@/components/ShareBar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) return { title: "Guide not found" };
  const g = found.guide;
  return {
    title: `${g.appName} OAuth app setup · ${DIFFICULTY_META[g.verdict.difficulty].label}`,
    description: `${g.verdict.setupTime} hands-on, ${g.verdict.approvalWait} approval wait. ${g.summary}`,
  };
}

function Section({ id, title, children, hint }: { id: string; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const PHASES: { id: Guide["steps"][number]["phase"]; label: string; hint: string }[] = [
  { id: "build", label: "Build", hint: "Register the app and get a working connection on your own account" },
  { id: "review", label: "Review", hint: "Whatever the provider requires before other people's accounts can connect" },
  { id: "launch", label: "Launch", hint: "Go live and keep the app in good standing" },
];

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) notFound();
  const g = found.guide;
  const v = g.verdict;
  const reviewed = g.meta.review.status === "reviewed";
  let n = 0;
  const testedCount = g.probes.filter((p) => p.ok).length;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/#library" className="hover:text-ink">Toolkits</Link>
          <span aria-hidden>/</span>
          <span>{g.category}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3"><ToolkitLogo src={g.composio?.logo} name={g.appName} size={40} /><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{g.appName}</h1></div>
          <p className="text-muted max-w-3xl leading-relaxed">{g.summary}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ShareBar slug={g.slug} />
          <p className="text-xs text-muted">
            {reviewed ? (
              <span className="font-semibold" style={{ color: "var(--easy)" }}>Reviewed {g.meta.review.reviewedAt}</span>
            ) : (
              <span className="font-semibold" style={{ color: "var(--moderate)" }}>Agent-generated, not yet reviewed</span>
            )}
            {" · "}researched {g.meta.generatedAt.slice(0, 10)} · {g.meta.toolCalls ?? "?"} tool calls · {testedCount} live probes
          </p>
        </div>
      </header>

      {/* Verdict */}
      <section aria-label="Verdict" className="card overflow-hidden">
        <p className="eyebrow px-4 pt-3">If you bring your own OAuth app</p>
        <dl className="grid grid-cols-2 md:grid-cols-4 divide-line [&>div]:p-4 [&>div]:flex [&>div]:flex-col [&>div]:gap-1.5 border-b border-line">
          <div className="border-r border-b md:border-b-0 border-line">
            <dt className="eyebrow">Difficulty</dt>
            <dd><DifficultyBadge level={v.difficulty} size="lg" /></dd>
          </div>
          <div className="md:border-r border-b md:border-b-0 border-line">
            <dt className="eyebrow">Hands-on setup</dt>
            <dd className="font-semibold">{v.setupTime}</dd>
          </div>
          <div className="border-r border-line">
            <dt className="eyebrow">Approval wait</dt>
            <dd className="font-semibold">{v.approvalWait}</dd>
          </div>
          <div>
            <dt className="eyebrow">Cost</dt>
            <dd className="font-semibold">{v.cost}</dd>
          </div>
        </dl>
        <div className="p-4 flex flex-col gap-3 text-[0.95rem] leading-relaxed">
          <p>{v.why}</p>
          {v.approval !== "none" && (
            <p className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--moderate-soft)" }}>
              <strong>{v.approval === "always" ? "Review always required: " : "Review required when: "}</strong>
              {v.approvalTrigger}
            </p>
          )}
        </div>
      </section>

      <ComposioSection g={g} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-10">
        <div className="flex flex-col gap-10 min-w-0">
          {/* Handoff */}
          <Section id="handoff" title="Who does what" hint="Hand the left column to your coding agent. The right column needs a person with authority over your company account.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md p-4 flex flex-col gap-2" style={{ background: "var(--accent-soft)" }}>
                <h3 className="font-semibold" style={{ color: "var(--accent)" }}>An agent can</h3>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm leading-relaxed">{g.handoff.agentCanDo.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div className="rounded-md p-4 flex flex-col gap-2 border border-ink">
                <h3 className="font-semibold">You must</h3>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm leading-relaxed">{g.handoff.youMustDo.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>
          </Section>

          {g.prerequisites.length > 0 && (
            <Section id="prereqs" title="Before you start">
              <ul className="flex flex-col gap-2">
                {g.prerequisites.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1 shrink-0 w-3.5 h-3.5 rounded-sm border-2" style={{ borderColor: p.blocking ? "var(--hard)" : "var(--line)" }} aria-hidden />
                    <span><strong>{p.item}</strong>{p.blocking && <span className="text-xs font-semibold ml-1.5" style={{ color: "var(--hard)" }}>REQUIRED</span>} <span className="text-muted">{p.detail}</span></span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Steps */}
          <Section id="steps" title="Steps">
            <div className="flex flex-col gap-6">
              {PHASES.map((ph) => {
                const steps = g.steps.filter((s) => s.phase === ph.id);
                if (!steps.length) return null;
                return (
                  <div key={ph.id} className="flex flex-col gap-3">
                    <div className="flex items-baseline gap-3 border-b border-line pb-1">
                      <h3 className="eyebrow" style={{ color: "var(--ink)" }}>{ph.label}</h3>
                      <span className="text-xs text-muted">{ph.hint}</span>
                    </div>
                    <ol className="flex flex-col gap-4">
                      {steps.map((s) => {
                        n++;
                        return (
                          <li key={n} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
                            <span className="tnum text-sm font-semibold text-muted pt-0.5">{n}.</span>
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{s.title}</span>
                                <ActorChip actor={s.actor} />
                                <span className="text-xs text-muted tnum">{s.estimate}</span>
                              </div>
                              <p className="text-sm leading-relaxed text-muted">{s.detail}</p>
                              {s.url && <ExternalLink href={s.url} className="text-xs font-mono">{s.url}</ExternalLink>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </Section>

          {g.blockers.length > 0 && (
            <Section id="blockers" title="What could block you">
              <div className="flex flex-col gap-2">
                {g.blockers.map((b, i) => (
                  <div key={i} className="card p-3 flex flex-col gap-1 border-l-4" style={{ borderLeftColor: b.likelihood === "high" ? "var(--hard)" : b.likelihood === "medium" ? "var(--moderate)" : "var(--line)" }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{b.blocker}</span>
                      <span className="text-[11px] uppercase tracking-wide text-muted">{b.likelihood} likelihood</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed"><strong className="text-ink font-medium">If it happens: </strong>{b.howToUnblock}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section id="oauth" title="OAuth reference">
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted [&_th]:px-3 [&_th]:py-2 [&_th]:align-top [&_th]:w-40 [&_td]:px-3 [&_td]:py-2">
                  <tr><th>Developer console</th><td><ExternalLink href={g.oauth.developerConsoleUrl}>{g.oauth.developerConsoleUrl}</ExternalLink></td></tr>
                  <tr><th>Docs</th><td><ExternalLink href={g.oauth.docsUrl}>{g.oauth.docsUrl}</ExternalLink></td></tr>
                  <tr><th>Authorize URL</th><td><code className="font-mono text-xs bg-code rounded px-1 py-0.5 break-all">{g.oauth.authorizeUrl}</code></td></tr>
                  <tr><th>Token URL</th><td><code className="font-mono text-xs bg-code rounded px-1 py-0.5 break-all">{g.oauth.tokenUrl}</code></td></tr>
                  <tr><th>PKCE</th><td>{g.oauth.pkce}</td></tr>
                  <tr><th>Refresh tokens</th><td>{g.oauth.refreshTokens}</td></tr>
                  <tr><th>Redirect URIs</th><td>{g.oauth.redirectUriRules}</td></tr>
                  <tr><th>Scopes</th><td>{g.oauth.scopeNotes}</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {g.gotchas.length > 0 && (
            <Section id="gotchas" title="Gotchas">
              <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm leading-relaxed">{g.gotchas.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </Section>
          )}

          {/* Evidence */}
          <Section id="evidence" title="Evidence" hint="How each key fact is supported. Tested means our server observed it; documented means the provider's own docs say it.">
            <ul className="flex flex-col divide-y divide-line card">
              {g.claims.map((c, i) => (
                <li key={i} className="p-3 flex gap-3 items-start text-sm">
                  <EvidenceChip kind={c.evidence} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="leading-relaxed">{c.claim}</span>
                    {c.note && <span className="text-muted text-xs">{c.note}</span>}
                    {c.sourceUrl && <ExternalLink href={c.sourceUrl} className="text-xs">{c.sourceUrl}</ExternalLink>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="tested" title="What we tested" hint="Requests our server sent while researching, using a deliberately invalid client ID. Nothing was registered or authorized.">
            {g.probes.length ? (
              <div className="overflow-x-auto card">
                <table className="w-full text-xs">
                  <tbody>
                    {g.probes.map((p, i) => (
                      <tr key={i} className="border-b border-line last:border-0 align-top">
                        <td className="p-2 pl-3 w-6 font-semibold" style={{ color: p.ok ? "var(--easy)" : "var(--hard)" }} aria-label={p.ok ? "ok" : "failed"}>{p.ok ? "✓" : "✗"}</td>
                        <td className="p-2 whitespace-nowrap font-medium">{p.kind}</td>
                        <td className="p-2 min-w-[18rem]">
                          <code className="font-mono break-all">{p.target}</code>
                          <div className="text-muted mt-0.5 leading-relaxed">{p.finding}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No probes were run for this guide.</p>
            )}
          </Section>

          {g.openQuestions.length > 0 && (
            <Section id="unknowns" title="Not confirmed" hint="Things the agent could not establish. Check these with the provider before you commit to a date.">
              <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm leading-relaxed">{g.openQuestions.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </Section>
          )}

          {g.meta.review.notes.length > 0 && (
            <Section id="review" title="Review notes" hint="What a human checked or corrected after the agent wrote this guide.">
              <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm leading-relaxed">{g.meta.review.notes.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </Section>
          )}

          <Section id="sources" title="Sources">
            <ul className="flex flex-col gap-1 text-sm">
              {g.sources.map((s, i) => (
                <li key={i}><ExternalLink href={s.url}>{s.title || s.url}</ExternalLink></li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Side nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 flex flex-col gap-1 text-sm text-muted" aria-label="On this page">
            <p className="eyebrow mb-1">On this page</p>
            {[
              ["composio", "On Composio"],
              ["handoff", "Who does what"],
              ["steps", `Steps (${g.steps.length})`],
              ["blockers", "What could block you"],
              ["oauth", "OAuth reference"],
              ["evidence", "Evidence"],
              ["tested", `What we tested (${g.probes.length})`],
              ["unknowns", "Not confirmed"],
              ["sources", "Sources"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hover:text-ink py-0.5">{label}</a>
            ))}
            <div className="mt-4 pt-4 border-t border-line flex flex-col gap-2">
              <Link href={`/generate?q=${encodeURIComponent(g.meta.input ?? g.appName)}&force=1`} className="hover:text-ink">Re-run research →</Link>
              <span className="text-xs">Model: {g.meta.model}{g.meta.durationSec ? ` · ${g.meta.durationSec}s` : ""}</span>
            </div>
          </nav>
        </aside>
      </div>
    </article>
  );
}

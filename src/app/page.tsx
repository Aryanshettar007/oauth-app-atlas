import { GenerateBox } from "@/components/GenerateBox";
import { Library } from "@/components/Library";
import { DifficultyBadge } from "@/components/ui";
import { DIFFICULTY_META, type Difficulty } from "@/lib/schema";
import { listGuides } from "@/lib/store";
import { SNAPSHOT_DATE, TOOLKITS } from "@/lib/composio";

export const dynamic = "force-dynamic";

export default async function Home() {
  const guides = await listGuides();
  const byo = TOOLKITS.filter((t) => !t.managedOAuth).length;
  const managed = TOOLKITS.length - byo;

  return (
    <div className="flex flex-col gap-14 pt-6">
      {/* Hero */}
      <section className="px-3">
        <div className="mx-auto max-w-6xl rounded-2xl overflow-hidden relative border border-line" style={{ background: "var(--hero)", color: "var(--hero-ink)" }}>
          <div className="dots absolute inset-0 opacity-60" aria-hidden />
          <div className="relative px-5 sm:px-10 py-12 sm:py-16 flex flex-col gap-6 max-w-3xl">
            <span className="tag-grad self-start text-[12px]!"><span>OAuth apps for agent builders</span></span>
            <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.05]">
              Ship on Composio&apos;s OAuth app, or know exactly what it takes to get <span className="grad-text">your own approved</span>.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: "color-mix(in srgb, var(--hero-ink) 70%, transparent)" }}>
              Composio provides managed OAuth apps for many toolkits. For the rest, and when you outgrow the shared app for branding,
              quota or scopes, you register your own with the provider. Each guide shows the hands-on time, the approval wait, what can block you,
              and which steps an agent can do for you.
            </p>
            <GenerateBox />
            <dl className="grid grid-cols-3 gap-4 pt-2 max-w-lg font-mono">
              {[
                [String(TOOLKITS.length), "top OAuth toolkits"],
                [String(managed), "Composio-managed"],
                [String(byo), "bring your own"],
              ].map(([n, l]) => (
                <div key={l} className="flex flex-col gap-1 border-l pl-3" style={{ borderColor: "var(--hero-line)" }}>
                  <dt className="text-[11px] uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--hero-ink) 55%, transparent)" }}>{l}</dt>
                  <dd className="text-2xl tnum">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Decision primer */}
      <section className="mx-auto max-w-6xl w-full px-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-5 flex flex-col gap-2">
          <span className="eyebrow">01 · Start</span>
          <h2 className="font-semibold">Use the managed app if there is one</h2>
          <p className="text-sm text-muted leading-relaxed">No registration, no review. Users see Composio on the consent screen and share Composio&apos;s provider quota.</p>
        </div>
        <div className="card p-5 flex flex-col gap-2">
          <span className="eyebrow">02 · Outgrow</span>
          <h2 className="font-semibold">Switch to your own app when you need to</h2>
          <p className="text-sm text-muted leading-relaxed">Your brand on the consent screen, your own rate limits, custom scopes, or triggers faster than the 2-minute managed polling.</p>
        </div>
        <div className="card p-5 flex flex-col gap-2">
          <span className="eyebrow">03 · Approve</span>
          <h2 className="font-semibold">Plan for the provider&apos;s review</h2>
          <p className="text-sm text-muted leading-relaxed">That is where the weeks go: app review, verification, security assessments, partner programs. The guides tell you which applies.</p>
        </div>
      </section>

      <section aria-labelledby="scale" className="mx-auto max-w-6xl w-full px-4 flex flex-col gap-3">
        <h2 id="scale" className="eyebrow">Own-app difficulty scale</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => (
            <div key={d} className="card p-4 flex flex-col gap-2">
              <DifficultyBadge level={d} />
              <p className="text-sm text-muted leading-snug">{DIFFICULTY_META[d].blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="library" className="mx-auto max-w-6xl w-full px-4 flex flex-col gap-4 scroll-mt-20">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Toolkits</h2>
          <p className="text-sm text-muted">
            The 100 most popular Composio toolkits that use OAuth, from the Composio API (synced {SNAPSHOT_DATE.slice(0, 10)}). Guides marked ready were
            researched by the agent and reviewed; any other toolkit is one click away.
          </p>
        </div>
        <Library toolkits={TOOLKITS} guides={guides} />
      </section>
    </div>
  );
}

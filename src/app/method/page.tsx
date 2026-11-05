import type { Metadata } from "next";
import { EvidenceChip, ActorChip } from "@/components/ui";

export const metadata: Metadata = { title: "How guides are made · OAuth Approval Atlas" };

export default function Method() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-8 leading-relaxed">
      <header className="flex flex-col gap-3">
        <span className="tag-grad self-start"><span>Method</span></span>
        <h1 className="text-3xl font-semibold tracking-tight">How guides are made</h1>
        <p className="text-muted text-lg">
          Each guide answers one question for a developer whose product connects to their users&apos; accounts: what does it take
          to get an OAuth app that any customer can authorize, and how long until that&apos;s true?
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">The problem we focus on</h2>
        <p>
          When your agent acts in a user&apos;s Gmail or Salesforce through Composio, the user authorizes an OAuth app, and Composio stores and
          refreshes the tokens. For many toolkits Composio provides that OAuth app. For the rest, and when you need your own brand on the consent
          screen, your own rate limits, custom scopes or faster triggers, you register your own app with the provider and give Composio its client
          ID and secret.
        </p>
        <p>
          Registering is usually a ten-minute form. The app then starts restricted: your own account or workspace only, a test-user list, a user
          cap, or an &quot;unverified app&quot; screen. Lifting that restriction is where the time goes: app review, brand or business verification,
          marketplace listing, a security assessment, or a partner application. So every guide leads with the gap between <strong>hands-on
          setup</strong> (your time) and <strong>approval wait</strong> (calendar time you can&apos;t compress), and the trigger that starts the wait.
        </p>
        <p>
          The library is built from Composio&apos;s own toolkit API: the 100 most popular toolkits that support OAuth, whether Composio manages the
          OAuth app, the redirect URI to register, and the scopes Composio requests by default. The agent checks those defaults against the
          provider&apos;s rules, because a default scope can be the thing that triggers a review.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">What the agent does</h2>
        <ol className="list-decimal pl-5 flex flex-col gap-2">
          <li><strong>Look up</strong> the Composio toolkit: managed OAuth app or not, redirect URI, default scopes.</li>
          <li><strong>Search</strong> for the provider&apos;s OAuth docs, app-review policy and verification requirements, through Composio&apos;s search toolkit (falling back to Tavily).</li>
          <li><strong>Read</strong> the primary pages in full, preferring the provider&apos;s own docs. Forums are used only for real-world wait times and rejection reasons.</li>
          <li>
            <strong>Probe</strong> the real endpoints from our server: OAuth discovery documents, the authorize endpoint and the token endpoint
            using a deliberately invalid client ID, and the developer console URL. This confirms the endpoints exist and shows how the provider
            rejects unknown apps. It never registers apps or signs in.
          </li>
          <li><strong>Write</strong> the guide in a second, structured pass that can only use facts from the research log.</li>
        </ol>
        <p className="text-sm text-muted">The probe log is recorded by our code, not by the model, so the &quot;What we tested&quot; section shows exactly what happened.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Evidence labels</h2>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 items-start"><EvidenceChip kind="tested" /><span>Our server observed it in a probe during research.</span></li>
          <li className="flex gap-3 items-start"><EvidenceChip kind="documented" /><span>The provider&apos;s own documentation states it.</span></li>
          <li className="flex gap-3 items-start"><EvidenceChip kind="community" /><span>Reported by developers in forums or blogs. Useful for wait times; not authoritative.</span></li>
          <li className="flex gap-3 items-start"><EvidenceChip kind="inferred" /><span>The agent&apos;s reasoning, with no direct source. Treat as a lead to check.</span></li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Who does each step</h2>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 items-start"><ActorChip actor="agent" /><span>A coding agent with web access can do it: research, writing integration code, drafting a privacy policy or the scope justification, preparing the review submission text.</span></li>
          <li className="flex gap-3 items-start"><ActorChip actor="you" /><span>Needs your identity or authority: signing in, accepting developer terms, paying, verifying a business or domain, recording a demo video.</span></li>
          <li className="flex gap-3 items-start"><ActorChip actor="provider" /><span>Calendar time waiting on the provider.</span></li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Limits</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>We do not create developer accounts or submit apps for review, so approval times come from docs and developer reports, not our own submissions.</li>
          <li>Many developer consoles and authorize pages render in the browser or sit behind a login, so probes can confirm an endpoint exists but often cannot read its error message.</li>
          <li>Policies change. Each guide shows its research date; use Re-run research on any guide to refresh it.</li>
          <li>Guides marked &quot;Agent-generated, not yet reviewed&quot; have had no human check.</li>
        </ul>
      </section>
    </article>
  );
}

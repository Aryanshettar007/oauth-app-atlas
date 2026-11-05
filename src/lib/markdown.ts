import { DIFFICULTY_META, type Guide } from "./schema";

/** Plain Markdown version of a guide, for pasting into a ticket, PR or an agent's context. */
export function guideToMarkdown(g: Guide, url?: string): string {
  const L: string[] = [];
  const v = g.verdict;
  L.push(`# ${g.appName}: OAuth app setup and approval`);
  if (url) L.push(`_Source: ${url}_`);
  L.push("");
  L.push(g.summary, "");
  L.push(`| Difficulty | Hands-on setup | Approval wait | Cost |`, `|---|---|---|---|`);
  L.push(`| ${DIFFICULTY_META[v.difficulty].label} | ${v.setupTime} | ${v.approvalWait} | ${v.cost} |`, "");
  L.push(`**Why:** ${v.why}`, "");
  if (v.approval !== "none") L.push(`**Review is ${v.approval === "always" ? "always required" : "required when"}:** ${v.approvalTrigger}`, "");

  if (g.composio) {
    const c = g.composio;
    L.push(`## On Composio (toolkit \`${c.slug}\`)`, "");
    L.push(c.managedOAuth ? "Composio provides a managed OAuth app for this toolkit; you can start without registering your own." : "Composio has no managed OAuth app for this toolkit; you must bring your own.");
    if (g.composioAdvice) L.push("", g.composioAdvice);
    L.push("", `- Redirect URI to register: \`${c.redirectUri}\``, `- Composio default scopes: ${c.defaultScopes.map((x) => `\`${x}\``).join(", ") || "none"}`, "");
  }
  L.push(`## Who does what`, "", `**An agent can:**`);
  g.handoff.agentCanDo.forEach((x) => L.push(`- ${x}`));
  L.push("", `**You must:**`);
  g.handoff.youMustDo.forEach((x) => L.push(`- ${x}`));
  L.push("");

  if (g.prerequisites.length) {
    L.push(`## Before you start`);
    g.prerequisites.forEach((p) => L.push(`- ${p.blocking ? "**(required)** " : ""}${p.item}: ${p.detail}`));
    L.push("");
  }

  L.push(`## Steps`);
  g.steps.forEach((s, i) => {
    const who = s.actor === "agent" ? "agent" : s.actor === "you" ? "you" : "provider";
    L.push(`${i + 1}. **${s.title}** (${who}, ${s.estimate}, ${s.phase}) ${s.detail}${s.url ? ` ${s.url}` : ""}`);
  });
  L.push("");

  if (g.blockers.length) {
    L.push(`## What could block you`);
    g.blockers.forEach((b) => L.push(`- **${b.blocker}** (likelihood: ${b.likelihood}). ${b.howToUnblock}`));
    L.push("");
  }

  const o = g.oauth;
  L.push(`## OAuth reference`, "");
  L.push(`| | |`, `|---|---|`);
  L.push(`| Developer console | ${o.developerConsoleUrl} |`, `| Docs | ${o.docsUrl} |`, `| Authorize URL | \`${o.authorizeUrl}\` |`, `| Token URL | \`${o.tokenUrl}\` |`, `| PKCE | ${o.pkce} |`, `| Refresh tokens | ${o.refreshTokens} |`, `| Redirect URIs | ${o.redirectUriRules} |`, `| Scopes | ${o.scopeNotes} |`, "");

  if (g.gotchas.length) {
    L.push(`## Gotchas`);
    g.gotchas.forEach((x) => L.push(`- ${x}`));
    L.push("");
  }

  L.push(`## Evidence`);
  g.claims.forEach((c) => L.push(`- [${c.evidence}] ${c.claim}${c.sourceUrl ? ` (${c.sourceUrl})` : ""}`));
  if (g.probes.length) {
    L.push("", `**Probes run on ${g.probes[0].at.slice(0, 10)}:**`);
    g.probes.forEach((p) => L.push(`- ${p.ok ? "✓" : "✗"} ${p.kind}: \`${p.target}\` ${p.finding}`));
  }
  if (g.openQuestions.length) {
    L.push("", `**Not confirmed:**`);
    g.openQuestions.forEach((x) => L.push(`- ${x}`));
  }
  if (g.meta.review.notes.length) {
    L.push("", `**Human review notes (${g.meta.review.reviewedAt ?? ""}):**`);
    g.meta.review.notes.forEach((x) => L.push(`- ${x}`));
  }
  L.push("", `## Sources`);
  g.sources.forEach((s) => L.push(`- [${s.title}](${s.url})`));
  L.push("", `_Generated ${g.meta.generatedAt.slice(0, 10)} by ${g.meta.model}; ${g.meta.review.status}._`);
  return L.join("\n");
}

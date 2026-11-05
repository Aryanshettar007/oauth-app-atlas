/**
 * Generate curated guides offline with the SAME agent the web app uses.
 *   npm run generate -- "GitHub" "Slack" "Gmail"
 * Writes data/guides/<slug>.json and a research transcript to data/transcripts/<slug>.log
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { generateGuide } from "../src/lib/agent";

mkdirSync("data/transcripts", { recursive: true });

async function run(app: string) {
  const logFile = `data/transcripts/${app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.log`;
  writeFileSync(logFile, `# ${app} — ${new Date().toISOString()}\n`);
  const guide = await generateGuide(app, (e) => {
    const line = e.type === "tool" ? `→ ${e.label}` : e.type === "tool_done" ? `  ${e.ok ? "✓" : "✗"} ${e.summary}` : e.type === "probe" ? `  ◆ probe: ${e.probe.kind} ${e.probe.target} — ${e.probe.finding}` : `${e.type}: ${"message" in e ? e.message : ""}`;
    console.log(`[${app}] ${line}`);
    appendFileSync(logFile, line + "\n");
  });
  writeFileSync(`data/guides/${guide.slug}.json`, JSON.stringify(guide, null, 2) + "\n");
  console.log(`[${app}] wrote data/guides/${guide.slug}.json (${guide.verdict.difficulty}, ${guide.meta.durationSec}s, ${guide.meta.toolCalls} tool calls)`);
}

const apps = process.argv.slice(2);
if (!apps.length) {
  console.error('Usage: npm run generate -- "App name" ["Another app"]');
  process.exit(1);
}
// Sequential: the Gemini free tier allows ~5 requests/minute per model.
(async () => {
  for (const app of apps) {
    try {
      await run(app);
    } catch (e) {
      console.error(`[${app}] FAILED:`, e instanceof Error ? e.message.slice(0, 300) : e);
    }
  }
})();

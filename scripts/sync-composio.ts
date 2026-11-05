/**
 * Snapshot Composio's catalog: the 100 most popular toolkits that support OAuth2,
 * plus per-toolkit auth details (managed app?, redirect URI, default scopes, endpoints).
 *   npm run sync-composio
 */
import { writeFileSync } from "node:fs";
import { fetchToolkitDetail, listToolkits, toToolkit, type ComposioToolkit } from "../src/lib/composio";

async function main() {
  const picked: { slug: string; rank: number }[] = [];
  let cursor: string | undefined;
  let rank = 0;
  while (picked.length < 100) {
    const page = await listToolkits({ limit: "100", ...(cursor ? { cursor } : {}) });
    for (const t of page.items) {
      rank++;
      if ((t.auth_schemes ?? []).includes("OAUTH2") && picked.length < 100) picked.push({ slug: t.slug, rank });
    }
    if (!page.next_cursor || !page.items.length) break;
    cursor = page.next_cursor;
  }
  const out: ComposioToolkit[] = [];
  for (let i = 0; i < picked.length; i += 10) {
    const batch = await Promise.all(picked.slice(i, i + 10).map(async (p) => {
      const d = await fetchToolkitDetail(p.slug);
      return d ? toToolkit(d, p.rank) : null;
    }));
    batch.forEach((b) => b && out.push(b));
  }
  writeFileSync("data/composio-toolkits.json", JSON.stringify({ syncedAt: new Date().toISOString(), toolkits: out }, null, 2) + "\n");
  const managed = out.filter((t) => t.managedOAuth).length;
  console.log(`Saved ${out.length} OAuth toolkits (${managed} with Composio-managed OAuth, ${out.length - managed} bring-your-own). Scanned ${rank} toolkits by popularity.`);
}
main();

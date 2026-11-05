// Rewrites data/guides/index.ts to statically import every curated guide JSON.
import { readdirSync, writeFileSync } from "node:fs";
const dir = new URL("../data/guides/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const ident = (f) => "g_" + f.replace(/\.json$/, "").replace(/[^a-z0-9]/gi, "_");
const src = `// Curated guides: produced by the same agent pipeline (scripts/generate.ts), then reviewed.
// Regenerate this list with \`npm run index-guides\`.
import { GuideSchema, type Guide } from "../../src/lib/schema";
${files.map((f) => `import ${ident(f)} from "./${f}";`).join("\n")}

const raw: unknown[] = [${files.map(ident).join(", ")}];

export const CURATED: Guide[] = raw.map((g) => GuideSchema.parse(g));
`;
writeFileSync(new URL("index.ts", dir), src);
console.log(`Indexed ${files.length} guides`);

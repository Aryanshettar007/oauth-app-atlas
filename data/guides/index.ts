// Curated guides: produced by the same agent pipeline (scripts/generate.ts), then reviewed.
// Regenerate this list with `npm run index-guides`.
import { GuideSchema, type Guide } from "../../src/lib/schema";
import g_github from "./github.json";
import g_gmail from "./gmail.json";
import g_twitter from "./twitter.json";

const raw: unknown[] = [g_github, g_gmail, g_twitter];

export const CURATED: Guide[] = raw.map((g) => GuideSchema.parse(g));

import { generateGuide, type AgentEvent } from "@/lib/agent";
import { getGuide, saveGenerated } from "@/lib/store";
import { slugify } from "@/lib/schema";
import { resolveToolkit } from "@/lib/composio";

export const maxDuration = 300;

// Best-effort in-memory limiter so a public demo link can't burn the API key.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > Number(process.env.GENERATIONS_PER_HOUR || 10);
}

export async function POST(req: Request) {
  const { input, force } = (await req.json().catch(() => ({}))) as { input?: string; force?: boolean };
  const q = (input ?? "").trim().slice(0, 200);
  if (q.length < 2) return Response.json({ error: "Enter an app name or website" }, { status: 400 });

  const toolkit = await resolveToolkit(q);
  const existing = await getGuide(toolkit?.slug ?? slugify(q));
  if (existing && !force) {
    return new Response(JSON.stringify({ type: "done", slug: existing.guide.slug, cached: true }) + "\n", {
      headers: { "content-type": "application/x-ndjson" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "Rate limit reached for this demo. Try again later." }, { status: 429 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      // Keep proxies from closing an idle connection while the model thinks.
      const ping = setInterval(() => controller.enqueue(encoder.encode("\n")), 10_000);
      try {
        const guide = await generateGuide(q, emit, toolkit);
        await saveGenerated(guide);
        emit({ type: "done", slug: guide.slug });
      } catch (e) {
        console.error(e);
        emit({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}

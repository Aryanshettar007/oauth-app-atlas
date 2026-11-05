import { getGuide } from "@/lib/store";
import { guideToMarkdown } from "@/lib/markdown";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) return new Response("Not found", { status: 404 });
  const url = new URL(`/apps/${slug}`, req.url).toString();
  return new Response(guideToMarkdown(found.guide, url), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

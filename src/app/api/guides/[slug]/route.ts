import { getGuide } from "@/lib/store";

/** Machine-readable guide, so another agent can consume it directly. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getGuide(slug);
  if (!found) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(found.guide);
}

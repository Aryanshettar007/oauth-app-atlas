import { LiveResearch } from "@/components/LiveResearch";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ q?: string; force?: string }> }) {
  const { q = "", force } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LiveResearch input={q} force={force === "1"} />
    </div>
  );
}

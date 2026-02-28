import { InteractiveGraphCard } from "@/components/interactive-graph-card";

export default function RevenueChartEmbedPage() {
  return (
    <main className="min-h-screen w-full bg-white px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-5xl">
        <InteractiveGraphCard />
      </div>
    </main>
  );
}

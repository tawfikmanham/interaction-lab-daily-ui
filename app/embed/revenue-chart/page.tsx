import { InteractiveGraphCard } from "@/components/interactive-graph-card";

export default function RevenueChartEmbedPage() {
  return (
    <main className="w-full bg-transparent p-3 sm:p-4">
      <div className="mx-auto w-full max-w-5xl">
        <InteractiveGraphCard />
      </div>
    </main>
  );
}

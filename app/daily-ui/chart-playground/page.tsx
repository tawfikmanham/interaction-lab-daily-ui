import { InteractiveGraphCard } from "@/components/interactive-graph-card";

export default function ChartPlaygroundPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f5f4_0%,_#fafaf9_35%,_#f4f4f5_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <InteractiveGraphCard />
      </section>
    </main>
  );
}

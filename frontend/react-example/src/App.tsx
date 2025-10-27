import { BlockSearchCard } from "@/features/blocks/components/BlockSearchCard";
import { LatestBlocksCard } from "@/features/blocks/components/LatestBlocksCard";
import { GasPriceHeatmapCard } from "@/features/gas-price/components/GasPriceHeatmapCard";
import { GasPriceTrendCard } from "@/features/gas-price/components/GasPriceTrendCard";
import { TransactionHeatmapCard } from "@/features/transactions/components/TransactionHeatmapCard";
import { TransactionHistoryCard } from "@/features/transactions/components/TransactionHistoryCard";

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <header className="relative overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-purple-800 pb-40 pt-12 text-white shadow-2xl shadow-indigo-950/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.25),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-x-0 -bottom-40 h-72 bg-linear-to-b from-white/20 via-white/8 to-transparent blur-3xl" />
        <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="flex flex-col gap-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/75">
                  Built with Arkiv
                </span>
                <div className="space-y-6">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    Ethereum Blockchain Dashboard powered by the Arkiv data
                    layer
                  </h1>
                  <p className="max-w-2xl text-base text-white/80 sm:text-lg">
                    Monitor Ethereum&apos;s latest blocks, transaction flow, and
                    gas price shifts through Arkiv&apos;s real-time data
                    snapshots.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/60">
                    Latest block
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    #21,000,950
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/60">
                    Avg gas (30d)
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    24.8 Gwei
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/60">
                    Transactions
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    1.02M / day
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/60">
                    Current gas price
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    24.8 Gwei
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-20 -mt-24 pb-20">
        <div className="mx-auto w-full max-w-[1600px] space-y-16 px-6 text-foreground sm:px-10 lg:px-16 xl:space-y-20">
          <main className="grid gap-12 xl:gap-14" id="overview">
            <section className="grid gap-6 xl:grid-cols-12" id="blocks">
              <LatestBlocksCard className="xl:col-span-8" />
              <BlockSearchCard className="xl:col-span-4" />
            </section>

            <section className="grid gap-6 xl:grid-cols-12" id="transactions">
              <TransactionHistoryCard className="xl:col-span-7" />
              <GasPriceTrendCard className="xl:col-span-5" />
            </section>

            <section className="grid gap-6 xl:grid-cols-12" id="gas">
              <TransactionHeatmapCard className="xl:col-span-6" />
              <GasPriceHeatmapCard className="xl:col-span-6" />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

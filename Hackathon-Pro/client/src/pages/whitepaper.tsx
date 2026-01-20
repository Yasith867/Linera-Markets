import { Layout } from "@/components/layout";
import { FileText, Shield, Zap, Info, Clock, Lock, Rocket, Download } from "lucide-react";

export default function Whitepaper() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-12 animate-enter py-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient">LineraMarkets Whitepaper</h1>
          <p className="text-xl text-muted-foreground">Real-time prediction markets powered by microchains.</p>
          <div className="flex justify-center gap-4 mt-4">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-all"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Section icon={<Info className="text-emerald-400" />} title="Abstract">
            LineraMarkets is a decentralized prediction market platform built on Linera microchains. By utilizing parallel execution and per-market microchains, we provide sub-second finality and infinite scalability for global event trading.
          </Section>

          <Section icon={<Zap className="text-indigo-400" />} title="The Problem">
            Traditional prediction markets suffer from high latency, network congestion, and centralized resolution risks. On monolithic chains, a single popular market can slow down the entire platform.
          </Section>

          <Section icon={<Rocket className="text-emerald-400" />} title="The Solution">
            Each market on LineraMarkets operates on its own dedicated microchain (execution shard). This ensures that trading volume in one market never impacts the performance of another, enabling a truly real-time user experience.
          </Section>

          <Section icon={<Clock className="text-indigo-400" />} title="Market Lifecycle">
            Markets progress through four distinct states: Open (trading allowed), Closed (deadline reached), Resolved (outcome determined), and Finalized (rewards claimed). This immutable lifecycle is enforced by microchain logic.
          </Section>

          <Section icon={<Shield className="text-emerald-400" />} title="Security Model">
            Resolution is handled by market creators or verified oracles. To prevent fraud, we implement a 10-minute dispute window after resolution where the community can challenge outcomes.
          </Section>

          <Section icon={<Lock className="text-indigo-400" />} title="Why Linera?">
            Linera's microchain architecture is the perfect fit for prediction markets. It allows for parallel processing of millions of trades, horizontal scaling, and predictable low-cost transactions.
          </Section>
        </div>

        <div className="bg-card border border-white/5 rounded-2xl p-8 space-y-6">
          <h3 className="text-2xl font-display font-bold text-white">Roadmap</h3>
          <div className="space-y-4">
            <RoadmapItem step="Q1 2026" text="Initial MVP on Conway Testnet with Mock Mode integration." />
            <RoadmapItem step="Q2 2026" text="Automated Oracle integration for major sports and financial events." />
            <RoadmapItem step="Q3 2026" text="Cross-chain liquidity pools and mobile DApp launch." />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl space-y-3">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function RoadmapItem({ step, text }: { step: string, text: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-emerald-400 font-bold min-w-[80px]">{step}</span>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

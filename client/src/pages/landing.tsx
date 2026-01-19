import { Link } from "wouter";
import { ArrowRight, BrainCircuit, Activity, Globe, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="absolute top-0 w-full z-10 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-emerald-400" />
            <span className="font-display font-bold text-xl tracking-tight">Linera<span className="text-emerald-400">Markets</span></span>
          </div>
          <Link href="/dashboard" className="text-sm font-medium hover:text-emerald-400 transition-colors">
            Launch App
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium animate-enter opacity-0" style={{ animationDelay: "0.1s" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live on Linera Microchains
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-none animate-enter opacity-0" style={{ animationDelay: "0.2s" }}>
              Predict the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">Future</span><br />
              Own the Outcome
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-enter opacity-0" style={{ animationDelay: "0.3s" }}>
              A decentralized prediction market powered by the Linera protocol. 
              Real-time settlement, low latency, and infinite scalability.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-enter opacity-0" style={{ animationDelay: "0.4s" }}>
              <Link href="/dashboard">
                <button className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                  Launch App <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/whitepaper">
                <button className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all">
                  Read Whitepaper
                </button>
              </Link>
            </div>
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 animate-enter opacity-0" style={{ animationDelay: "0.6s" }}>
            {[
              { icon: Activity, title: "Real-time Action", desc: "Experience sub-second latency for live sports and event markets." },
              { icon: ShieldCheck, title: "Trustless Settlement", desc: "Outcomes verified on-chain. Your funds are always in your control." },
              { icon: Globe, title: "Global Access", desc: "Participate in markets from anywhere in the world without restrictions." }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card/50 border border-white/5 hover:border-emerald-500/20 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

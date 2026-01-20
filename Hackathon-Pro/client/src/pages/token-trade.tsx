import { Layout } from "@/components/layout";
import { useRoute } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { formatMoney, cn } from "@/lib/utils";
import { useMockMode } from "@/lib/linera";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function TokenTradePage() {
  const [, params] = useRoute("/trade/:symbol");
  const symbol = params?.symbol || "BTC";
  const { identity } = useMockMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const { data: markets, isLoading: loadingMarkets } = useQuery<any[]>({
    queryKey: ["/api/crypto/markets"],
  });

  const token = markets?.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());

  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ["/api/wallet/me", identity],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/me?userId=${encodeURIComponent(identity)}`);
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    enabled: !!identity,
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: identity }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Trade failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trade Successful", description: `You successfully ${side}ed ${amount} ${symbol.toUpperCase()}` });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      setAmount("");
    },
    onError: (err: any) => {
      toast({ title: "Trade Failed", description: err.message, variant: "destructive" });
    }
  });

  if (loadingMarkets || !token) return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div></Layout>;

  const priceChange = token.price_change_percentage_24h || 0;
  const holdings = (walletData as any)?.holdings || {};
  const currentTokenBalance = holdings[symbol.toUpperCase()] || 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-enter">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <img src={token.image} alt={token.name} className="w-12 h-12 rounded-full" />
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                {token.name} <span className="text-muted-foreground uppercase">{token.symbol}</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono text-emerald-400">{formatMoney(token.current_price)}</span>
                <span className={cn("text-sm flex items-center", priceChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 h-[400px] flex flex-col relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
               <div className="flex justify-between items-center mb-4 z-10">
                 <h3 className="text-lg font-bold tracking-widest uppercase text-emerald-500/50">Market Analytics</h3>
                 <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                   <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-500/80">Live</span>
                 </div>
               </div>
               <div className="flex-1 min-h-0 z-10 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={(token.sparkline_in_7d?.price || []).map((p: number) => ({ p }))}>
                     <defs>
                       <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <Line type="monotone" dataKey="p" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={2000} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest text-emerald-500/50 flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4" />
                  Terminal
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-emerald-500/20 transition-all">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase font-black tracking-[0.2em]">Available Liquidity</p>
                  <p className="text-2xl font-black text-white group-hover:neon-text transition-all tracking-tighter">{formatMoney(walletData?.balance || 0)}</p>
                </div>
                <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-indigo-500/20 transition-all">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase font-black tracking-[0.2em]">{symbol.toUpperCase()} Allocation</p>
                  <p className="text-2xl font-black text-white group-hover:text-indigo-400 transition-all tracking-tighter">{currentTokenBalance.toFixed(4)}</p>
                </div>
              </div>

              <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setSide("buy")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all", 
                    side === "buy" ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "text-muted-foreground hover:text-white"
                  )}
                >Buy</button>
                <button 
                  onClick={() => setSide("sell")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all", 
                    side === "sell" ? "bg-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "text-muted-foreground hover:text-white"
                  )}
                >Sell</button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Execution Amount</label>
                  <div className="relative group">
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all group-hover:border-white/20"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{symbol}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{side === 'buy' ? 'Total Cost' : 'Total Return'}</span>
                  <span className="text-xl font-black text-white tracking-tighter">{formatMoney(Number(amount || 0) * token.current_price)}</span>
                </div>

                <button 
                  onClick={() => tradeMutation.mutate({ symbol, side, amountToken: amount })}
                  disabled={tradeMutation.isPending || !amount}
                  className={cn(
                    "w-full py-5 text-white font-black uppercase tracking-[0.2em] text-sm rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50",
                    side === "buy" 
                      ? "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:bg-emerald-400" 
                      : "bg-red-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)] hover:bg-red-400"
                  )}
                >
                  {tradeMutation.isPending ? <Loader2 className="animate-spin" /> : `Execute ${side}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

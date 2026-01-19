import { Layout } from "@/components/layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowUpRight, ArrowDownRight, Globe, TrendingUp, Info } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useMockMode } from "@/lib/linera";
import { Link, useLocation } from "wouter";
import { formatMoney } from "@/lib/utils";

interface Token {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d: { price: number[] };
  isFake?: boolean;
}

const REAL_IDS = ["bitcoin", "ethereum", "solana", "chainlink", "polygon-ecosystem-token"];

export default function CryptoMarkets() {
  const [isStale, setIsStale] = useState(false);
  const { identity } = useMockMode();
  const queryClient = useQueryClient();

  const [, setLocation] = useLocation();
  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["/api/crypto/markets"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/crypto/markets");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        setIsStale(false);
        // Ensure only real tokens and handle POL vs MATIC (server handles ids now, but client safety filter)
        return (data || []).filter((t: any) => REAL_IDS.includes(t.id));
      } catch (err) {
        setIsStale(true);
        return [];
      }
    },
    initialData: [],
    refetchInterval: 30000,
  });

  const renderValue = (val: any, prefix = "", suffix = "") => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    if (typeof val === 'number') {
      return prefix + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
    }
    return val;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 animate-enter">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Crypto Markets</h1>
            <p className="text-muted-foreground mt-2">Live ecosystem data and real-time asset tracking.</p>
          </div>
          {isStale && (
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse flex items-center gap-2">
              <Info className="w-3 h-3" /> API Rate Limited (Showing Stale Data)
            </div>
          )}
        </div>

        <div className="bg-card/40 glass border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black border-b border-white/5">
                  <th className="px-8 py-6">Asset</th>
                  <th className="px-8 py-6">Price</th>
                  <th className="px-8 py-6">24h Performance</th>
                  <th className="px-8 py-6">Market Cap</th>
                  <th className="px-8 py-6">Trend</th>
                  <th className="px-8 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {isLoading && (!tokens || tokens.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        <span className="text-xs font-bold tracking-widest text-emerald-500/50 uppercase">Syncing Markets...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (tokens || []).map((token: any) => (
                    <tr key={token.id} className="hover:bg-white/[0.03] transition-all group cursor-pointer" onClick={() => setLocation(`/crypto/${token.id}`)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={token.image} alt={token.name} className="w-10 h-10 rounded-full border border-white/10 group-hover:border-emerald-500/50 transition-colors" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-emerald-400 transition-colors text-lg">{token.symbol.toUpperCase()}</div>
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              {token.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-white font-bold">
                        {renderValue(token.current_price, "$")}
                      </td>
                      <td className="px-8 py-6">
                        <div className={clsx(
                          "flex items-center gap-1 font-bold text-sm px-3 py-1 rounded-full w-fit",
                          (token.price_change_percentage_24h || 0) >= 0 
                            ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" 
                            : "text-red-400 bg-red-500/5 border border-red-500/10"
                        )}>
                          {(token.price_change_percentage_24h || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {renderValue(Math.abs(token.price_change_percentage_24h), "", "%")}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-muted-foreground font-medium">
                        {renderValue(token.market_cap, "$")}
                      </td>
                      <td className="px-8 py-6 w-40">
                        <div className="h-12 w-32 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(token.sparkline_in_7d?.price || []).map((p: number) => ({ p }))}>
                              <Line 
                                type="monotone" 
                                dataKey="p" 
                                stroke={(token.price_change_percentage_24h || 0) >= 0 ? "#10b981" : "#f43f5e"} 
                                strokeWidth={2} 
                                dot={false} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-emerald-500 transition-colors">
                          Details
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex gap-4 items-start">
            <Globe className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-white mb-1">Global Market Connectivity</h4>
              <p className="text-sm text-muted-foreground">
                Real-time data feeds powered by external oracles and native microchain shards.
              </p>
            </div>
          </div>
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 flex gap-4 items-start">
            <TrendingUp className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-white mb-1">Parallel Trading Execution</h4>
              <p className="text-sm text-muted-foreground">
                Trade with sub-second finality using your test USDC balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

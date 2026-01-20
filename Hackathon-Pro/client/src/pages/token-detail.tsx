import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, BarChart2, Activity } from "lucide-react";
import { useRoute, Link } from "wouter";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { clsx } from "clsx";

export default function TokenDetail() {
  const [, params] = useRoute("/crypto/:id");
  const id = params?.id;

  const { data: coin, isLoading: isCoinLoading } = useQuery({
    queryKey: ["/api/crypto/markets", id],
    queryFn: async () => {
      const res = await fetch("/api/crypto/markets");
      const data = await res.json();
      return data.find((c: any) => c.id === id);
    },
    enabled: !!id,
  });

  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ["/api/crypto", id, "chart"],
    queryFn: async () => {
      const res = await fetch(`/api/crypto/${id}/chart?days=7`);
      return res.json();
    },
    enabled: !!id,
  });

  const formattedChartData = chartData?.prices?.map(([time, price]: [number, number]) => ({
    time: new Date(time).toLocaleDateString(),
    price,
  })) || [];

  const renderValue = (val: any, prefix = "", suffix = "") => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return prefix + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
  };

  if (isCoinLoading || isChartLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!coin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Asset Not Found</h2>
          <Link href="/crypto-markets">
            <button className="neon-btn-secondary">Back to Markets</button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isPositive = (coin.price_change_percentage_24h || 0) >= 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-enter">
        <div className="flex items-center justify-between">
          <Link href="/crypto-markets">
            <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Markets
            </button>
          </Link>
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400">
            Source: CoinGecko
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <img src={coin.image} alt="" className="w-32 h-32 grayscale" />
              </div>
              <div className="flex items-center gap-6 mb-8 relative z-10">
                <img src={coin.image} alt={coin.name} className="w-16 h-16 rounded-full border-2 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black text-white tracking-tighter">{coin.name}</h1>
                    <span className="text-xl font-bold text-emerald-500/50 uppercase">{coin.symbol}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="text-3xl font-mono font-black text-white">{renderValue(coin.current_price, "$")}</div>
                    <div className={clsx(
                      "text-sm font-bold px-2 py-0.5 rounded-lg border",
                      isPositive ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-red-400 border-red-500/20 bg-red-500/5"
                    )}>
                      {isPositive ? "+" : ""}{renderValue(coin.price_change_percentage_24h, "", "%")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full mt-12 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(5, 8, 10, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      formatter={(val: any) => [renderValue(val, "$"), "Price"]}
                    />
                    <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/50 mb-8 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Market Statistics
              </h3>
              <div className="space-y-8">
                <div className="group">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-emerald-500 transition-colors">Market Cap</div>
                  <div className="text-2xl font-black text-white tracking-tighter">{renderValue(coin.market_cap, "$")}</div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-cyan-500 transition-colors">24h Volume</div>
                  <div className="text-2xl font-black text-white tracking-tighter">{renderValue(coin.total_volume, "$")}</div>
                </div>
                <div className="group">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-indigo-500 transition-colors">Circulating Supply</div>
                  <div className="text-2xl font-black text-white tracking-tighter">{renderValue(coin.circulating_supply)} <span className="text-xs text-muted-foreground">{coin.symbol.toUpperCase()}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/5 glass border border-indigo-500/20 rounded-3xl p-8">
              <h4 className="font-black uppercase tracking-widest text-indigo-400 text-[10px] mb-4">Market Watchlist</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Real-time institutional grade data provided by CoinGecko. Trading features for high-cap assets are restricted to verified execution shards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

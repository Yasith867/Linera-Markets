import { Layout } from "@/components/layout";
import { useMockMode } from "@/lib/linera";
import { User, Wallet, History, LogOut, TrendingUp, Award, Frown, History as HistoryIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMarkets } from "@/hooks/use-markets";
import { useEffect } from "react";

export default function Profile() {
  const { identity } = useMockMode();
  const name = identity.includes("_") ? `User ${identity.split("_")[1]}` : `User ${identity.substring(0, 6)}`;
  const { data: markets } = useMarkets();

  const { data: positions, isLoading, refetch } = useQuery({
    queryKey: ["/api/positions", identity],
    queryFn: async () => {
      const res = await fetch(`/api/positions/my/${encodeURIComponent(identity)}`);
      if (!res.ok) throw new Error("Failed to fetch positions");
      const data = await res.json();
      console.log("Profile positions data:", data);
      return data;
    },
    enabled: !!identity,
    refetchInterval: 3000,
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    const handleEvent = () => {
      refetch();
    };
    
    eventSource.addEventListener("position-placed", handleEvent);
    eventSource.addEventListener("market-resolved", handleEvent);
    eventSource.addEventListener("market-updated", handleEvent);
    
    return () => eventSource.close();
  }, [refetch]);

  const resetProfile = () => {
    sessionStorage.removeItem("lm_user_id");
    sessionStorage.removeItem("lm_user_identity_v3");
    window.location.reload();
  };

  const trades = Array.isArray(positions) ? positions : [];
  const wins = trades.filter((p: any) => p.status === "won").length;
  const losses = trades.filter((p: any) => p.status === "lost").length;
  const recentPositions = [...trades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-enter">
        <div className="bg-card border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl -mr-32 -mt-32 rounded-full" />
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-display font-bold text-white mb-2">{name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 font-mono text-emerald-400">
                  <Wallet className="w-4 h-4" />
                  {identity}
                </div>
              </div>
            </div>
            <button 
              onClick={resetProfile}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Reset Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-white/5 p-6 rounded-2xl text-center">
            <Award className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{wins}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Wins</div>
          </div>
          <div className="bg-card border border-white/5 p-6 rounded-2xl text-center">
            <Frown className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{losses}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Losses</div>
          </div>
          <div className="bg-card border border-white/5 p-6 rounded-2xl text-center">
            <TrendingUp className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{(positions?.length || 0)}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Trades</div>
          </div>
        </div>

        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-emerald-400" />
              Recent Positions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <th className="px-6 py-4">Market</th>
                  <th className="px-6 py-4">Outcome</th>
                  <th className="px-6 py-4">Stake</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentPositions.map((pos: any) => {
                  const market = markets?.find(m => m.id === pos.marketId);
                  const option = market?.options.find((o: any) => o.id === pos.optionId);
                  const isResolved = market?.status === "resolved" || market?.status === "finalized";
                  const isWinner = isResolved && market.winningOptionId === pos.optionId;

                  return (
                    <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{market?.question || "Loading..."}</td>
                      <td className="px-6 py-4 text-muted-foreground">{option?.text || "..."}</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">{pos.amount} USDC</td>
                      <td className="px-6 py-4">
                        {pos.status === "pending" ? (
                          <span className="px-2 py-1 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDING</span>
                        ) : pos.status === "won" ? (
                          <span className="px-2 py-1 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">WON</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">LOST</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentPositions.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No trading history found.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
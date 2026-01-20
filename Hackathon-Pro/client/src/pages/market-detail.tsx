import { formatMoney } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useRoute, useLocation, Link } from "wouter";
import { useMarket, useCreatePosition } from "@/hooks/use-markets";
import { useMockMode } from "@/lib/linera";
import { Clock, Loader2, Trophy, CheckCircle2, User, Share2, BarChart2, TrendingUp, ShieldCheck, Trash2, ArrowRight } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { clsx } from "clsx";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function MarketDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/markets/:id");
  const id = Number(params?.id);
  const { data: market, isLoading, isError } = useMarket(id);
  const { identity } = useMockMode();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("10");
  const [isDeletedLocally, setIsDeletedLocally] = useState(false);
  const positionMutation = useCreatePosition();
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.addEventListener("MARKET_DELETED", (event: any) => {
      const data = JSON.parse(event.data);
      if (data.marketId === id) {
        setIsDeletedLocally(true);
      }
    });
    return () => eventSource.close();
  }, [id]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/markets/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": identity }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Market deleted", description: "The market has been removed." });
      setLocation("/dashboard");
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  });

  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet/me", identity],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/me?userId=${encodeURIComponent(identity)}`);
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    enabled: !!identity,
    refetchInterval: 1000,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/markets/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: identity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Claim failed");
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Claim successful!", 
        description: data.payout > 0 
          ? `You received ${data.payout} USDC.` 
          : "Market resolved. You did not have a winning position." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
    },
    onError: (err: any) => {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (isError || !market || isDeletedLocally) {
    return (
      <Layout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
            {isDeletedLocally ? "Market Deleted" : "Market Protocol Offline"}
          </h2>
          <p className="text-muted-foreground max-w-xs text-sm">
            {isDeletedLocally 
              ? "This market has been permanently removed from the protocol by its creator." 
              : "The requested market execution shard is unavailable or has been archived."}
          </p>
          <Link href="/dashboard">
            <button className="neon-btn-secondary mt-4 py-2 px-8 text-xs">Return to Terminal</button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isActuallyOpen = market.status === "open" && !isPast(new Date(market.closeTime));
  const isResolved = market.status === "resolved" || market.status === "finalized";
  const isCreator = true; // FORCE ENABLE FOR DEMO TO ENSURE VISIBILITY

  // Debug delete button visibility
  console.log("Delete visibility check:", { identity, creatorId: market.creatorId, isCreator, status: market.status });

  // Debug interactivity
  console.log("Market status check:", { 
    status: market.status, 
    closeTime: market.closeTime, 
    isActuallyOpen, 
    isPast: isPast(new Date(market.closeTime)) 
  });

  const handlePlacePosition = async () => {
    if (selectedOption === null) {
      toast({
        title: "Selection required",
        description: "Please select an outcome before placing a position.",
        variant: "destructive",
      });
      return;
    }

    const stake = Number(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      toast({
        title: "Invalid amount",
        description: "Stake amount must be a number greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = Number(walletData?.balance || 0);
    if (stake > currentBalance) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${currentBalance} USDC available.`,
        variant: "destructive",
      });
      return;
    }

    if (!isActuallyOpen) {
      toast({
        title: "Market closed",
        description: "Market closed — trading disabled.",
        variant: "destructive",
      });
      return;
    }

    // Dev logging
    console.log("Placing position payload:", {
      marketId: market.id,
      optionId: selectedOption,
      amount: stake.toString(),
      userAddress: identity,
    });

    positionMutation.mutate({
      marketId: market.id,
      optionId: selectedOption,
      amount: stake.toString(),
      userAddress: identity,
    }, {
      onSuccess: (data) => {
        console.log("Position placed response:", data);
        toast({
          title: "Position placed",
          description: "Your stake has been recorded on the microchain.",
        });
        setSelectedOption(null);
        queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
        queryClient.invalidateQueries({ queryKey: ["/api/markets"] }); // Invalidate global list to update balance
      },
      onError: (error: any) => {
        console.error("Trade error:", error);
        toast({
          title: "Failed to place position",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    });
  };

  const chartData = market.options.map((opt: any) => ({
    name: opt.text,
    staked: Number(opt.totalStaked),
    percentage: Number(market.totalLiquidity) > 0 ? (Number(opt.totalStaked) / Number(market.totalLiquidity)) * 100 : 0
  }));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 animate-enter">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between bg-card/60 p-4 rounded-3xl border border-white/5 shadow-2xl mb-6">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  isActuallyOpen ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                  isResolved ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : 
                  "bg-gray-500/10 text-gray-400 border-gray-500/20"
                )}>
                  {isActuallyOpen ? "open" : isResolved ? "resolved" : "closed"}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className={clsx("w-3 h-3", isActuallyOpen && !isPast(new Date(market.closeTime).getTime() - 120000) && "text-amber-400")} />
                  {isActuallyOpen ? `Ends ${formatDistanceToNow(new Date(market.closeTime), { addSuffix: true })}` : "Closed"}
                </span>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-red-400 hover:text-white transition-all px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-400 shadow-lg shadow-red-500/10 relative z-[100] group/del">
                    <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-tighter">Delete Proposal</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[200] border-red-500/20 bg-black/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black uppercase tracking-widest text-red-500">System Override: Delete?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/70 font-medium">
                      You are about to permanently purge this market from the protocol. This will incinerate ALL active positions and liquidity.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5 font-bold">Abort</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteMutation.mutate()} 
                      disabled={deleteMutation.isPending}
                      className="bg-red-600 hover:bg-red-500 rounded-xl font-black uppercase tracking-widest px-8 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Purge"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {isActuallyOpen && !isPast(new Date(market.closeTime).getTime() - 120000) && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-sm animate-pulse">
                Market closes very soon — place positions now.
              </div>
            )}
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-white leading-tight">{market.question}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5">
                <User className="w-4 h-4" />
                Created by {market.creatorId}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5">
                <TrendingUp className="w-4 h-4" />
                {market.totalLiquidity} USDC Staked
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {isResolved && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-400" />
                    Market Resolved
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The winning outcome was: <span className="text-indigo-400 font-bold">{market.options.find((o: any) => o.id === market.winningOptionId)?.text}</span>
                  </p>
                </div>
                <button
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {claimMutation.isPending ? "Claiming..." : "Claim Payout"}
                </button>
              </div>
            )}

            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-lg font-bold tracking-widest uppercase text-emerald-500/50 mb-8">Available Outcomes</h3>
              <div className="space-y-4">
                {market.options.map((option: any) => {
                  const percentage = Number(market.totalLiquidity) > 0 ? Math.round((Number(option.totalStaked) / Number(market.totalLiquidity)) * 100) : 0;
                  const isSelected = selectedOption === option.id;
                  const isWinner = (market.status === 'resolved' || market.status === 'finalized') && market.winningOptionId === option.id;

                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        console.log("Outcome clicked:", option.id, "isActuallyOpen:", isActuallyOpen);
                        if (isActuallyOpen) setSelectedOption(option.id);
                      }}
                      className={clsx(
                        "group relative w-full text-left p-6 rounded-2xl border transition-all duration-500 overflow-hidden active:scale-[0.98]",
                        isWinner ? "bg-emerald-500/10 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]" :
                        isSelected 
                          ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/20",
                        isActuallyOpen ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div 
                        className={clsx(
                          "absolute inset-y-0 left-0 transition-all duration-1000",
                          isWinner ? "bg-emerald-500/30" : 
                          isSelected ? "bg-emerald-500/20" : "bg-emerald-500/5"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isWinner ? "border-emerald-400 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)]" :
                            isSelected ? "border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "border-white/20"
                          )}>
                            {(isSelected || isWinner) && <CheckCircle2 className="w-3 h-3 text-black" />}
                          </div>
                          <div className="flex flex-col">
                            <span className={clsx("font-bold text-lg transition-colors", (isSelected || isWinner) ? "text-emerald-400" : "text-white/90")}>
                              {option.text}
                            </span>
                            {isWinner && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Winning Outcome</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={clsx("text-xl font-black tracking-tighter", isWinner ? "text-emerald-400" : "text-white")}>{percentage}%</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{formatMoney(option.totalStaked)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isActuallyOpen && (
                <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-3 w-full">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Stake Amount (USDC)</label>
                      <div className="relative group">
                        <input 
                          type="number" 
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">USDC</div>
                      </div>
                    </div>
                    <button 
                      onClick={handlePlacePosition}
                      disabled={positionMutation.isPending || !selectedOption}
                      className="w-full md:w-auto px-12 py-4 neon-btn disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                    >
                      {positionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Position"}
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Fee: <span className="text-emerald-500/50">0.00 USDC</span></p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available: <span className="text-white">{formatMoney(walletData?.balance || 0)}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card/40 glass border border-white/5 rounded-3xl p-8 h-auto min-h-[300px] flex flex-col">
              <h3 className="text-lg font-bold tracking-widest uppercase text-emerald-500/50 mb-8">Protocol Stats</h3>
              <div className="flex-1 min-h-0 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={10} fontWeight="900" />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'rgba(5, 8, 10, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value} USDC`, 'Volume']}
                    />
                    <Bar dataKey="staked" radius={[0, 4, 4, 0]} barSize={12}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#22d3ee'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
                <div className="group">
                  <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Total Volume</div>
                  <div className="text-xl font-black text-white tracking-tighter">{formatMoney(market.totalLiquidity)}</div>
                </div>
                <div className="group text-right md:text-left">
                  <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 group-hover:text-cyan-500 transition-colors">Total Positions</div>
                  <div className="text-xl font-black text-white tracking-tighter">{market.totalPositions}</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/5 glass border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-emerald-400 text-sm mb-2">Execution Shard Active</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    This market is deployed on a dedicated Linera microchain. All positions are processed with sub-second finality and guaranteed parallel execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { Layout } from "@/components/layout";
import { useRoute } from "wouter";
import { useMarket, useCreatePosition } from "@/hooks/use-markets";
import { useMockMode } from "@/lib/linera";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Wallet, Coins, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow, isPast } from "date-fns";

export default function TradePage() {
  const [, params] = useRoute("/trade/:id");
  const id = Number(params?.id);
  const { data: market, isLoading } = useMarket(id);
  const { identity } = useMockMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("10");
  const positionMutation = useCreatePosition();

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

  const faucetMutation = useQuery({
    queryKey: ["faucet", identity],
    queryFn: async () => {
      const res = await fetch("/api/wallet/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: identity }),
      });
      if (!res.ok) throw new Error("Faucet failed");
      return res.json();
    },
    enabled: false,
  });

  const handleFaucet = async () => {
    try {
      await queryClient.fetchQuery({ queryKey: ["faucet", identity] });
      toast({ title: "Success", description: "1000 USDC added to your wallet." });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePlacePosition = async () => {
    if (selectedOption === null) {
      toast({ title: "Selection required", description: "Please select an outcome.", variant: "destructive" });
      return;
    }
    const stake = Number(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      toast({ title: "Invalid amount", description: "Stake must be > 0.", variant: "destructive" });
      return;
    }
    const balance = Number(walletData?.user?.points || 0);
    if (stake > balance) {
      toast({ title: "Insufficient balance", description: "You don't have enough USDC.", variant: "destructive" });
      return;
    }

    positionMutation.mutate({
      marketId: market.id,
      optionId: selectedOption,
      amount: stake.toString(),
      userAddress: identity,
    }, {
      onSuccess: () => {
        toast({ title: "Position placed", description: "Your trade was successful." });
        setSelectedOption(null);
        queryClient.invalidateQueries({ queryKey: ["/api/markets", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to place position", variant: "destructive" });
      }
    });
  };

  if (isLoading || !market) return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div></Layout>;

  const isOpen = market.status === "open" && !isPast(new Date(market.closeTime));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-enter">
        <div className="bg-card border border-white/5 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-4">
             <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                isOpen ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
              )}>
                {isOpen ? "OPEN FOR TRADING" : "MARKET CLOSED"}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isOpen ? `Closes ${formatDistanceToNow(new Date(market.closeTime), { addSuffix: true })}` : "Trading Ended"}
              </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-6">{market.question}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Select Outcome
              </h3>
              <div className="grid gap-3">
                {market.options.map((option: any) => {
                  const isSelected = selectedOption === option.id;
                  const percentage = Number(market.totalLiquidity) > 0 ? Math.round((Number(option.totalStaked) / Number(market.totalLiquidity)) * 100) : 0;
                  return (
                    <button
                      key={option.id}
                      disabled={!isOpen}
                      onClick={() => setSelectedOption(option.id)}
                      className={clsx(
                        "w-full p-4 rounded-xl border text-left transition-all",
                        isSelected ? "bg-emerald-500/10 border-emerald-500" : "bg-white/5 border-white/5 hover:border-white/20",
                        !isOpen && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center", isSelected ? "border-emerald-500 bg-emerald-500" : "border-white/20")}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium text-white">{option.text}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">{percentage}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    Trading Account
                  </h3>
                  <button onClick={handleFaucet} className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Get USDC
                  </button>
                </div>
                <div className="text-2xl font-bold text-white">
                  {walletData?.user?.points || "0.00"} <span className="text-sm text-muted-foreground">USDC</span>
                </div>
              </div>

              {isOpen ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Stake Amount</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">USDC</span>
                    </div>
                  </div>
                  <button 
                    onClick={handlePlacePosition}
                    disabled={positionMutation.isPending}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {positionMutation.isPending ? <Loader2 className="animate-spin" /> : "Place Position"}
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col items-center text-center gap-2">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <div className="font-bold text-white">Trading Closed</div>
                  <p className="text-xs text-muted-foreground">This market is no longer accepting positions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
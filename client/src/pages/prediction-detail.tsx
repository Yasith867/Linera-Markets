import { Layout } from "@/components/layout";
import { usePrediction, useVote, useResolvePrediction } from "@/hooks/use-predictions";
import { useRoute } from "wouter";
import { useMockMode } from "@/lib/linera";
import { Clock, Loader2, Trophy, CheckCircle2, User, AlertCircle, Share2, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function PredictionDetail() {
  const [, params] = useRoute("/prediction/:id");
  const id = Number(params?.id);
  const { data: prediction, isLoading } = usePrediction(id);
  const voteMutation = useVote();
  const resolveMutation = useResolvePrediction();
  const { identity } = useMockMode();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  if (isLoading || !prediction) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  const totalVotes = prediction.options.reduce((acc, opt) => acc + opt.voteCount, 0);
  const isLive = prediction.status === "live";
  const isResolved = prediction.status === "resolved";
  
  const chartData = prediction.options.map(opt => ({
    name: opt.text,
    votes: opt.voteCount,
    percentage: totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0
  }));

  const handleVote = (optionId: number) => {
    voteMutation.mutate({
      predictionId: id,
      optionId,
      voterIdentity: identity
    });
  };

  const handleResolve = () => {
    if (selectedOption) {
      resolveMutation.mutate({ id, winningOptionId: selectedOption });
      setIsResolveDialogOpen(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 animate-enter">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                isLive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                isResolved ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : 
                "bg-gray-500/10 text-gray-400 border-gray-500/20"
              )}>
                {prediction.status}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isLive ? `Ends ${formatDistanceToNow(new Date(prediction.closeTime), { addSuffix: true })}` : "Closed"}
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-white leading-tight">
              {prediction.question}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5">
                <User className="w-4 h-4" />
                Created by {prediction.creator}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5">
                <BarChart2 className="w-4 h-4" />
                {totalVotes} Total Votes
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="p-3 rounded-xl bg-card border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-muted-foreground hover:text-white">
              <Share2 className="w-5 h-5" />
            </button>
            
            {/* Admin/Resolve Button (Visible for demo) */}
            {isLive && (
              <button 
                onClick={() => setIsResolveDialogOpen(true)}
                className="px-6 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium hover:bg-indigo-500/20 transition-all"
              >
                Admin: Resolve Market
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Voting Options */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Make your prediction</h3>
            <div className="grid grid-cols-1 gap-4">
              {prediction.options.map((option) => {
                const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
                const isWinner = prediction.winningOptionId === option.id;
                
                return (
                  <button
                    key={option.id}
                    disabled={!isLive || voteMutation.isPending}
                    onClick={() => handleVote(option.id)}
                    className={clsx(
                      "group relative w-full text-left p-4 rounded-xl border transition-all duration-300 overflow-hidden",
                      isWinner 
                        ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500" 
                        : "bg-card border-white/5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
                    )}
                  >
                    {/* Background Bar */}
                    <div 
                      className={clsx(
                        "absolute inset-y-0 left-0 transition-all duration-1000 opacity-10",
                        isWinner ? "bg-emerald-500" : "bg-white"
                      )}
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold transition-colors",
                          isWinner ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/5 border-white/10 group-hover:border-emerald-500 group-hover:text-emerald-400"
                        )}>
                          {isWinner ? <Trophy className="w-4 h-4" /> : String.fromCharCode(65 + prediction.options.indexOf(option))}
                        </span>
                        <span className="font-medium text-lg">{option.text}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold">{percentage}%</div>
                          <div className="text-xs text-muted-foreground">{option.voteCount} votes</div>
                        </div>
                        {isLive && (
                          <div className="w-6 h-6 rounded-full border-2 border-white/20 group-hover:border-emerald-500 transition-colors" />
                        )}
                        {isWinner && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-6">
            <div className="bg-card border border-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vote Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      hide 
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-indigo-100">Market Rules</h4>
                  <p className="text-sm text-indigo-200/70 mt-1 leading-relaxed">
                    This market will resolve based on public information available at the closing time. 
                    Resolutions are executed by the market creator and verified on-chain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Market</DialogTitle>
            <DialogDescription>
              Select the winning outcome. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {prediction.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={clsx(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  selectedOption === opt.id 
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                    : "bg-background border-white/10 hover:border-emerald-500/50"
                )}
              >
                <span className="font-medium">{opt.text}</span>
                {selectedOption === opt.id && <CheckCircle2 className="w-5 h-5" />}
              </button>
            ))}
          </div>
          
          <DialogFooter>
            <button
              onClick={() => setIsResolveDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedOption || resolveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {resolveMutation.isPending ? "Resolving..." : "Confirm Resolution"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

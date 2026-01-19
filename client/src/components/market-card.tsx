import { Link } from "wouter";
import { Clock, Users, ArrowRight, CheckCircle2, TrendingUp, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { useMockMode } from "@/lib/linera";
import { useDeleteMarket } from "@/hooks/use-markets";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function MarketCard({ market }: { market: any }) {
  const { identity } = useMockMode();
  const deleteMutation = useDeleteMarket();
  const isOpen = market.status === "open";
  const isCreator = true; // FORCE ENABLE FOR DEMO
  const moreOptionsCount = market.options.length > 2 ? market.options.length - 2 : 0;

  return (
    <div className="group relative flex flex-col h-full">
      <div className="absolute top-6 right-6 z-[60] flex items-center gap-2 pointer-events-auto">
        <div className={clsx(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
          isOpen 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "bg-gray-500")} />
          {market.status}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all opacity-100 shadow-lg shadow-red-500/20 cursor-pointer group/trash"
            >
              <Trash2 className="w-4 h-4 group-hover/trash:scale-110 transition-transform" />
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="z-[200] bg-black/90 backdrop-blur-xl border-red-500/20"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500 font-black uppercase tracking-widest">System Override: Delete?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                You are about to permanently purge this market from the protocol. This will incinerate ALL active positions and liquidity.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="rounded-xl border-white/10"
              >
                Abort
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteMutation.mutate({ id: market.id, userId: identity });
                }}
                className="bg-red-600 hover:bg-red-500 rounded-xl font-bold"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Purge"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Link href={`/markets/${market.id}`} className="flex-1 flex flex-col h-full">
        <div className="flex flex-col h-full overflow-hidden rounded-3xl glass border border-white/5 p-8 transition-all duration-500 hover:neon-border hover:-translate-y-1 cursor-pointer relative z-10">
          <div className="flex flex-col flex-1 gap-6">
            <div className="pr-24 min-h-[3.5rem]">
              <h3 className="font-display font-black text-xl leading-tight group-hover:neon-text transition-all line-clamp-2">
                {market.question}
              </h3>
              {market.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1 font-medium italic">
                  {market.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
                <span>{isOpen ? `Ends ${formatDistanceToNow(new Date(market.closeTime), { addSuffix: true })}` : "Closed"}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-500/50" />
                <span className="text-cyan-400/80">{market.totalLiquidity} USDC</span>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {market.options.slice(0, 2).map((opt: any) => {
                const percentage = Number(market.totalLiquidity) > 0 ? Math.round((Number(opt.totalStaked) / Number(market.totalLiquidity)) * 100) : 0;
                const isWinner = (market.status === 'resolved' || market.status === 'finalized') && market.winningOptionId === opt.id;
                
                return (
                  <div key={opt.id} className={clsx(
                    "relative h-12 rounded-xl bg-black/40 border overflow-hidden flex items-center px-4 group/opt transition-all duration-500",
                    isWinner ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-white/5"
                  )}>
                    <div 
                      className={clsx(
                        "absolute inset-y-0 left-0 transition-all duration-1000",
                        isWinner ? "bg-emerald-500/20" : "bg-emerald-500/10"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative z-10 w-full flex justify-between text-xs font-bold items-center">
                      <span className={clsx("transition-colors flex items-center gap-2", isWinner ? "text-emerald-400" : "text-white/90 group-hover/opt:text-white")}>
                        {opt.text}
                        {isWinner && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-tighter">Winner</span>}
                      </span>
                      <span className={clsx("font-mono", isWinner ? "text-emerald-400" : "text-emerald-500/50")}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
              {moreOptionsCount > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40 text-center pt-1">
                  + {moreOptionsCount} more outcome{moreOptionsCount > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="mt-auto pt-4 relative z-20">
              <div className={clsx(
                "w-full py-4 rounded-2xl text-center text-xs font-black uppercase tracking-[0.2em] transition-all duration-300",
                isOpen 
                  ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:bg-emerald-400 active:scale-95" 
                  : "neon-btn-secondary py-[14px]"
              )}>
                {isOpen ? "Vote" : "View"}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

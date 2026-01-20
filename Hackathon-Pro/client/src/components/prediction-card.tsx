import { Link } from "wouter";
import { Clock, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { type MarketWithDetail } from "@shared/schema";
import { clsx } from "clsx";

export function PredictionCard({ prediction }: { prediction: MarketWithDetail }) {
  const totalVotes = prediction.options.reduce((acc, opt) => acc + Number(opt.totalStaked), 0);
  const isActuallyOpen = prediction.status === "open" && !isPast(new Date(prediction.closeTime));
  const isResolved = prediction.status === "resolved";

  return (
    <Link href={`/markets/${prediction.id}`}>
      <div className="group relative overflow-hidden rounded-2xl bg-card border border-white/5 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer">
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border",
            isActuallyOpen 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" 
              : isResolved
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-gray-500/10 text-gray-400 border-gray-500/20"
          )}>
            <span className={clsx("w-1.5 h-1.5 rounded-full", isActuallyOpen ? "bg-emerald-400" : isResolved ? "bg-indigo-400" : "bg-gray-400")} />
            {isActuallyOpen ? "open" : isResolved ? "resolved" : "closed"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="pr-12">
            <h3 className="font-display font-semibold text-lg leading-tight group-hover:text-emerald-400 transition-colors">
              {prediction.question}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{isActuallyOpen ? `Ends ${formatDistanceToNow(new Date(prediction.closeTime), { addSuffix: true })}` : "Closed"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{prediction.totalPositions} positions</span>
            </div>
          </div>

          {/* Top Options Preview */}
          <div className="space-y-2 pt-2">
            {prediction.options.slice(0, 2).map((opt) => {
              const percentage = Number(prediction.totalLiquidity) > 0 ? Math.round((Number(opt.totalStaked) / Number(prediction.totalLiquidity)) * 100) : 0;
              return (
                <div key={opt.id} className="relative h-10 rounded-lg bg-white/5 overflow-hidden flex items-center px-4">
                  <div 
                    className="absolute inset-y-0 left-0 bg-white/5 transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative z-10 w-full flex justify-between text-sm font-medium">
                    <span>{opt.text}</span>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                  {prediction.winningOptionId === opt.id && (
                    <CheckCircle2 className="relative z-10 ml-2 w-4 h-4 text-emerald-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover Action */}
        <div className="absolute bottom-4 right-4 opacity-0 transform translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          <div className="p-2 rounded-full bg-emerald-500 text-white shadow-lg">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

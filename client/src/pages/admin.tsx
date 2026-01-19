import { Layout } from "@/components/layout";
import { useMarkets } from "@/hooks/use-markets";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function Admin() {
  const { data: markets, isLoading } = useMarkets();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: async ({ marketId, winningOptionId }: { marketId: number, winningOptionId: number }) => {
      const res = await fetch(`/api/markets/${marketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningOptionId }),
      });
      if (!res.ok) throw new Error("Failed to resolve market");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Market Resolved", description: "The winners can now claim their payouts." });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  if (isLoading) return <Layout><Loader2 className="animate-spin mx-auto mt-20" /></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Market Resolution (Admin)</h1>
        <div className="grid gap-6">
          {markets?.filter(m => m.status === "open" || m.status === "closed").map(market => (
            <div key={market.id} className="bg-card border border-white/5 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-4">{market.question}</h3>
              <div className="flex flex-wrap gap-4">
                {market.options.map(option => (
                  <button
                    key={option.id}
                    onClick={() => resolveMutation.mutate({ marketId: market.id, winningOptionId: option.id })}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    Set "{option.text}" as Winner
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
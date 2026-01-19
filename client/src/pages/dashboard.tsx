import { Layout } from "@/components/layout";
import { useMarkets, useDeleteMarket } from "@/hooks/use-markets";
import { MarketCard } from "@/components/market-card";
import { Search, Filter, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMockMode } from "@/lib/linera";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: markets, isLoading } = useMarkets();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const { identity } = useMockMode();
  const deleteMutation = useDeleteMarket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.addEventListener("MARKET_DELETED", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    });
    return () => eventSource.close();
  }, [queryClient]);

  const filteredMarkets = markets?.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter || (filter === 'closed' && (p.status === 'resolved' || p.status === 'disputed'));
    const matchesSearch = p.question.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <Layout>
      <div className="space-y-8 animate-enter">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient">Markets</h1>
            <p className="text-muted-foreground mt-2">Explore active prediction markets on the chain.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-emerald-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search markets..." 
                className="pl-9 pr-4 py-2.5 rounded-xl bg-card border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full md:w-64 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex p-1 rounded-xl bg-card border border-white/10">
              {(['all', 'open', 'closed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === f 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : filteredMarkets?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">No markets found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {filteredMarkets?.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

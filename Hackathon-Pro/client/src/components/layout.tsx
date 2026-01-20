import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, Trophy, Wallet, Menu, X, BrainCircuit, Coins, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { useMockMode } from "@/lib/linera";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { isMockMode, toggleMockMode, identity, name } = useMockMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!identity) return;
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      // General catch-all for background updates
      queryClient.invalidateQueries();
    };

    eventSource.addEventListener('market-created', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    });

    eventSource.addEventListener('market-deleted', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    });

    eventSource.addEventListener('position-placed', (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ["/api/markets", data.marketId] });
      if (data.userAddress === identity) {
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      }
    });

    eventSource.addEventListener('faucet-funded', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId === identity) {
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      }
    });

    return () => eventSource.close();
  }, [identity, queryClient]);

  const { data: userData } = useQuery({
    queryKey: ["/api/wallet/me", identity],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/me?userId=${encodeURIComponent(identity)}`);
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    enabled: isMockMode && !!identity,
    refetchInterval: 1000,
  });

  const faucetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: identity }),
      });
      if (!res.ok) throw new Error("Faucet failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test funds received!",
        description: `Your balance is now ${data.points} USDC.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const navItems = [
    { label: "Markets", href: "/dashboard", icon: LayoutDashboard },
    { label: "Crypto Markets", href: "/crypto-markets", icon: BarChart3 },
    { label: "Create", href: "/create", icon: PlusCircle },
    { label: "My Profile", href: "/profile", icon: Trophy },
  ];

  const addressLabel = typeof identity === 'string' ? identity : (identity as any)?.address || "mock-user";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner for Mock Mode */}
      <div 
        className={clsx(
          "w-full py-1.5 px-4 text-[10px] uppercase tracking-widest font-bold text-center transition-all cursor-pointer z-[60]",
          isMockMode ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20" : "bg-red-500/10 text-red-400 border-b border-red-500/20"
        )}
        onClick={toggleMockMode}
      >
        <span className={clsx("inline-block w-2 h-2 rounded-full mr-2", isMockMode ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500")}></span>
        {isMockMode 
          ? "Mock Mode Active — Local Microchain Sync" 
          : "Real Mode — Seeking Network (Click to switch)"}
      </div>

      <header className="sticky top-0 z-50 w-full glass border-b border-white/5 bg-background/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-600 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Linera<span className="text-emerald-500">Markets</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-400",
                  location === item.href ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-muted-foreground"
                )}
              >
                <item.icon className={clsx("w-4 h-4", location === item.href && "text-emerald-400")} />
                {item.label}
                {location === item.href && (
                  <div className="absolute -bottom-[22px] left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            ))}
            <div className="h-6 w-px bg-white/10 mx-2" />
            
            {isMockMode && (
              <button
                onClick={() => faucetMutation.mutate()}
                disabled={faucetMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Coins className="w-3 h-3" />
                {faucetMutation.isPending ? "Requesting..." : "Get Test Funds"}
              </button>
            )}

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-muted-foreground">
                <Wallet className="w-3 h-3" />
                {addressLabel.substring(0, 8)}...
              </div>
              {userData?.user?.points && (
                <span className="text-[10px] text-emerald-400 font-bold mr-2 mt-0.5">
                  {userData.user.points} USDC
                </span>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-muted-foreground hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-24 z-40 bg-background/95 backdrop-blur-sm p-4 animate-in slide-in-from-top-10">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 p-4 rounded-xl text-lg font-medium transition-colors",
                  location === item.href ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-white/5 text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-white/5 py-8 mt-12 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by the <span className="text-emerald-400 font-semibold">Linera</span> protocol. 
            Real-time microchain prediction markets.
          </p>
        </div>
      </footer>
    </div>
  );
}

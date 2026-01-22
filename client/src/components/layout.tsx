import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PlusCircle,
  Trophy,
  Wallet,
  Menu,
  X,
  BrainCircuit,
  Coins,
  BarChart3,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { useMockMode } from "@/lib/linera";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { isMockMode, toggleMockMode, identity } = useMockMode(); // ⬅ removed unused `name`
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * ✅ VERCEL-SAFE DATA UPDATES
   * - NO EventSource
   * - NO /api/events
   * - Uses polling (works in serverless)
   */
  useEffect(() => {
    if (!identity) return;

    const tick = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me", identity] });
    };

    // run once immediately
    tick();

    // poll every 4 seconds
    const interval = setInterval(tick, 4000);

    return () => clearInterval(interval);
  }, [identity, queryClient]);

  const { data: userData } = useQuery({
    queryKey: ["/api/wallet/me", identity],
    queryFn: async () => {
      if (!identity) throw new Error("No identity");
      const res = await fetch(
        `/api/wallet/me?userId=${encodeURIComponent(identity)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    enabled: isMockMode && Boolean(identity),
    refetchInterval: false, // ⬅ polling handles refresh
  });

  const faucetMutation = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("No identity");
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
        description: err.message ?? "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const navItems = [
    { label: "Markets", href: "/dashboard", icon: LayoutDashboard },
    { label: "Crypto Markets", href: "/crypto-markets", icon: BarChart3 },
    { label: "Create", href: "/create", icon: PlusCircle },
    { label: "My Profile", href: "/profile", icon: Trophy },
  ];

  const addressLabel =
    typeof identity === "string"
      ? identity
      : (identity as any)?.address ?? "mock-user";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mock Mode Banner */}
      <div
        className={clsx(
          "w-full py-1.5 px-4 text-[10px] uppercase tracking-widest font-bold text-center cursor-pointer z-[60]",
          isMockMode
            ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border-b border-red-500/20",
        )}
        onClick={toggleMockMode}
      >
        <span
          className={clsx(
            "inline-block w-2 h-2 rounded-full mr-2",
            isMockMode
              ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              : "bg-red-500",
          )}
        />
        {isMockMode
          ? "Mock Mode Active — Local Microchain Sync"
          : "Real Mode — Seeking Network (Click to switch)"}
      </div>

      <header className="sticky top-0 z-50 w-full glass border-b border-white/5 bg-background/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-600">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">
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
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  location === item.href
                    ? "text-emerald-400"
                    : "text-muted-foreground hover:text-emerald-400",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}

            {isMockMode && (
              <button
                onClick={() => faucetMutation.mutate()}
                disabled={faucetMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400"
              >
                <Coins className="w-3 h-3" />
                {faucetMutation.isPending ? "Requesting…" : "Get Test Funds"}
              </button>
            )}

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-mono">
                <Wallet className="w-3 h-3" />
                {addressLabel.slice(0, 8)}…
              </div>
              {userData?.user?.points != null && (
                <span className="text-[10px] text-emerald-400 font-bold mt-0.5">
                  {userData.user.points} USDC
                </span>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-24 z-40 bg-background/95 p-4">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-4 rounded-xl"
              >
                <item.icon />
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
            Powered by{" "}
            <span className="text-emerald-400 font-semibold">Linera</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

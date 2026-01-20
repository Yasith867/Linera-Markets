import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import CreateMarket from "@/pages/create";
import MarketDetail from "@/pages/market-detail";
import Profile from "@/pages/profile";
import Whitepaper from "@/pages/whitepaper";
import Admin from "@/pages/admin";
import Trade from "@/pages/trade";
import TokenTrade from "@/pages/token-trade";
import CryptoMarkets from "@/pages/tokens";
import TokenDetail from "@/pages/token-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/markets" component={Dashboard} />
      <Route path="/create" component={CreateMarket} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route path="/trade/:symbol" component={TokenTrade} />
      <Route path="/crypto-markets" component={CryptoMarkets} />
      <Route path="/tokens" component={CryptoMarkets} />
      <Route path="/crypto" component={CryptoMarkets} />
      <Route path="/crypto/:id" component={TokenDetail} />
      <Route path="/markets/:id" component={MarketDetail} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

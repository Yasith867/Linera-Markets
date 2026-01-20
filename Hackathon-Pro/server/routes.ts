
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { markets, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Predictions ---

  // --- SSE Setup ---
  const clients = new Set<any>();

  app.get("/api/events", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // For Nginx
    res.flushHeaders();

    const client = { res };
    clients.add(client);
    
    // Send initial heartbeat
    res.write(': heartbeat\n\n');

    req.on('close', () => {
      clients.delete(client);
    });
  });

  const broadcast = (event: string, data: any) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(c => c.res.write(payload));
  };

  // --- Predictions ---

  app.post("/api/markets/create", async (req, res) => {
    try {
      const { question, options, closeTime, creatorId, category } = req.body;
      
      if (!question || question.length < 10) {
        return res.status(400).json({ message: "Question must be at least 10 characters" });
      }
      if (!options || !Array.isArray(options) || options.length < 2 || options.length > 6) {
        return res.status(400).json({ message: "Provide 2-6 non-empty options" });
      }
      if (options.some(o => !o || typeof o !== 'string' || o.trim() === '')) {
        return res.status(400).json({ message: "Options cannot be empty" });
      }
      const closeDate = new Date(closeTime);
      if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
        return res.status(400).json({ message: "Close time must be a valid future date" });
      }
      if (!creatorId) {
        return res.status(400).json({ message: "creatorId is required" });
      }

      const market = await storage.createMarket({
        question,
        options,
        closeTime: closeDate,
        creatorId,
        category: category || "General"
      });
      broadcast('market-created', market);
      res.status(201).json(market);
    } catch (err) {
      console.error("Create market error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.markets.list.path, async (req, res) => {
    const marketsList = await storage.getMarkets();
    const now = new Date();
    
    // Auto-close and auto-resolve logic
    for (const m of marketsList) {
      const closeDate = new Date(m.closeTime);
      if (m.status === "open" && closeDate <= now) {
        // Find option with max votes/staked
        const options = m.options || [];
        if (options.length > 0) {
          const winner = options.reduce((prev: any, current: any) => 
            (Number(prev.totalStaked) > Number(current.totalStaked)) ? prev : current
          );
          
          // CRITICAL: Update the database directly to ensure persistent state
          await storage.resolveMarket(m.id, winner.id);
          
          // Update the local object for the immediate response
          m.status = "resolved";
          m.winningOptionId = winner.id;
          
          // Broadcast both events to ensure frontend catches the update
          broadcast('market-resolved', { id: m.id, winningOptionId: winner.id });
          broadcast('market-updated', { id: m.id, status: 'resolved', winningOptionId: winner.id });
        } else {
          await db.update(markets).set({ status: "closed" }).where(eq(markets.id, m.id));
          m.status = "closed";
          broadcast('market-updated', { id: m.id, status: 'closed' });
        }
      }
    }
    
    res.json(marketsList);
  });

  app.get(api.markets.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const market = await storage.getMarket(id);
    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }
    
    const now = new Date();
    const closeDate = new Date(market.closeTime);
    
    // Auto-resolve logic for single market view
    if (market.status === "open" && closeDate <= now) {
      const options = market.options || [];
      if (options.length > 0) {
        const winner = options.reduce((prev: any, current: any) => 
          (Number(prev.totalStaked) > Number(current.totalStaked)) ? prev : current
        );
        await storage.resolveMarket(market.id, winner.id);
        market.status = "resolved";
        market.winningOptionId = winner.id;
        broadcast('market-resolved', { id: market.id, winningOptionId: winner.id });
      } else {
        await db.update(markets).set({ status: "closed" }).where(eq(markets.id, market.id));
        market.status = "closed";
      }
      broadcast('market-updated', { id: market.id, status: market.status });
    }
    
    res.json(market);
  });

  app.delete("/api/markets/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const requesterId = req.headers["x-user-id"] as string;

      if (!requesterId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const market = await storage.getMarket(id);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      // Allow deletion if the user is the creator OR if the market was created by the system "mock-user"
      const isAuthorized = market.creatorId === requesterId || market.creatorId === "mock-user";
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Only the creator can delete this market" });
      }

      if (market.status === "resolved") {
        return res.status(400).json({ message: "Resolved markets cannot be deleted" });
      }

      await storage.deleteMarket(id);
      broadcast("MARKET_DELETED", { marketId: id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : "Deletion failed" });
    }
  });

  app.post(api.markets.resolve.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { winningOptionId } = req.body;
      
      const existing = await storage.getMarket(id);
      if (!existing) return res.status(404).json({ message: "Market not found" });

      const updated = await storage.resolveMarket(id, winningOptionId);
      
      broadcast('market-resolved', { id, winningOptionId });
      broadcast('market-updated', { id, status: 'resolved', winningOptionId });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Resolution failed" });
    }
  });

  app.post("/api/markets/:id/claim", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { userAddress } = req.body;
      if (!userAddress) return res.status(400).json({ message: "userAddress required" });

      const payout = await storage.claimPayout(id, userAddress);
      broadcast('payout-claimed', { id, userAddress, payout });
      res.json({ ok: true, payout });
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Claim failed" });
    }
  });

  // --- Positions ---

  app.post("/api/positions", async (req, res) => {
    try {
      const { marketId, optionId, amount, userAddress } = req.body;
      
      if (!marketId || optionId === undefined || !amount || !userAddress) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const id = Number(marketId);
      const stake = Number(amount);

      if (isNaN(stake) || stake <= 0) {
        return res.status(400).json({ message: "Stake amount must be greater than 0" });
      }

      const user = await storage.getUser(userAddress);
      if (!user || Number(user.balance) < stake) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const market = await storage.getMarket(id);
      if (!market || market.status !== "open" || new Date(market.closeTime) <= new Date()) {
        return res.status(400).json({ message: "Market is closed or not found" });
      }

      const newBalance = (Number(user.balance) - stake).toFixed(6);
      await db.update(users).set({ balance: newBalance }).where(eq(users.address, userAddress));

      const position = await storage.createPosition({
        marketId: id,
        optionId: Number(optionId),
        amount: stake.toString(),
        userAddress: userAddress
      });

      broadcast('position-placed', { marketId: id, userAddress });
      res.status(201).json(position);
    } catch (err) {
      console.error("Trade error:", err);
      res.status(400).json({ message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.get("/api/positions/:address", async (req, res) => {
    const address = req.params.address;
    
    // Auto-resolve check when fetching positions
    const marketsList = await storage.getMarkets();
    const now = new Date();
    for (const m of marketsList) {
      if (m.status === "open" && new Date(m.closeTime) <= now) {
        const options = m.options || [];
        if (options.length > 0) {
          const winner = options.reduce((prev: any, current: any) => 
            (Number(prev.totalStaked) > Number(current.totalStaked)) ? prev : current
          );
          await storage.resolveMarket(m.id, winner.id);
        } else {
          await db.update(markets).set({ status: "closed" }).where(eq(markets.id, m.id));
        }
      } else if (m.status === "closed") {
        // Fallback for closed but not resolved markets
        const options = m.options || [];
        if (options.length > 0) {
          const winner = options.reduce((prev: any, current: any) => 
            (Number(prev.totalStaked) > Number(current.totalStaked)) ? prev : current
          );
          await storage.resolveMarket(m.id, winner.id);
        }
      }
    }

    const positions = await storage.getUserPositions(address);
    res.json(positions);
  });

  app.get("/api/positions/my/:address", async (req, res) => {
    const address = req.params.address;
    
    // Auto-resolve check for user's positions
    const marketsList = await storage.getMarkets();
    const now = new Date();
    for (const m of marketsList) {
      if ((m.status === "open" && new Date(m.closeTime) <= now) || m.status === "closed") {
        const options = m.options || [];
        if (options.length > 0) {
          const winner = options.reduce((prev: any, current: any) => 
            (Number(prev.totalStaked) > Number(current.totalStaked)) ? prev : current
          );
          await storage.resolveMarket(m.id, winner.id);
        } else if (m.status === "open") {
          await db.update(markets).set({ status: "closed" }).where(eq(markets.id, m.id));
        }
      }
    }

    const positions = await storage.getUserPositions(address);
    res.json(positions);
  });

  // --- Crypto Markets ---

  app.get("/api/crypto/markets", async (req, res) => {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,chainlink,polygon-ecosystem-token&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h");
      if (!response.ok) throw new Error("CoinGecko API error");
      const data = await response.json();
      
      // Clean and safe mapping
      const cleanedData = data.map((coin: any) => ({
        ...coin,
        current_price: coin.current_price ?? null,
        price_change_percentage_24h: coin.price_change_percentage_24h ?? null,
      }));
      
      res.json(cleanedData);
    } catch (err) {
      console.error("Crypto markets error:", err);
      res.status(503).json({ message: "Market data temporarily unavailable" });
    }
  });

  app.get("/api/crypto/:id/chart", async (req, res) => {
    try {
      const { id } = req.params;
      const days = req.query.days || "7";
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
      if (!response.ok) throw new Error("CoinGecko API error");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(503).json({ message: "Chart data temporarily unavailable" });
    }
  });

  app.get("/api/crypto/price", async (req, res) => {
    const symbol = (req.query.symbol as string)?.toLowerCase();
    if (!symbol) return res.status(400).json({ message: "Symbol required" });

    const prices: Record<string, number> = {
      btc: 95000, eth: 2500, sol: 150, link: 18, pol: 0.5
    };
    
    res.json({ symbol, priceUsd: prices[symbol] || 1.0 });
  });

  app.post("/api/trade", async (req, res) => {
    try {
      const { userId, symbol, side, amountToken } = req.body;
      if (!userId || !symbol || !side || !amountToken) {
        return res.status(400).json({ message: "Missing trade details" });
      }

      // Institutional asset trading is restricted
      const tokenSymbol = symbol.toUpperCase();
      const restrictedSymbols = ["BTC", "ETH", "SOL", "LINK", "POL", "MATIC"];
      if (restrictedSymbols.includes(tokenSymbol)) {
        return res.status(403).json({ 
          message: "Institutional asset trading is restricted to verified execution shards. Please use prediction markets for live trading." 
        });
      }

      const amount = Number(amountToken);
      const user = await storage.getOrCreateUser(userId);
      
      const prices: Record<string, number> = {
        LINERA: 1.25,
        MICRO: 0.85,
        SHARD: 2.10
      };

      if (!prices[tokenSymbol]) {
        return res.status(403).json({ message: "Trading for this asset is disabled on this shard" });
      }

      const price = prices[tokenSymbol];
      const costUSDC = amount * price;

      const holdings = (user as any).holdings || {};
      const currentTokenBalance = holdings[tokenSymbol] || 0;

      if (side === "buy") {
        if (Number(user.balance) < costUSDC) {
          return res.status(400).json({ message: "Insufficient USDC balance" });
        }
        const newBalance = (Number(user.balance) - costUSDC).toFixed(6);
        const newHoldings = { ...holdings, [tokenSymbol]: currentTokenBalance + amount };
        await db.update(users).set({ 
          balance: newBalance,
          holdings: JSON.stringify(newHoldings)
        } as any).where(eq(users.address, userId));
      } else {
        if (currentTokenBalance < amount) {
          return res.status(400).json({ message: `Insufficient ${tokenSymbol} balance` });
        }
        const newBalance = (Number(user.balance) + costUSDC).toFixed(6);
        const newHoldings = { ...holdings, [tokenSymbol]: currentTokenBalance - amount };
        await db.update(users).set({ 
          balance: newBalance,
          holdings: JSON.stringify(newHoldings)
        } as any).where(eq(users.address, userId));
      }

      broadcast('faucet-funded', { userId }); 
      res.json({ ok: true, side, symbol: tokenSymbol, amount, price });
    } catch (err) {
      console.error("Trade error:", err);
      res.status(500).json({ message: "Trade failed" });
    }
  });

  // --- Wallet & Faucet ---

  app.get("/api/wallet/me", async (req, res) => {
    try {
      const userId = req.query.userId as string || req.headers["x-user-id"] as string;
      if (!userId) return res.status(400).json({ message: "userId required" });
      
      const user = await storage.getOrCreateUser(userId);
      let holdings = {};
      try {
        holdings = typeof user.holdings === 'string' ? JSON.parse(user.holdings) : (user.holdings || {});
      } catch (e) {
        console.error("Failed to parse holdings:", e);
      }

      res.json({ 
        ok: true, 
        userId: user.address, 
        address: user.address, 
        balance: user.balance, 
        points: user.balance,
        holdings
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  app.post("/api/wallet/faucet", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.getOrCreateUser(userId);
      } else {
        const credit = amount !== undefined ? Number(amount) : 1000;
        const newBalance = (Number(user.balance) + credit).toFixed(6);
        await db.update(users).set({ balance: newBalance }).where(eq(users.address, userId));
        user = { ...user, balance: newBalance };
      }
      
      broadcast('faucet-funded', { userId });
      res.json({ ok: true, points: user.balance });
    } catch (err) {
      res.status(500).json({ message: "Transaction failed" });
    }
  });

  // --- Auth ---

  app.post(api.auth.connect.path, async (req, res) => {
    const { address } = req.body;
    const user = await storage.getOrCreateUser(address as string);
    res.json(user);
  });

  app.get(api.auth.me.path, async (req, res) => {
    const address = req.params.address as string;
    const user = await storage.getUser(address);
    res.json(user || null);
  });

  // --- Seeding ---
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getMarkets();
  if (existing.length === 0) {
    console.log("Seeding database...");
    
    // 1. Live Match Prediction
    await storage.createMarket({
      question: "Who will win the match: India vs Australia?",
      options: ["India", "Australia", "Draw"],
      closeTime: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
      creatorId: "mock-user",
      category: "Cricket"
    });

    // 2. Player Performance
    await storage.createMarket({
      question: "How many runs will Kohli score today?",
      options: ["0-30", "31-50", "51-99", "Century (100+)"],
      closeTime: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
      creatorId: "mock-user",
      category: "Cricket"
    });

    // 3. Toss Prediction
    await storage.createMarket({
      question: "Who will win the toss?",
      options: ["India", "Australia"],
      closeTime: new Date(Date.now() + 1000 * 60 * 30), // 30 mins from now
      creatorId: "mock-user",
      category: "Cricket"
    });
    
    console.log("Seeding complete.");
  }
}

import { db } from "./db";
import { markets, marketOptions, positions, users, type Market, type MarketOption, type Position, type User, type MarketWithDetail } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export class DatabaseStorage {
  async getOrCreateUser(address: string): Promise<User> {
    const [existing] = await db.select().from(users).where(eq(users.address, address));
    if (existing) return existing;
    const [user] = await db.insert(users).values({ 
      address,
      balance: "1000.000000",
      reputation: 100,
      holdings: {}
    }).returning();
    return user;
  }

  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address));
    return user;
  }

  async getMarkets(): Promise<any[]> {
    const all = await db.select().from(markets).orderBy(desc(markets.createdAt));
    const opts = await db.select().from(marketOptions);
    const pos = await db.select().from(positions);
    
    return all.map(m => ({
      ...m,
      options: opts.filter(o => o.marketId === m.id),
      totalPositions: pos.filter(p => p.marketId === m.id).length
    }));
  }

  async getMarket(id: number): Promise<any | null> {
    const [m] = await db.select().from(markets).where(eq(markets.id, id));
    if (!m) return null;
    const opts = await db.select().from(marketOptions).where(eq(marketOptions.marketId, id));
    const pos = await db.select().from(positions).where(eq(positions.marketId, id));
    return {
      ...m,
      options: opts,
      totalPositions: pos.length
    };
  }

  async createMarket(data: any): Promise<any> {
    const [m] = await db.insert(markets).values({
      question: data.question,
      description: data.description || "",
      category: data.category || "Cricket",
      bannerUrl: data.bannerUrl || null,
      closeTime: new Date(data.closeTime),
      creatorId: data.creatorId,
      status: "open",
    }).returning();

    const opts = [];
    for (const t of data.options) {
      const [o] = await db.insert(marketOptions).values({
        marketId: m.id,
        text: t,
        totalStaked: "0"
      }).returning();
      opts.push(o);
    }
    return { ...m, options: opts, totalPositions: 0 };
  }

  async createPosition(data: any): Promise<Position> {
    // 0. Check if market is closed
    const market = await this.getMarket(data.marketId);
    if (!market) {
      throw new Error("Market not found");
    }
    
    const isActuallyOpen = market.status === "open" && new Date(market.closeTime) > new Date();
    if (!isActuallyOpen) {
      throw new Error("Market is closed");
    }

    // 1. Check user balance
    const user = await this.getUser(data.userAddress);
    if (!user || Number(user.balance) < Number(data.amount)) {
      throw new Error("Insufficient balance");
    }

    // 2. Deduct balance
    const newBalance = (Number(user.balance) - Number(data.amount)).toFixed(6);
    await db.update(users).set({ balance: newBalance }).where(eq(users.address, data.userAddress));

    // 3. Create position
    const [p] = await db.insert(positions).values({
      ...data,
      status: "pending"
    }).returning();

    // 4. Update market option staking
    const [o] = await db.select().from(marketOptions).where(eq(marketOptions.id, data.optionId));
    if (o) {
      const newTotal = (Number(o.totalStaked) + Number(data.amount)).toFixed(6);
      await db.update(marketOptions).set({ totalStaked: newTotal }).where(eq(marketOptions.id, data.optionId));
    }

    // 5. Update market total liquidity
    const [m] = await db.select().from(markets).where(eq(markets.id, data.marketId));
    if (m) {
      const newLiquidity = (Number(m.totalLiquidity) + Number(data.amount)).toFixed(6);
      await db.update(markets).set({ totalLiquidity: newLiquidity }).where(eq(markets.id, data.marketId));
    }

    return p;
  }

  async getUserPositions(address: string) {
    const results = await db.select().from(positions).where(eq(positions.userAddress, address)).orderBy(desc(positions.createdAt));
    
    // Enrich with market data for real-time status check
    const enriched = [];
    for (const pos of results) {
      const market = await this.getMarket(pos.marketId);
      if (market && market.status === "resolved" && pos.status === "pending") {
        // This is a safety fallback in case resolveMarket missed a position
        const isWinner = pos.optionId === market.winningOptionId;
        const newStatus = isWinner ? "won" : "lost";
        await db.update(positions).set({ status: newStatus, settledAt: new Date() }).where(eq(positions.id, pos.id));
        enriched.push({ ...pos, status: newStatus, settledAt: new Date() });
      } else {
        enriched.push(pos);
      }
    }
    return enriched;
  }

  async resolveMarket(marketId: number, winningOptionId: number) {
    const [m] = await db.update(markets)
      .set({ status: "resolved", winningOptionId })
      .where(eq(markets.id, marketId))
      .returning();

    // Settlement logic
    const marketPositions = await db.select().from(positions).where(eq(positions.marketId, marketId));
    console.log(`Settling ${marketPositions.length} positions for market ${marketId}`);
    
    for (const pos of marketPositions) {
      const isWinner = pos.optionId === winningOptionId;
      const newStatus = isWinner ? "won" : "lost";
      console.log(`Updating position ${pos.id}: status=${newStatus}`);
      await db.update(positions)
        .set({ 
          status: newStatus,
          settledAt: new Date()
        })
        .where(eq(positions.id, pos.id));
    }
    return m;
  }

  async claimPayout(marketId: number, userAddress: string): Promise<string> {
    const market = await this.getMarket(marketId);
    if (!market || market.status !== "resolved") {
      throw new Error("Market not resolved");
    }

    const userPositions = await db.select().from(positions).where(
      and(
        eq(positions.marketId, marketId),
        eq(positions.userAddress, userAddress),
        eq(positions.claimed, false)
      )
    );

    if (userPositions.length === 0) {
      throw new Error("No unclaimed positions found");
    }

    const winners = userPositions.filter(p => p.optionId === market.winningOptionId);
    if (winners.length === 0) {
      // Mark as claimed even if not winners to avoid re-checking
      for (const p of userPositions) {
        await db.update(positions).set({ claimed: true }).where(eq(positions.id, p.id));
      }
      return "0";
    }

    const totalPool = Number(market.totalLiquidity);
    const winningOption = market.options.find((o: any) => o.id === market.winningOptionId);
    const winningPool = Number(winningOption?.totalStaked || 1);

    let totalPayout = 0;
    for (const p of winners) {
      const payout = (Number(p.amount) / winningPool) * totalPool;
      totalPayout += payout;
      await db.update(positions).set({ claimed: true }).where(eq(positions.id, p.id));
    }

    const user = await this.getOrCreateUser(userAddress);
    const newBalance = (Number(user.balance) + totalPayout).toFixed(6);
    await db.update(users).set({ balance: newBalance }).where(eq(users.address, userAddress));

    return totalPayout.toFixed(6);
  }

  async deleteMarket(id: number): Promise<boolean> {
    await db.delete(positions).where(eq(positions.marketId, id));
    await db.delete(marketOptions).where(eq(marketOptions.marketId, id));
    const [deleted] = await db.delete(markets).where(eq(markets.id, id)).returning();
    return !!deleted;
  }
}

export const storage = new DatabaseStorage();

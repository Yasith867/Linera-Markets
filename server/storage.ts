import { db } from "./db";
import {
  markets,
  marketOptions,
  positions,
  users,
  type MarketOption,
  type Position,
  type User,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Normalize DB user → runtime user
 * (handles JSON stored as text)
 */
function parseUser(u: User): User {
  return {
    ...u,
    holdings:
      typeof u.holdings === "string"
        ? JSON.parse(u.holdings)
        : u.holdings,
  };
}

export class DatabaseStorage {
  /* =========================
     USERS
  ========================= */

  async getOrCreateUser(address: string): Promise<User> {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.address, address));

    if (existing) return parseUser(existing);

    const [user] = await db
      .insert(users)
      .values({
        address,
        balance: "1000.000000",
        reputation: 100,
        holdings: JSON.stringify({}),
      })
      .returning();

    return parseUser(user);
  }

  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.address, address));

    return user ? parseUser(user) : undefined;
  }

  /* =========================
     MARKETS
  ========================= */

  async getMarkets(): Promise<any[]> {
    const all = await db
      .select()
      .from(markets)
      .orderBy(desc(markets.createdAt));

    const opts = await db.select().from(marketOptions);
    const pos = await db.select().from(positions);

    return all.map((m) => ({
      ...m,
      options: opts.filter((o) => o.marketId === m.id),
      totalPositions: pos.filter((p) => p.marketId === m.id).length,
    }));
  }

  async getMarket(id: number): Promise<any | null> {
    const [m] = await db
      .select()
      .from(markets)
      .where(eq(markets.id, id));

    if (!m) return null;

    const opts = await db
      .select()
      .from(marketOptions)
      .where(eq(marketOptions.marketId, id));

    const pos = await db
      .select()
      .from(positions)
      .where(eq(positions.marketId, id));

    return {
      ...m,
      options: opts,
      totalPositions: pos.length,
    };
  }

  async createMarket(data: any): Promise<any> {
    const [m] = await db
      .insert(markets)
      .values({
        question: data.question,
        description: data.description ?? "",
        category: data.category ?? "Cricket",
        bannerUrl: data.bannerUrl ?? null,
        closeTime: new Date(data.closeTime),
        creatorId: data.creatorId,
        status: "open",
      })
      .returning();

    const opts: MarketOption[] = [];

    for (const text of data.options) {
      const [o] = await db
        .insert(marketOptions)
        .values({
          marketId: m.id,
          text,
          totalStaked: "0",
        })
        .returning();

      opts.push(o);
    }

    return { ...m, options: opts, totalPositions: 0 };
  }

  /* =========================
     POSITIONS
  ========================= */

  async createPosition(data: any): Promise<Position> {
    const market = await this.getMarket(data.marketId);
    if (!market) throw new Error("Market not found");

    const isOpen =
      market.status === "open" &&
      new Date(market.closeTime) > new Date();

    if (!isOpen) throw new Error("Market is closed");

    const user = await this.getUser(data.userAddress);
    if (!user || Number(user.balance) < Number(data.amount)) {
      throw new Error("Insufficient balance");
    }

    const newBalance = (
      Number(user.balance) - Number(data.amount)
    ).toFixed(6);

    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.address, data.userAddress));

    const [p] = await db
      .insert(positions)
      .values({
        marketId: data.marketId,
        optionId: data.optionId,
        userAddress: data.userAddress,
        amount: data.amount,
        status: "pending",
        claimed: false,
      })
      .returning();

    const [o] = await db
      .select()
      .from(marketOptions)
      .where(eq(marketOptions.id, data.optionId));

    if (o) {
      const newTotal = (
        Number(o.totalStaked) + Number(data.amount)
      ).toFixed(6);

      await db
        .update(marketOptions)
        .set({ totalStaked: newTotal })
        .where(eq(marketOptions.id, data.optionId));
    }

    const [m] = await db
      .select()
      .from(markets)
      .where(eq(markets.id, data.marketId));

    if (m) {
      const newLiquidity = (
        Number(m.totalLiquidity) + Number(data.amount)
      ).toFixed(6);

      await db
        .update(markets)
        .set({ totalLiquidity: newLiquidity })
        .where(eq(markets.id, data.marketId));
    }

    return p;
  }

  /* =========================
     SETTLEMENT
  ========================= */

  async resolveMarket(marketId: number, winningOptionId: number) {
    const [m] = await db
      .update(markets)
      .set({ status: "resolved", winningOptionId })
      .where(eq(markets.id, marketId))
      .returning();

    const marketPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.marketId, marketId));

    for (const pos of marketPositions) {
      await db
        .update(positions)
        .set({
          status:
            pos.optionId === winningOptionId ? "won" : "lost",
          settledAt: new Date(),
        })
        .where(eq(positions.id, pos.id));
    }

    return m;
  }

  async claimPayout(
    marketId: number,
    userAddress: string
  ): Promise<string> {
    const market = await this.getMarket(marketId);
    if (!market || market.status !== "resolved") {
      throw new Error("Market not resolved");
    }

    const userPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.marketId, marketId),
          eq(positions.userAddress, userAddress),
          eq(positions.claimed, false)
        )
      );

    if (userPositions.length === 0) {
      throw new Error("No unclaimed positions found");
    }

    const winners = userPositions.filter(
      (p) => p.optionId === market.winningOptionId
    );

    const totalPool = Number(market.totalLiquidity);
    const winningOption = market.options.find(
      (o: any) => o.id === market.winningOptionId
    );
    const winningPool = Number(winningOption?.totalStaked || 1);

    let payoutTotal = 0;
    for (const p of winners) {
      payoutTotal += (Number(p.amount) / winningPool) * totalPool;
    }

    for (const p of userPositions) {
      await db
        .update(positions)
        .set({ claimed: true })
        .where(eq(positions.id, p.id));
    }

    const user = await this.getOrCreateUser(userAddress);
    const newBalance = (
      Number(user.balance) + payoutTotal
    ).toFixed(6);

    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.address, userAddress));

    return payoutTotal.toFixed(6);
  }

  async deleteMarket(id: number): Promise<boolean> {
    await db.delete(positions).where(eq(positions.marketId, id));
    await db
      .delete(marketOptions)
      .where(eq(marketOptions.marketId, id));

    const [deleted] = await db
      .delete(markets)
      .where(eq(markets.id, id))
      .returning();

    return !!deleted;
  }
}

export const storage = new DatabaseStorage();

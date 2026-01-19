import { pgTable, text, serial, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Tables ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  balance: decimal("balance", { precision: 20, scale: 6 }).default("1000.000000").notNull(),
  reputation: integer("reputation").default(100).notNull(),
  holdings: text("holdings"), // JSON string or simple text for demo
});

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  description: text("description"),
  category: text("category").default("Cricket").notNull(),
  bannerUrl: text("banner_url"),
  closeTime: timestamp("close_time").notNull(),
  // open -> closed (at deadline) -> resolved (admin/oracle) -> finalized (after all claims)
  status: text("status", { enum: ["open", "closed", "resolved", "finalized", "disputed"] }).default("open").notNull(),
  winningOptionId: integer("winning_option_id"),
  creatorId: text("creator_id").notNull(),
  totalLiquidity: decimal("total_liquidity", { precision: 20, scale: 6 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketOptions = pgTable("market_options", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull(),
  text: text("text").notNull(),
  totalStaked: decimal("total_staked", { precision: 20, scale: 6 }).default("0").notNull(),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull(),
  optionId: integer("option_id").notNull(),
  userAddress: text("user_address").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }).notNull(),
  status: text("status").default("pending").notNull(),
  settledAt: timestamp("settled_at"),
  claimed: boolean("claimed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Schemas ---

export const insertMarketSchema = createInsertSchema(markets)
  .omit({ id: true, createdAt: true, winningOptionId: true, status: true, totalLiquidity: true })
  .extend({
    question: z.string().min(10, "Question must be at least 10 characters long"),
    options: z.array(z.string().min(1, "Option text cannot be empty")).min(2, "At least two options are required").max(6, "Maximum 6 options allowed"),
    closeTime: z.coerce.date().refine((d) => d > new Date(), { message: "Close time must be in the future" }),
  });

export const insertPositionSchema = createInsertSchema(positions)
  .omit({ id: true, createdAt: true, claimed: true })
  .extend({
    amount: z.coerce.string().refine((val) => Number(val) > 0, { message: "Stake amount must be greater than 0" }),
  });

// --- Types ---

export type Market = typeof markets.$inferSelect;
export type MarketOption = typeof marketOptions.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type User = typeof users.$inferSelect;

export type MarketWithDetail = Market & {
  options: MarketOption[];
  totalPositions: number;
};

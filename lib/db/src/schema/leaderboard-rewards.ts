import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const leaderboardRewardsTable = pgTable("leaderboard_rewards", {
  id: serial("id").primaryKey(),
  boardType: varchar("board_type").notNull(),
  periodKey: varchar("period_key").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeaderboardReward = typeof leaderboardRewardsTable.$inferSelect;

import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  achievementKey: varchar("achievement_key").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserAchievement = typeof userAchievementsTable.$inferSelect;

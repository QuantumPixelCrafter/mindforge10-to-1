import { integer, pgEnum, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const gameTypeEnum = pgEnum("game_type", ["memory-match", "bubble-pop", "quiz", "math-blitz-easy", "math-blitz-normal", "math-blitz-hard"]);

export const scoresTable = pgTable("scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameType: gameTypeEnum("game_type").notNull(),
  score: integer("score").notNull(),
  subject: varchar("subject"),
  userLevel: varchar("user_level"),
  weekKey: varchar("week_key"),
  monthKey: varchar("month_key"),
  secondsTaken: integer("seconds_taken"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InsertScore = typeof scoresTable.$inferInsert;
export type Score = typeof scoresTable.$inferSelect;

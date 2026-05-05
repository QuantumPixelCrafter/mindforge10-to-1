import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userStreaksTable = pgTable("user_streaks", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  lastQuizDate: varchar("last_quiz_date"),
});

export type UserStreak = typeof userStreaksTable.$inferSelect;

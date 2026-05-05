import { pgTable, text, serial, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  deadline: timestamp("deadline").notNull(),
  completed: boolean("completed").notNull().default(false),
  overdueNotified: boolean("overdue_notified").notNull().default(false),
  reminderNotified: boolean("reminder_notified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;

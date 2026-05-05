import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const reviewItemsTable = pgTable("review_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 10 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  userAnswer: integer("user_answer"),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReviewItem = typeof reviewItemsTable.$inferSelect;
export type InsertReviewItem = typeof reviewItemsTable.$inferInsert;

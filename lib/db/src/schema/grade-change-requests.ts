import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const gradeChangeRequestsTable = pgTable("grade_change_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  country: varchar("country", { length: 10 }).notNull(),
  currentGradeIndex: integer("current_grade_index").notNull(),
  requestedGradeIndex: integer("requested_grade_index").notNull(),
  currentGradeName: varchar("current_grade_name", { length: 200 }).notNull(),
  requestedGradeName: varchar("requested_grade_name", { length: 200 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GradeChangeRequest = typeof gradeChangeRequestsTable.$inferSelect;
export type InsertGradeChangeRequest = typeof gradeChangeRequestsTable.$inferInsert;

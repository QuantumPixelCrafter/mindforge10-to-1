import { sql } from "drizzle-orm";
import { pgTable, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const inboxMessagesTable = pgTable("inbox_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().default("points"),
  points: integer("points").default(0),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("none"),
  targetUserId: varchar("target_user_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InboxMessage = typeof inboxMessagesTable.$inferSelect;
export type InsertInboxMessage = typeof inboxMessagesTable.$inferInsert;

import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./auth";

export const chatAttachmentsTable = pgTable("chat_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  contentType: varchar("content_type", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 500 }),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatAttachment = typeof chatAttachmentsTable.$inferSelect;

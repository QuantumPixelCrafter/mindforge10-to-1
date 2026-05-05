import { pgTable, serial, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
  deletedForSender: boolean("deleted_for_sender").notNull().default(false),
  deletedForReceiver: boolean("deleted_for_receiver").notNull().default(false),
  deletedForEveryone: boolean("deleted_for_everyone").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;

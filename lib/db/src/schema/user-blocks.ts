import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userBlocksTable = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: varchar("blocker_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedId: varchar("blocked_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserBlock = typeof userBlocksTable.$inferSelect;

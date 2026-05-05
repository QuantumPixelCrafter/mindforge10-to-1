import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userInventoryTable = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemKey: varchar("item_key").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserInventoryItem = typeof userInventoryTable.$inferSelect;

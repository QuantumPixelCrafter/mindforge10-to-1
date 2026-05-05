import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userPowerupsTable = pgTable("user_powerups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPowerup = typeof userPowerupsTable.$inferSelect;

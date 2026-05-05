import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending | accepted | declined
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Friendship = typeof friendshipsTable.$inferSelect;

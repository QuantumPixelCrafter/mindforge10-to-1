import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const stripeClaimedSessionsTable = pgTable("stripe_claimed_sessions", {
  sessionId: varchar("session_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

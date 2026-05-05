import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  passwordHash: varchar("password_hash"),
  level: varchar("level"),
  pointsSpent: integer("points_spent").notNull().default(0),
  equippedBackground: varchar("equipped_background"),
  equippedFrame: varchar("equipped_frame"),
  equippedNametag: varchar("equipped_nametag"),
  equippedTitle: varchar("equipped_title"),
  xp: integer("xp").notNull().default(0),
  gameLevel: integer("game_level").notNull().default(1),
  bonusPoints: integer("bonus_points").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  showNameOnLeaderboard: boolean("show_name_on_leaderboard").notNull().default(true),
  showNameInSearch: boolean("show_name_in_search").notNull().default(true),
  allowProfileView: boolean("allow_profile_view").notNull().default(true),
  isDeveloper: boolean("is_developer").notNull().default(false),
  devMode: boolean("dev_mode").notNull().default(false),
  lastRetryPassGrantAt: timestamp("last_retry_pass_grant_at", { withTimezone: true }),
  giftCooldownEndsAt: timestamp("gift_cooldown_ends_at", { withTimezone: true }),
  chatPointWarningThreshold: integer("chat_point_warning_threshold"),
  goalReminderDays: integer("goal_reminder_days"),
  country: varchar("country", { length: 10 }),
  gradeIndex: integer("grade_index"),
  gradeSchoolYear: integer("grade_school_year"),
  preferredLanguage: varchar("preferred_language", { length: 10 }),
  stripeCustomerId: varchar("stripe_customer_id"),
  freeMessages: integer("free_messages").notNull().default(0),
  receiveStrangerMessages: boolean("receive_stranger_messages").notNull().default(false),
  shopDiscountPct: integer("shop_discount_pct"),
  shopDiscountExpiresAt: timestamp("shop_discount_expires_at", { withTimezone: true }),
  shopDiscountUsesLeft: integer("shop_discount_uses_left"),
  usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const moodsTable = pgTable("moods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMoodSchema = createInsertSchema(moodsTable).omit({ id: true, createdAt: true, userId: true });
export type InsertMood = z.infer<typeof insertMoodSchema>;
export type Mood = typeof moodsTable.$inferSelect;

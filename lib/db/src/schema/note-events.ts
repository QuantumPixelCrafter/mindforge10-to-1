import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const noteEventsTable = pgTable("note_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type NoteEvent = typeof noteEventsTable.$inferSelect;

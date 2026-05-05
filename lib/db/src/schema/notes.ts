import { pgTable, text, serial, timestamp, integer, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { usersTable } from "./auth";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").notNull().default(false),
  moderationStatus: varchar("moderation_status"),
  moderationNote: text("moderation_note"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;

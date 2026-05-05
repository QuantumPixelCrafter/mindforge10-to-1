import { Router, type IRouter } from "express";
import { db, notesTable, subjectsTable, usersTable, noteEventsTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
  GetNoteParams,
  ListNotesQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const NOTE_SELECT = {
  id: notesTable.id,
  userId: notesTable.userId,
  title: notesTable.title,
  content: notesTable.content,
  subjectId: notesTable.subjectId,
  subjectName: subjectsTable.name,
  isPublic: notesTable.isPublic,
  moderationStatus: notesTable.moderationStatus,
  moderationNote: notesTable.moderationNote,
  lastUsedAt: notesTable.lastUsedAt,
  createdAt: notesTable.createdAt,
  updatedAt: notesTable.updatedAt,
};

router.get("/notes", async (req, res) => {
  const query = ListNotesQueryParams.parse(req.query);
  const userId = req.isAuthenticated() ? (req.user as any).id : null;

  const userCondition = userId ? eq(notesTable.userId, userId) : undefined;
  const subjectCondition = query.subjectId ? eq(notesTable.subjectId, query.subjectId) : undefined;

  const conditions =
    userCondition && subjectCondition
      ? and(userCondition, subjectCondition)
      : userCondition ?? subjectCondition;

  const notes = await db
    .select(NOTE_SELECT)
    .from(notesTable)
    .leftJoin(subjectsTable, eq(notesTable.subjectId, subjectsTable.id))
    .where(conditions)
    .orderBy(notesTable.updatedAt);

  res.json(notes);
});

router.get("/notes/community", async (req, res) => {
  const rows = await db
    .select({
      ...NOTE_SELECT,
      authorUsername: usersTable.username,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorProfileImageUrl: usersTable.profileImageUrl,
    })
    .from(notesTable)
    .leftJoin(subjectsTable, eq(notesTable.subjectId, subjectsTable.id))
    .leftJoin(usersTable, eq(notesTable.userId, usersTable.id))
    .where(and(eq(notesTable.isPublic, true), eq(notesTable.moderationStatus as any, "approved")))
    .orderBy(notesTable.updatedAt);

  res.json(
    rows.map(r => ({
      ...r,
      authorName: [r.authorFirstName, r.authorLastName].filter(Boolean).join(" ") || r.authorUsername || "Anonymous",
    }))
  );
});

router.post("/notes", async (req, res) => {
  const body = CreateNoteBody.parse(req.body);
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  const [note] = await db
    .insert(notesTable)
    .values({ ...body, userId, updatedAt: new Date() })
    .returning();
  if (userId) {
    await db.insert(noteEventsTable).values({ userId }).catch(() => {});
  }
  res.status(201).json({ ...note, subjectName: null });
});

router.get("/notes/:id", async (req, res) => {
  const { id } = GetNoteParams.parse(req.params);
  const [note] = await db
    .select(NOTE_SELECT)
    .from(notesTable)
    .leftJoin(subjectsTable, eq(notesTable.subjectId, subjectsTable.id))
    .where(eq(notesTable.id, id));

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  await db
    .update(notesTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(notesTable.id, id));

  res.json(note);
});

router.put("/notes/:id", async (req, res) => {
  const { id } = UpdateNoteParams.parse(req.params);
  const body = UpdateNoteBody.parse(req.body);
  const [note] = await db
    .update(notesTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(notesTable.id, id))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json({ ...note, subjectName: null });
});

router.post("/notes/:id/publish", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = req.user as any;
  if (!user.isPublic) {
    res.status(403).json({ error: "Only users with a public account can share notes publicly." });
    return;
  }

  const noteId = parseInt(req.params.id, 10);
  if (isNaN(noteId)) {
    res.status(400).json({ error: "Invalid note ID" });
    return;
  }

  const [note] = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, noteId))
    .limit(1);

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  await db
    .update(notesTable)
    .set({ isPublic: true, moderationStatus: "pending", moderationNote: null, updatedAt: new Date() })
    .where(eq(notesTable.id, noteId));

  moderateNote(noteId, note.title, note.content).catch(() => {});

  res.json({ status: "pending", message: "Your note has been submitted for review. It will appear in Community Notes once approved." });
});

router.delete("/notes/:id/unpublish", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const noteId = parseInt(req.params.id, 10);
  if (isNaN(noteId)) {
    res.status(400).json({ error: "Invalid note ID" });
    return;
  }

  await db
    .update(notesTable)
    .set({ isPublic: false, moderationStatus: null, moderationNote: null, updatedAt: new Date() })
    .where(eq(notesTable.id, noteId));

  res.json({ success: true });
});

router.delete("/notes/:id", async (req, res) => {
  const { id } = DeleteNoteParams.parse(req.params);
  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.status(204).send();
});

async function moderateNote(noteId: number, title: string, content: string) {
  try {
    const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content moderator for an educational student notes platform. Review the provided note and decide if it should be approved for public sharing.

Approve if the note:
- Contains legitimate educational/study content
- Is appropriate for students of all ages
- Is free from hate speech, adult content, or harmful material
- Is factually reasonable (does not spread misinformation)
- Is reasonably unbiased and neutral
- Matches what the title suggests

Reject if the note:
- Contains inappropriate, offensive, or harmful content
- Spreads clear misinformation
- Is completely unrelated to what the title claims
- Is spam, nonsense, or placeholder text

Respond ONLY with valid JSON: { "decision": "approved" | "rejected", "reason": "<brief reason>" }`,
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent: ${plainText.slice(0, 2000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let decision = "rejected";
    let reason = "Could not be verified.";
    try {
      const parsed = JSON.parse(raw);
      if (parsed.decision === "approved" || parsed.decision === "rejected") {
        decision = parsed.decision;
        reason = parsed.reason ?? reason;
      }
    } catch {}

    await db
      .update(notesTable)
      .set({ moderationStatus: decision, moderationNote: reason, updatedAt: new Date() })
      .where(eq(notesTable.id, noteId));
  } catch (err) {
    await db
      .update(notesTable)
      .set({ moderationStatus: "rejected", moderationNote: "Moderation failed. Please try again later.", updatedAt: new Date() })
      .where(eq(notesTable.id, noteId));
  }
}

export default router;

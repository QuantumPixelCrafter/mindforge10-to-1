import { Router } from "express";
import { db, reviewItemsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/review", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const items = await db
    .select()
    .from(reviewItemsTable)
    .where(eq(reviewItemsTable.userId, userId))
    .orderBy(desc(reviewItemsTable.createdAt));
  res.json({ items });
});

router.post("/review", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const { level, subject, topic, difficulty, wrongAnswers } = req.body;
  if (!level || !subject || !topic || !difficulty || !Array.isArray(wrongAnswers) || wrongAnswers.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const rows = wrongAnswers.map((wa: {
    question: string; options: string[]; correctAnswer: number; userAnswer: number; explanation?: string;
  }) => ({
    userId,
    level,
    subject,
    topic,
    difficulty,
    question: wa.question,
    options: wa.options,
    correctAnswer: wa.correctAnswer,
    userAnswer: wa.userAnswer,
    explanation: wa.explanation ?? null,
  }));
  const inserted = await db.insert(reviewItemsTable).values(rows).returning();
  res.json({ inserted: inserted.length });
});

router.delete("/review/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(reviewItemsTable).where(and(eq(reviewItemsTable.id, id), eq(reviewItemsTable.userId, userId)));
  res.json({ ok: true });
});

export default router;

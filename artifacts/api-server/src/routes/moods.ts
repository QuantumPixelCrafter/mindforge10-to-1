import { Router, type IRouter } from "express";
import { db, moodsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { CreateMoodBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/moods", async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  const moods = await db
    .select()
    .from(moodsTable)
    .where(userId ? eq(moodsTable.userId, userId) : undefined)
    .orderBy(desc(moodsTable.createdAt))
    .limit(30);
  res.json(moods);
});

router.post("/moods", async (req, res) => {
  const body = CreateMoodBody.parse(req.body);
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  const [mood] = await db.insert(moodsTable).values({ ...body, userId }).returning();
  res.status(201).json(mood);
});

router.delete("/moods/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = (req.user as any).id;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid mood ID" });
    return;
  }
  const [deleted] = await db
    .delete(moodsTable)
    .where(and(eq(moodsTable.id, id), eq(moodsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Mood not found or not yours" });
    return;
  }
  res.status(204).send();
});

export default router;

import { Router, type IRouter } from "express";
import { db, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateSubjectBody,
  UpdateSubjectBody,
  UpdateSubjectParams,
  DeleteSubjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/subjects", async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  if (!userId) {
    res.json([]);
    return;
  }
  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.userId, userId))
    .orderBy(subjectsTable.createdAt);
  res.json(subjects);
});

router.post("/subjects", async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = CreateSubjectBody.parse(req.body);
  const [subject] = await db
    .insert(subjectsTable)
    .values({ ...body, userId })
    .returning();
  res.status(201).json(subject);
});

router.put("/subjects/:id", async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { id } = UpdateSubjectParams.parse(req.params);
  const body = UpdateSubjectBody.parse(req.body);
  const [subject] = await db
    .update(subjectsTable)
    .set(body)
    .where(and(eq(subjectsTable.id, id), eq(subjectsTable.userId, userId)))
    .returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(subject);
});

router.delete("/subjects/:id", async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any).id : null;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { id } = DeleteSubjectParams.parse(req.params);
  await db
    .delete(subjectsTable)
    .where(and(eq(subjectsTable.id, id), eq(subjectsTable.userId, userId)));
  res.status(204).send();
});

export default router;

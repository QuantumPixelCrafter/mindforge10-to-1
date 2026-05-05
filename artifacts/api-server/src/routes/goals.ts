import { Router, type IRouter } from "express";
import { db, goalsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  CreateGoalBody,
  UpdateGoalBody,
  UpdateGoalParams,
  DeleteGoalParams,
} from "@workspace/api-zod";
import { awardXp } from "../lib/xp";

const router: IRouter = Router();

router.get("/goals", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.id : null;
  const goals = await db
    .select()
    .from(goalsTable)
    .where(userId ? eq(goalsTable.userId, userId) : undefined)
    .orderBy(goalsTable.deadline);
  res.json(goals);
});

router.post("/goals", async (req, res) => {
  const body = CreateGoalBody.parse(req.body);
  const userId = req.isAuthenticated() ? req.user.id : null;
  const [goal] = await db
    .insert(goalsTable)
    .values({ ...body, userId })
    .returning();
  res.status(201).json(goal);
});

router.put("/goals/:id", async (req, res) => {
  const { id } = UpdateGoalParams.parse(req.params);
  const body = UpdateGoalBody.parse(req.body);
  const userId = req.isAuthenticated() ? req.user.id : null;

  // Scope lookup to the authenticated user (if available)
  const conditions = userId
    ? and(eq(goalsTable.id, id), eq(goalsTable.userId, userId))
    : eq(goalsTable.id, id);

  const [existing] = await db.select().from(goalsTable).where(conditions).limit(1);
  const justCompleted = body.completed === true && existing && !existing.completed;

  const [goal] = await db
    .update(goalsTable)
    .set(body)
    .where(conditions)
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  let xpAwarded: number | null = null;
  let levelUp: { leveledUp: boolean; newLevel: number } | null = null;

  if (justCompleted && req.isAuthenticated()) {
    try {
      const result = await awardXp(req.user.id, 20);
      xpAwarded = 20;
      levelUp = { leveledUp: result.leveledUp, newLevel: result.newLevel };
    } catch {}
  }

  res.json({ ...goal, xpAwarded, levelUp });
});

router.delete("/goals/:id", async (req, res) => {
  const { id } = DeleteGoalParams.parse(req.params);
  const userId = req.isAuthenticated() ? req.user.id : null;
  const conditions = userId
    ? and(eq(goalsTable.id, id), eq(goalsTable.userId, userId))
    : eq(goalsTable.id, id);
  await db.delete(goalsTable).where(conditions);
  res.status(204).send();
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, userStreaksTable, userPowerupsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

async function getOrCreateStreak(userId: string) {
  const [existing] = await db
    .select()
    .from(userStreaksTable)
    .where(eq(userStreaksTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(userStreaksTable)
    .values({ userId, currentStreak: 0, lastQuizDate: null })
    .returning();
  return created;
}

async function getFreezesAvailable(userId: string): Promise<number> {
  const [row] = await db
    .select({ quantity: userPowerupsTable.quantity })
    .from(userPowerupsTable)
    .where(and(
      eq(userPowerupsTable.userId, userId),
      eq(userPowerupsTable.type, "streak_freeze"),
    ));
  return row?.quantity ?? 0;
}

async function consumeFreeze(userId: string) {
  await db
    .update(userPowerupsTable)
    .set({ quantity: sql`quantity - 1`, updatedAt: new Date() })
    .where(and(
      eq(userPowerupsTable.userId, userId),
      eq(userPowerupsTable.type, "streak_freeze"),
      sql`quantity > 0`,
    ));
}

async function awardStreakBonus(userId: string, bonus: number) {
  if (bonus <= 0) return;
  await db
    .update(usersTable)
    .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${bonus}`, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

// GET /api/streaks/me
router.get("/streaks/me", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  const streak = await getOrCreateStreak(req.user.id);
  const freezesAvailable = await getFreezesAvailable(req.user.id);
  res.json({ currentStreak: streak.currentStreak, lastQuizDate: streak.lastQuizDate, freezesAvailable });
});

// POST /api/streaks/record — call once per quiz completion
router.post("/streaks/record", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const today = todayUTC();

  const streak = await getOrCreateStreak(userId);
  const last = streak.lastQuizDate;

  // Already recorded today — no change
  if (last === today) {
    return res.json({
      isFirstToday: false,
      currentStreak: streak.currentStreak,
      streakBonus: 0,
      bonusAwarded: false,
    });
  }

  const daysSince = last ? daysBetween(last, today) : null;

  // First ever quiz, or missed 3+ days → reset to 1
  if (daysSince === null || daysSince >= 3) {
    await db
      .update(userStreaksTable)
      .set({ currentStreak: 1, lastQuizDate: today })
      .where(eq(userStreaksTable.userId, userId));
    return res.json({
      isFirstToday: true,
      currentStreak: 1,
      streakBonus: 0,
      bonusAwarded: false,
      streakReset: daysSince !== null,
    });
  }

  // Consecutive day (daysSince === 1)
  if (daysSince === 1) {
    const newStreak = streak.currentStreak + 1;
    const bonus = 5 * (newStreak - 1);
    await db
      .update(userStreaksTable)
      .set({ currentStreak: newStreak, lastQuizDate: today })
      .where(eq(userStreaksTable.userId, userId));
    await awardStreakBonus(userId, bonus);
    return res.json({
      isFirstToday: true,
      currentStreak: newStreak,
      streakBonus: bonus,
      bonusAwarded: true,
    });
  }

  // Missed exactly 1 day (daysSince === 2)
  const freezesAvailable = await getFreezesAvailable(userId);
  if (freezesAvailable > 0) {
    // Ask the user — don't update streak yet
    return res.json({
      isFirstToday: true,
      requiresFreezeDecision: true,
      freezesAvailable,
      currentStreak: streak.currentStreak,
      streakIfFrozen: streak.currentStreak + 1,
      streakBonusIfFrozen: 5 * streak.currentStreak,
    });
  }

  // No freeze available — reset
  await db
    .update(userStreaksTable)
    .set({ currentStreak: 1, lastQuizDate: today })
    .where(eq(userStreaksTable.userId, userId));
  return res.json({
    isFirstToday: true,
    currentStreak: 1,
    streakBonus: 0,
    bonusAwarded: false,
    streakReset: true,
  });
});

// POST /api/streaks/freeze-respond — { useFreeze: boolean }
router.post("/streaks/freeze-respond", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const { useFreeze } = req.body;
  const today = todayUTC();

  const streak = await getOrCreateStreak(userId);
  const last = streak.lastQuizDate;
  const daysSince = last ? daysBetween(last, today) : null;

  // Validate that the freeze situation is still valid
  if (daysSince !== 2) {
    return res.status(400).json({ error: "Freeze decision no longer applicable" });
  }

  if (useFreeze) {
    const freezes = await getFreezesAvailable(userId);
    if (freezes <= 0) {
      return res.status(400).json({ error: "No streak freezes available" });
    }
    await consumeFreeze(userId);
    const newStreak = streak.currentStreak + 1;
    const bonus = 5 * streak.currentStreak;
    await db
      .update(userStreaksTable)
      .set({ currentStreak: newStreak, lastQuizDate: today })
      .where(eq(userStreaksTable.userId, userId));
    await awardStreakBonus(userId, bonus);
    return res.json({
      currentStreak: newStreak,
      streakBonus: bonus,
      bonusAwarded: true,
      freezeUsed: true,
    });
  } else {
    await db
      .update(userStreaksTable)
      .set({ currentStreak: 1, lastQuizDate: today })
      .where(eq(userStreaksTable.userId, userId));
    return res.json({
      currentStreak: 1,
      streakBonus: 0,
      bonusAwarded: false,
      freezeUsed: false,
      streakReset: true,
    });
  }
});

export default router;

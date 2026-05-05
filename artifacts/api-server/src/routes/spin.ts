import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, userPowerupsTable, userInventoryTable, userAchievementsTable } from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { ACHIEVEMENTS, getWeekKey, getMonthKey } from "../lib/achievements";

const router: IRouter = Router();

// ── Reward definitions ────────────────────────────────────────────────────────
// Weights sum to 10200 (matching user-specified percentages * 100)
const WHEEL_SEGMENTS = [
  { id: "grand_prize",     weight: 5,    label: "20,000 pts + 🍀 Luckiest Person" },
  { id: "streak_freezes",  weight: 100,  label: "5 Streak Freezes" },
  { id: "objective_pass",  weight: 100,  label: "Objective Pass" },
  { id: "free_spins",      weight: 500,  label: "5 Free Spins" },
  { id: "discount_50",     weight: 795,  label: "50% Shop Discount (10 min)" },
  { id: "discount_25",     weight: 900,  label: "25% Shop Discount (10 min)" },
  { id: "pts_5000",        weight: 1000, label: "5,000 Points" },
  { id: "pts_2000",        weight: 1300, label: "2,000 Points" },
  { id: "pts_tier9",       weight: 1800, label: "1,500–1,990 Points" },
  { id: "pts_tier10",      weight: 2400, label: "1,000–1,490 Points" },
  { id: "pts_tier11",      weight: 600,  label: "500–990 Points" },
  { id: "pts_tier12",      weight: 400,  label: "10–490 Points" },
] as const;

type SegmentId = (typeof WHEEL_SEGMENTS)[number]["id"];

const TOTAL_WEIGHT = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

function pickSegment(): SegmentId {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const seg of WHEEL_SEGMENTS) {
    rand -= seg.weight;
    if (rand <= 0) return seg.id;
  }
  return WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1].id;
}

function randPts(min: number, max: number, step: number): number {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

async function getOrCreatePowerup(userId: string, type: string) {
  const [existing] = await db.select().from(userPowerupsTable)
    .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, type)));
  if (existing) return existing;
  const [created] = await db.insert(userPowerupsTable).values({ userId, type, quantity: 0 }).returning();
  return created;
}

async function awardObjectivePass(userId: string): Promise<number> {
  const now = new Date();
  const weekKey  = getWeekKey(now);
  const monthKey = getMonthKey(now);

  const weeklyAndMonthly = ACHIEVEMENTS.filter(
    a => a.periodic === "weekly" || a.periodic === "monthly"
  );

  const currentPeriodKeys = weeklyAndMonthly.map(a =>
    `${a.key}__${a.periodic === "weekly" ? weekKey : monthKey}`
  );

  const alreadyEarned = await db
    .select({ achievementKey: userAchievementsTable.achievementKey })
    .from(userAchievementsTable)
    .where(and(
      eq(userAchievementsTable.userId, userId),
      inArray(userAchievementsTable.achievementKey, currentPeriodKeys),
    ));

  const earnedSet = new Set(alreadyEarned.map(r => r.achievementKey));

  const toAward = weeklyAndMonthly
    .map(a => ({
      a,
      key: `${a.key}__${a.periodic === "weekly" ? weekKey : monthKey}`,
    }))
    .filter(({ key }) => !earnedSet.has(key));

  if (toAward.length === 0) return 0;

  await db.insert(userAchievementsTable)
    .values(toAward.map(({ key }) => ({ userId, achievementKey: key })))
    .onConflictDoNothing();

  const totalPoints = toAward.reduce((sum, { a }) => sum + a.points, 0);
  return totalPoints;
}

// GET /api/spin/segments — wheel layout for the frontend
router.get("/spin/segments", (_req, res) => {
  res.json({ segments: WHEEL_SEGMENTS, totalWeight: TOTAL_WEIGHT });
});

// POST /api/spin/wheel — consume 1 spinning_voucher, resolve reward
router.post("/spin/wheel", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;

  const voucherRow = await getOrCreatePowerup(userId, "spinning_voucher");
  if (voucherRow.quantity <= 0) {
    return res.status(400).json({ error: "No spinning vouchers available" });
  }

  // Consume voucher first
  await db.update(userPowerupsTable)
    .set({ quantity: voucherRow.quantity - 1, updatedAt: new Date() })
    .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "spinning_voucher")));

  const segmentId = pickSegment();
  let rewardDescription = "";
  let bonusPts = 0;

  switch (segmentId) {
    case "grand_prize": {
      bonusPts = 20000;
      await db.update(usersTable)
        .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${bonusPts}`, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
      // Grant tag_luckiest to inventory
      await db.insert(userInventoryTable)
        .values({ userId, itemKey: "tag_luckiest" })
        .onConflictDoNothing();
      rewardDescription = "20,000 pts + 🍀 Luckiest Person nametag";
      break;
    }
    case "streak_freezes": {
      const row = await getOrCreatePowerup(userId, "streak_freeze");
      await db.update(userPowerupsTable)
        .set({ quantity: row.quantity + 5, updatedAt: new Date() })
        .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "streak_freeze")));
      rewardDescription = "5 Streak Freezes";
      break;
    }
    case "objective_pass": {
      const pts = await awardObjectivePass(userId);
      rewardDescription = pts > 0
        ? `Objective Pass — all weekly & monthly objectives cleared (+${pts} pts)`
        : "Objective Pass — all weekly & monthly objectives were already completed";
      bonusPts = 0; // points already inserted via achievements
      break;
    }
    case "free_spins": {
      const row = await getOrCreatePowerup(userId, "spinning_voucher");
      await db.update(userPowerupsTable)
        .set({ quantity: row.quantity + 5, updatedAt: new Date() })
        .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "spinning_voucher")));
      rewardDescription = "5 free spins";
      break;
    }
    case "discount_50": {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.update(usersTable)
        .set({ shopDiscountPct: 50, shopDiscountExpiresAt: expiresAt, shopDiscountUsesLeft: 3, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
      rewardDescription = "50% shop discount — 10 minutes, 3 items";
      break;
    }
    case "discount_25": {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.update(usersTable)
        .set({ shopDiscountPct: 25, shopDiscountExpiresAt: expiresAt, shopDiscountUsesLeft: 3, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
      rewardDescription = "25% shop discount — 10 minutes, 3 items";
      break;
    }
    case "pts_5000": bonusPts = 5000; rewardDescription = "5,000 points"; break;
    case "pts_2000": bonusPts = 2000; rewardDescription = "2,000 points"; break;
    case "pts_tier9": bonusPts = randPts(1500, 1990, 10); rewardDescription = `${bonusPts} points`; break;
    case "pts_tier10": bonusPts = randPts(1000, 1490, 10); rewardDescription = `${bonusPts} points`; break;
    case "pts_tier11": bonusPts = randPts(500, 990, 10); rewardDescription = `${bonusPts} points`; break;
    case "pts_tier12": bonusPts = randPts(10, 490, 10); rewardDescription = `${bonusPts} points`; break;
  }

  if (bonusPts > 0) {
    await db.update(usersTable)
      .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${bonusPts}`, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
  }

  res.json({
    segmentId,
    rewardDescription,
    bonusPts: bonusPts || undefined,
    vouchersLeft: voucherRow.quantity - 1,
  });
});

export default router;

import { Router, type IRouter } from "express";
import { getUserAchievements, checkAndAwardAchievements, getTotalPoints } from "../lib/achievements";
import { awardXp } from "../lib/xp";

const router: IRouter = Router();

router.get("/achievements", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const achievements = await getUserAchievements(req.user.id);
  const totalPoints = getTotalPoints(achievements);
  res.json({ achievements, totalPoints });
});

router.post("/achievements/check", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const newlyEarned = await checkAndAwardAchievements(req.user.id);
  const achievements = await getUserAchievements(req.user.id);
  const totalPoints = getTotalPoints(achievements);

  // Award XP for each newly earned achievement (10 XP per achievement point)
  let xpAwarded = 0;
  let levelUp: { leveledUp: boolean; newLevel: number } | null = null;
  if (newlyEarned.length > 0) {
    const totalXp = newlyEarned.reduce((sum, a) => sum + Math.max(10, Math.floor(a.points * 0.5)), 0);
    try {
      const result = await awardXp(req.user.id, totalXp);
      xpAwarded = totalXp;
      levelUp = { leveledUp: result.leveledUp, newLevel: result.newLevel };
    } catch {}
  }

  res.json({ newlyEarned, achievements, totalPoints, xpAwarded, levelUp });
});

export default router;

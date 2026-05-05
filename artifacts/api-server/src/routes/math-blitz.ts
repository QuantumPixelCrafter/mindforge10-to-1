import { Router, type IRouter } from "express";
import { db, scoresTable, usersTable } from "@workspace/db";
import { eq, desc, sql, ne } from "drizzle-orm";
import { mergeWithBots, MATH_BLITZ_EASY_BOTS, MATH_BLITZ_NORMAL_BOTS, MATH_BLITZ_HARD_BOTS } from "../lib/bots";

const router: IRouter = Router();

async function buildMathBlitzBoard(gameType: string) {
  const rows = await db
    .select({
      userId: scoresTable.userId,
      bestScore: sql<number>`max(${scoresTable.score})`.as("best_score"),
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      username: usersTable.username,
      profileImageUrl: usersTable.profileImageUrl,
      equippedNametag: usersTable.equippedNametag,
      gameLevel: usersTable.gameLevel,
      showNameOnLeaderboard: usersTable.showNameOnLeaderboard,
    })
    .from(scoresTable)
    .leftJoin(usersTable, eq(scoresTable.userId, usersTable.id))
    .where(eq(scoresTable.gameType, gameType as any))
    .groupBy(
      scoresTable.userId,
      usersTable.firstName,
      usersTable.lastName,
      usersTable.username,
      usersTable.profileImageUrl,
      usersTable.equippedNametag,
      usersTable.gameLevel,
      usersTable.showNameOnLeaderboard,
      usersTable.devMode,
    )
    .having(sql`bool_or(${usersTable.devMode}) IS DISTINCT FROM true`)
    .orderBy(desc(sql<number>`max(${scoresTable.score})`))
    .limit(20);

  return rows.map((r, i) => {
    const showName = r.showNameOnLeaderboard !== false;
    const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
    const displayName = showName
      ? fullName || r.username || "Anonymous"
      : r.username || "Anonymous";
    return {
      rank: i + 1,
      userId: r.userId,
      displayName,
      profileImageUrl: r.profileImageUrl ?? null,
      equippedNametag: r.equippedNametag ?? null,
      gameLevel: r.gameLevel ?? 1,
      score: r.bestScore,
    };
  });
}

router.get("/math-blitz/leaderboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [easyRaw, normalRaw, hardRaw] = await Promise.all([
    buildMathBlitzBoard("math-blitz-easy"),
    buildMathBlitzBoard("math-blitz-normal"),
    buildMathBlitzBoard("math-blitz-hard"),
  ]);

  const easy   = mergeWithBots(easyRaw,   MATH_BLITZ_EASY_BOTS,   20, true);
  const normal = mergeWithBots(normalRaw, MATH_BLITZ_NORMAL_BOTS, 20, true);
  const hard   = mergeWithBots(hardRaw,   MATH_BLITZ_HARD_BOTS,   20, true);

  res.json({ easy, normal, hard });
});

export default router;

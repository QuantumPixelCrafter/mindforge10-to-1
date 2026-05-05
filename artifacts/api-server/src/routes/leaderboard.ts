import { Router, type IRouter } from "express";
import { db, scoresTable, usersTable, leaderboardRewardsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { awardXp, getLevelProgress } from "../lib/xp";
import {
  getWeekKey, getMonthKey,
  getPrevWeekKey, getPrevMonthKey,
  getNextWeeklyReset, getNextMonthlyReset,
  WEEKLY_REWARDS, SEASON_REWARDS, getRewardForRank,
} from "../lib/period";
import {
  mergeWithBots, mergeLevelBoardWithBots,
  BUBBLE_POP_BOTS, MEMORY_MATCH_BOTS, QUIZ_BOTS, LEVEL_BOARD_BOTS,
} from "../lib/bots";

const router: IRouter = Router();

async function distributeRewards(boardType: "weekly" | "season", periodKey: string) {
  const already = await db
    .select({ id: leaderboardRewardsTable.id })
    .from(leaderboardRewardsTable)
    .where(
      and(
        eq(leaderboardRewardsTable.boardType, boardType),
        eq(leaderboardRewardsTable.periodKey, periodKey),
      ),
    );
  if (already.length > 0) return;

  const keyCol = boardType === "weekly" ? scoresTable.weekKey : scoresTable.monthKey;
  const tiers = boardType === "weekly" ? WEEKLY_REWARDS : SEASON_REWARDS;

  const rows = await db
    .select({
      userId: scoresTable.userId,
      bestScore: sql<number>`max(${scoresTable.score})`.as("best_score"),
    })
    .from(scoresTable)
    .where(and(eq(keyCol, periodKey), eq(scoresTable.gameType, "quiz")))
    .groupBy(scoresTable.userId)
    .orderBy(desc(sql<number>`max(${scoresTable.score})`))
    .limit(50);

  await db.insert(leaderboardRewardsTable).values({ boardType, periodKey });

  for (let i = 0; i < rows.length; i++) {
    const rank = i + 1;
    const reward = getRewardForRank(rank, tiers);
    if (!reward) continue;
    try {
      await awardXp(rows[i].userId, reward.xp);
      await db
        .update(usersTable)
        .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${reward.coins}`, updatedAt: new Date() })
        .where(eq(usersTable.id, rows[i].userId));
    } catch {}
  }
}

async function buildScoreBoard(
  gameType: string,
  periodKey: string,
  isWeekly: boolean,
  quizLevel?: string,
) {
  const keyCol = isWeekly ? scoresTable.weekKey : scoresTable.monthKey;
  const isQuiz = gameType === "quiz";

  const conditions: ReturnType<typeof eq>[] = [
    eq(scoresTable.gameType, gameType as any),
    eq(keyCol, periodKey),
  ];
  if (quizLevel) conditions.push(eq(scoresTable.userLevel, quizLevel));

  // Quiz leaderboard uses the accumulated SUM of all quiz scores in the period.
  // All other boards use best (MAX) score.
  const scoreAgg = isQuiz
    ? sql<number>`sum(${scoresTable.score})`.as("best_score")
    : sql<number>`max(${scoresTable.score})`.as("best_score");

  const orderAgg = isQuiz
    ? desc(sql<number>`sum(${scoresTable.score})`)
    : desc(sql<number>`max(${scoresTable.score})`);

  const rows = await db
    .select({
      userId: scoresTable.userId,
      bestScore: scoreAgg,
      createdAt: sql<Date>`max(${scoresTable.createdAt})`.as("created_at"),
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      showNameOnLeaderboard: usersTable.showNameOnLeaderboard,
      isPublic: usersTable.isPublic,
      allowProfileView: usersTable.allowProfileView,
      userLevel: usersTable.level,
    })
    .from(scoresTable)
    .leftJoin(usersTable, eq(scoresTable.userId, usersTable.id))
    .where(and(...conditions))
    .groupBy(
      scoresTable.userId,
      usersTable.username,
      usersTable.firstName,
      usersTable.lastName,
      usersTable.profileImageUrl,
      usersTable.showNameOnLeaderboard,
      usersTable.isPublic,
      usersTable.allowProfileView,
      usersTable.level,
    )
    .orderBy(orderAgg)
    .limit(50);

  return rows.map((row, i) => {
    const showName = row.showNameOnLeaderboard !== false;
    const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ");
    const displayName = showName ? (fullName || row.username || "Anonymous") : (row.username || "Anonymous");
    const profileViewable = row.isPublic !== false || row.allowProfileView !== false;
    return {
      id: i + 1,
      userId: row.userId,
      displayName,
      profileImageUrl: row.profileImageUrl ?? null,
      profileViewable,
      gameType,
      score: row.bestScore,
      userLevel: row.userLevel ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  });
}

router.get("/leaderboard", async (req, res) => {
  const boardType = (req.query.boardType as string) === "season" ? "season" : "weekly";
  const quizLevel = typeof req.query.quizLevel === "string" ? req.query.quizLevel : undefined;
  const now = new Date();
  const isWeekly = boardType === "weekly";
  const periodKey = isWeekly ? getWeekKey(now) : getMonthKey(now);
  const prevPeriodKey = isWeekly ? getPrevWeekKey(now) : getPrevMonthKey(now);
  const nextReset = isWeekly ? getNextWeeklyReset(now) : getNextMonthlyReset(now);

  distributeRewards(boardType, prevPeriodKey).catch(() => {});

  const [memoryMatchRaw, bubblePopRaw, quizRaw] = await Promise.all([
    buildScoreBoard("memory-match", periodKey, isWeekly),
    buildScoreBoard("bubble-pop", periodKey, isWeekly),
    buildScoreBoard("quiz", periodKey, isWeekly, quizLevel),
  ]);

  const memoryMatch = mergeWithBots(memoryMatchRaw, MEMORY_MATCH_BOTS);
  const bubblePop   = mergeWithBots(bubblePopRaw,   BUBBLE_POP_BOTS);
  const quiz        = mergeWithBots(quizRaw, QUIZ_BOTS, 50, false, quizLevel);

  // Known test accounts to exclude from the level board (by full name or username).
  const TEST_DISPLAY_NAMES = [
    'leaderboard tester', 'test user', 'tester pop',
    'test user (another one)', 'shop tester', 'bob test', 'test test',
  ];
  const TEST_USERNAMES = [
    'for_testing', 'leaderboard_tester', 'tester_pop', 'shop_tester',
    'bob_test', 'test_test', 'test_user',
  ];

  const xpBoard = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      level: usersTable.level,
      gameLevel: usersTable.gameLevel,
      xp: usersTable.xp,
      equippedNametag: usersTable.equippedNametag,
      showNameOnLeaderboard: usersTable.showNameOnLeaderboard,
      isPublic: usersTable.isPublic,
      allowProfileView: usersTable.allowProfileView,
    })
    .from(usersTable)
    .where(
      sql`NOT (
        lower(trim(coalesce(${usersTable.firstName}, '') || ' ' || coalesce(${usersTable.lastName}, '')))
          = ANY(ARRAY[${sql.raw(TEST_DISPLAY_NAMES.map(n => `'${n}'`).join(","))}])
        OR lower(coalesce(${usersTable.username}, ''))
          = ANY(ARRAY[${sql.raw(TEST_USERNAMES.map(n => `'${n}'`).join(","))}])
      )`,
    )
    .orderBy(desc(usersTable.xp))
    .limit(50);

  const xpBoardMapped = xpBoard.map((u, i) => {
    const showName = u.showNameOnLeaderboard !== false;
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
    const displayName = showName ? (fullName || u.username || "Anonymous") : (u.username || "Anonymous");
    const profileViewable = u.isPublic !== false || u.allowProfileView !== false;
    return {
      rank: i + 1,
      userId: u.id,
      displayName,
      profileImageUrl: u.profileImageUrl ?? null,
      profileViewable,
      level: u.level ?? null,
      gameLevel: u.gameLevel ?? 1,
      xp: u.xp ?? 0,
      equippedNametag: u.equippedNametag ?? null,
      levelProgress: getLevelProgress(u.xp ?? 0),
      score: u.xp ?? 0,
    };
  });

  const levelBoard = mergeLevelBoardWithBots(xpBoardMapped, LEVEL_BOARD_BOTS);

  res.json({
    memoryMatch,
    bubblePop,
    quiz,
    levelBoard,
    quizMeta: {},
    meta: {
      boardType,
      periodKey,
      nextReset: nextReset.toISOString(),
      weeklyRewards: WEEKLY_REWARDS,
      seasonRewards: SEASON_REWARDS,
    },
  });
});

router.post("/leaderboard/scores", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { gameType, score, subject, userLevel, secondsTaken } = req.body;
  if (!gameType || typeof score !== "number") {
    res.status(400).json({ error: "gameType and score are required" });
    return;
  }

  // Developer dev-mode: skip score & XP entirely
  if (req.user.isDeveloper && req.user.devMode) {
    res.json({
      id: null,
      userId: req.user.id,
      displayName: null,
      profileImageUrl: null,
      gameType,
      score,
      subject: subject ?? null,
      userLevel: userLevel ?? null,
      createdAt: new Date().toISOString(),
      xpAwarded: 0,
      levelUp: null,
      devMode: true,
    });
    return;
  }

  const now = new Date();
  const [saved] = await db
    .insert(scoresTable)
    .values({
      userId: req.user.id,
      gameType,
      score,
      subject: subject ?? null,
      userLevel: userLevel ?? null,
      weekKey: getWeekKey(now),
      monthKey: getMonthKey(now),
      secondsTaken: typeof secondsTaken === "number" ? secondsTaken : null,
    })
    .returning();

  let xpAwarded = 0;
  let levelUp: { leveledUp: boolean; newLevel: number } | null = null;
  try {
    if (gameType === "quiz") {
      xpAwarded = Math.max(5, Math.floor(score * 0.25));
    } else {
      xpAwarded = Math.max(2, Math.floor(score * 0.05));
    }
    const result = await awardXp(req.user.id, xpAwarded);
    levelUp = { leveledUp: result.leveledUp, newLevel: result.newLevel };
  } catch {}

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));

  res.json({
    id: saved.id,
    userId: saved.userId,
    displayName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Anonymous",
    profileImageUrl: user?.profileImageUrl ?? null,
    gameType: saved.gameType,
    score: saved.score,
    subject: saved.subject ?? null,
    userLevel: saved.userLevel ?? null,
    createdAt: saved.createdAt.toISOString(),
    xpAwarded,
    levelUp,
  });
});

export default router;

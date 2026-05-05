import { Router, type IRouter } from "express";
import { db, usersTable, userAchievementsTable, scoresTable, friendshipsTable, userBlocksTable } from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { ACHIEVEMENTS } from "../lib/achievements";
import { getLevelProgress } from "../lib/xp";
import { getBotProfile } from "../lib/bots";

const router: IRouter = Router();

// GET public profile of any user
router.get("/users/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId } = req.params;

  // ── Bot profile ──────────────────────────────────────────────────────────
  const botProfile = getBotProfile(userId);
  if (botProfile) {
    const levelProgress = getLevelProgress(botProfile.xp);
    return res.json({
      id: botProfile.userId,
      username: botProfile.username,
      firstName: null,
      lastName: null,
      displayName: botProfile.displayName,
      profileImageUrl: null,
      isPublic: botProfile.isPublic,
      isBot: true,
      level: botProfile.level,
      gameLevel: botProfile.gameLevel,
      xp: botProfile.xp,
      levelProgress,
      equippedBackground: botProfile.equippedBackground,
      equippedFrame: botProfile.equippedFrame,
      equippedNametag: botProfile.equippedNametag,
      country: botProfile.country,
      gradeIndex: botProfile.gradeIndex,
      createdAt: botProfile.createdAt,
      friendCount: 0,
      achievements: { earned: 0, total: ACHIEVEMENTS.length, totalPoints: 0, list: [] },
      scores: { memory: botProfile.scores.memory, bubble: botProfile.scores.bubble, quiz: botProfile.scores.quiz },
      friendship: null,
    });
  }
  // ── End bot profile ───────────────────────────────────────────────────────

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      level: usersTable.level,
      gameLevel: usersTable.gameLevel,
      xp: usersTable.xp,
      equippedBackground: usersTable.equippedBackground,
      equippedFrame: usersTable.equippedFrame,
      equippedNametag: usersTable.equippedNametag,
      isPublic: usersTable.isPublic,
      createdAt: usersTable.createdAt,
      country: usersTable.country,
      gradeIndex: usersTable.gradeIndex,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const isOwnProfile = user.id === req.user.id;

  // If viewer is blocked by this user, return 404
  if (!isOwnProfile) {
    const [blockRow] = await db
      .select({ id: userBlocksTable.id })
      .from(userBlocksTable)
      .where(and(eq(userBlocksTable.blockerId, userId), eq(userBlocksTable.blockedId, req.user.id)))
      .limit(1);
    if (blockRow) {
      res.status(404).json({ error: "User not found" });
      return;
    }
  }

  // Achievements
  const earnedRows = await db
    .select()
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));
  const earned = new Set(earnedRows.map(r => r.achievementKey));
  const totalPoints = earnedRows.reduce((sum, e) => {
    const def = ACHIEVEMENTS.find(a => a.key === e.key);
    return sum + (def?.points ?? 0);
  }, 0);
  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    earned: earned.has(a.key),
    earnedAt: earnedRows.find(r => r.achievementKey === a.key)?.earnedAt ?? null,
  }));

  // Top scores
  const scores = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, userId))
    .orderBy(desc(scoresTable.score))
    .limit(50);

  const bestMemory = scores.filter(s => s.gameType === "memory-match").sort((a, b) => b.score - a.score)[0] ?? null;
  const bestBubble = scores.filter(s => s.gameType === "bubble-pop").sort((a, b) => b.score - a.score)[0] ?? null;
  const bestQuiz = scores.filter(s => s.gameType === "quiz").sort((a, b) => b.score - a.score)[0] ?? null;

  // Friendship status with caller + total accepted friend count for the profile user
  const [fs, friendRows] = await Promise.all([
    db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          and(eq(friendshipsTable.requesterId, req.user.id), eq(friendshipsTable.addresseeId, userId)),
          and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.addresseeId, req.user.id))
        )
      )
      .limit(1),
    db
      .select({ id: friendshipsTable.id })
      .from(friendshipsTable)
      .where(
        and(
          eq(friendshipsTable.status, "accepted"),
          or(
            eq(friendshipsTable.requesterId, userId),
            eq(friendshipsTable.addresseeId, userId)
          )
        )
      ),
  ]);
  const friendCount = friendRows.length;

  const levelInfo = getLevelProgress(user.xp ?? 0);

  const isPublic = user.isPublic !== false;

  res.json({
    id: user.id,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Anonymous",
    profileImageUrl: user.profileImageUrl ?? null,
    isPublic,
    level: user.level ?? null,
    gameLevel: user.gameLevel ?? 1,
    xp: user.xp ?? 0,
    levelProgress: levelInfo,
    equippedBackground: user.equippedBackground ?? null,
    equippedFrame: user.equippedFrame ?? null,
    equippedNametag: user.equippedNametag ?? null,
    country: user.country ?? null,
    gradeIndex: user.gradeIndex ?? null,
    createdAt: user.createdAt.toISOString(),
    friendCount,
    achievements: { earned: earned.size, total: ACHIEVEMENTS.length, totalPoints, list: achievements },
    scores: { memory: bestMemory?.score ?? null, bubble: bestBubble?.score ?? null, quiz: bestQuiz?.score ?? null },
    friendship: fs
      ? { id: fs.id, status: fs.status, iAmRequester: fs.requesterId === req.user.id }
      : null,
  });
});

// GET all users (for leaderboard / friends search)
router.get("/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const users = await db
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
      isPublic: usersTable.isPublic,
      showNameInSearch: usersTable.showNameInSearch,
    })
    .from(usersTable)
    .orderBy(usersTable.gameLevel);

  res.json(
    users
      .filter(u => u.isPublic !== false || u.id === req.user.id)
      .map(u => {
        const showName = u.showNameInSearch !== false || u.id === req.user.id;
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
        return {
          ...u,
          displayName: showName ? (fullName || u.username || "Anonymous") : (u.username || "Anonymous"),
        };
      })
  );
});

// POST /users/:userId/block — block a user (also removes friendship)
router.post("/users/:userId/block", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { userId } = req.params;
  if (userId === req.user.id) { res.status(400).json({ error: "Cannot block yourself" }); return; }

  await db.insert(userBlocksTable).values({ blockerId: req.user.id, blockedId: userId }).onConflictDoNothing();

  // Remove any existing friendship
  await db.delete(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.requesterId, req.user.id), eq(friendshipsTable.addresseeId, userId)),
      and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.addresseeId, req.user.id))
    )
  );

  res.json({ success: true });
});

// DELETE /users/:userId/block — unblock a user
router.delete("/users/:userId/block", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { userId } = req.params;

  await db.delete(userBlocksTable).where(
    and(eq(userBlocksTable.blockerId, req.user.id), eq(userBlocksTable.blockedId, userId))
  );

  res.json({ success: true });
});

export default router;

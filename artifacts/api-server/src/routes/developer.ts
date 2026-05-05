import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, inboxMessagesTable, userPowerupsTable } from "@workspace/db";
import { eq, ne, sql, and } from "drizzle-orm";
import { getSessionId, getSession, updateSession } from "../lib/auth";
import { POWERUP_DEFS } from "./powerups";

const router: IRouter = Router();

const APPROVER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";

function requireDeveloper(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated() || !req.user?.isDeveloper) {
    res.status(403).json({ error: "Developer access only." });
    return;
  }
  next();
}

router.get("/developer/users", requireDeveloper, async (req: Request, res: Response) => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      xp: usersTable.xp,
      bonusPoints: usersTable.bonusPoints,
      isDeveloper: usersTable.isDeveloper,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json({ users });
});

router.post("/developer/gift-all", requireDeveloper, async (req: Request, res: Response) => {
  const { giftName, points } = req.body;

  if (!giftName || typeof giftName !== "string" || giftName.trim().length === 0) {
    res.status(400).json({ error: "giftName is required." });
    return;
  }

  const name = giftName.trim();

  if (!points || typeof points !== "number" || points <= 0 || !Number.isInteger(points)) {
    res.status(400).json({ error: "points must be a positive integer." });
    return;
  }
  if (points > 100000) {
    res.status(400).json({ error: "Cannot gift more than 100,000 points at once." });
    return;
  }

  const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
  if (allUsers.length === 0) { res.json({ success: true, recipientCount: 0 }); return; }

  await db.update(usersTable)
    .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${points}` });

  await db.insert(inboxMessagesTable).values(
    allUsers.map((u) => ({
      recipientId: u.id,
      senderId: req.user!.id,
      type: "points",
      points,
      message: `A gift from the development team: ${name}`,
    }))
  );

  res.json({ success: true, recipientCount: allUsers.length });
});

router.post("/developer/gift-user", requireDeveloper, async (req: Request, res: Response) => {
  const { targetUserId, giftType, points, powerupKey, powerupQty } = req.body;

  if (!targetUserId || typeof targetUserId !== "string") {
    res.status(400).json({ error: "targetUserId is required." });
    return;
  }

  const [target] = await db
    .select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.username || "this user";
  const devName = [req.user!.firstName, req.user!.lastName].filter(Boolean).join(" ") || req.user!.username || "The development team";

  if (giftType === "points") {
    if (!points || typeof points !== "number" || points <= 0 || !Number.isInteger(points)) {
      res.status(400).json({ error: "points must be a positive integer." });
      return;
    }
    if (points > 100000) {
      res.status(400).json({ error: "Cannot gift more than 100,000 points at once." });
      return;
    }
    await db.update(usersTable)
      .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${points}`, updatedAt: new Date() })
      .where(eq(usersTable.id, targetUserId));
    await db.insert(inboxMessagesTable).values({
      recipientId: targetUserId,
      senderId: req.user!.id,
      type: "points",
      points,
      message: `A gift from the development team: ${points.toLocaleString()} bonus points!`,
    });
    res.json({ success: true, message: `Gifted ${points} pts to ${targetName}` });
    return;
  }

  if (giftType === "powerup") {
    const def = POWERUP_DEFS.find(d => d.key === powerupKey);
    if (!def) {
      res.status(400).json({ error: "Unknown powerup key." });
      return;
    }
    const qty = typeof powerupQty === "number" && powerupQty > 0 ? Math.min(powerupQty, 99) : 1;
    const existing = await db.select()
      .from(userPowerupsTable)
      .where(and(eq(userPowerupsTable.userId, targetUserId), eq(userPowerupsTable.type, powerupKey)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(userPowerupsTable)
        .set({ quantity: existing[0].quantity + qty, updatedAt: new Date() })
        .where(and(eq(userPowerupsTable.userId, targetUserId), eq(userPowerupsTable.type, powerupKey)));
    } else {
      await db.insert(userPowerupsTable).values({ userId: targetUserId, type: powerupKey, quantity: qty });
    }
    await db.insert(inboxMessagesTable).values({
      recipientId: targetUserId,
      senderId: req.user!.id,
      type: "powerup_gift",
      message: `${devName} gifted you ${qty}x ${def.emoji} ${def.name}!`,
      status: "none",
    });
    res.json({ success: true, message: `Gifted ${qty}x ${def.name} to ${targetName}` });
    return;
  }

  res.status(400).json({ error: "giftType must be 'points' or 'powerup'." });
});

router.post("/developer/toggle-dev-mode", requireDeveloper, async (req: Request, res: Response) => {
  const [user] = await db
    .select({ devMode: usersTable.devMode })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  const newDevMode = !(user?.devMode ?? false);
  await db.update(usersTable)
    .set({ devMode: newDevMode, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.id));

  // Patch the session so subsequent requests see the new devMode value
  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session?.user) {
      session.user = { ...session.user, devMode: newDevMode };
      await updateSession(sid, session);
    }
  }

  res.json({ devMode: newDevMode });
});

router.post("/developer/request-promote", requireDeveloper, async (req: Request, res: Response) => {
  const { targetUserId } = req.body;

  if (!targetUserId || typeof targetUserId !== "string") {
    res.status(400).json({ error: "targetUserId is required." });
    return;
  }

  if (targetUserId === req.user!.id) {
    res.status(400).json({ error: "You cannot promote yourself." });
    return;
  }

  const [target] = await db
    .select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName, lastName: usersTable.lastName, isDeveloper: usersTable.isDeveloper })
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (target.isDeveloper) {
    res.status(400).json({ error: "User is already a developer." });
    return;
  }

  const requesterName = [req.user!.firstName, req.user!.lastName].filter(Boolean).join(" ") || req.user!.username || "A developer";
  const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.username || "this user";

  await db.insert(inboxMessagesTable).values({
    recipientId: APPROVER_ID,
    senderId: req.user!.id,
    type: "developer_request",
    status: "pending",
    targetUserId,
    message: `${requesterName} is requesting to promote ${targetName} to developer status. Please approve or reject.`,
  });

  res.json({ success: true });
});

export default router;

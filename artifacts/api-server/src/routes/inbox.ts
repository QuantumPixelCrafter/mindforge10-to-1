import { Router, type IRouter, type Request, type Response } from "express";
import { db, inboxMessagesTable, usersTable, friendshipsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

const APPROVER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";

router.get("/inbox", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const messages = await db
    .select({
      id: inboxMessagesTable.id,
      type: inboxMessagesTable.type,
      points: inboxMessagesTable.points,
      message: inboxMessagesTable.message,
      status: inboxMessagesTable.status,
      targetUserId: inboxMessagesTable.targetUserId,
      readAt: inboxMessagesTable.readAt,
      createdAt: inboxMessagesTable.createdAt,
      sender: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        isDeveloper: usersTable.isDeveloper,
      },
    })
    .from(inboxMessagesTable)
    .leftJoin(usersTable, eq(inboxMessagesTable.senderId, usersTable.id))
    .where(eq(inboxMessagesTable.recipientId, req.user!.id))
    .orderBy(desc(inboxMessagesTable.createdAt));

  res.json({ messages });
});

router.put("/inbox/read-all", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await db
    .update(inboxMessagesTable)
    .set({ readAt: new Date() })
    .where(eq(inboxMessagesTable.recipientId, req.user!.id));

  res.json({ success: true });
});

router.put("/inbox/:id/read", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  await db
    .update(inboxMessagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)));

  res.json({ success: true });
});

router.put("/inbox/:id/approve", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user!.id !== APPROVER_ID) {
    res.status(403).json({ error: "Only the primary developer can approve requests." });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, APPROVER_ID)))
    .limit(1);

  if (!msg) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  if (msg.type !== "developer_request") {
    res.status(400).json({ error: "Not a developer request." });
    return;
  }

  if (msg.status !== "pending") {
    res.status(400).json({ error: "Request has already been processed." });
    return;
  }

  if (!msg.targetUserId) {
    res.status(400).json({ error: "No target user in this request." });
    return;
  }

  await Promise.all([
    db.update(usersTable)
      .set({ isDeveloper: true })
      .where(eq(usersTable.id, msg.targetUserId)),
    db.update(inboxMessagesTable)
      .set({ status: "approved", readAt: new Date() })
      .where(eq(inboxMessagesTable.id, id)),
    db.insert(inboxMessagesTable).values({
      recipientId: msg.targetUserId,
      senderId: APPROVER_ID,
      type: "developer_approved",
      status: "none",
      message: "Your developer access has been approved! Welcome to the team.",
    }),
  ]);

  res.json({ success: true });
});

router.put("/inbox/:id/reject", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user!.id !== APPROVER_ID) {
    res.status(403).json({ error: "Only the primary developer can reject requests." });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, APPROVER_ID)))
    .limit(1);

  if (!msg) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  if (msg.type !== "developer_request") {
    res.status(400).json({ error: "Not a developer request." });
    return;
  }

  if (msg.status !== "pending") {
    res.status(400).json({ error: "Request has already been processed." });
    return;
  }

  if (!msg.senderId || !msg.targetUserId) {
    res.status(400).json({ error: "Missing sender or target user." });
    return;
  }

  const [targetUser] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, msg.targetUserId))
    .limit(1);

  const targetName = targetUser
    ? ([targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || targetUser.username || "the user")
    : "the user";

  await Promise.all([
    db.update(inboxMessagesTable)
      .set({ status: "rejected", readAt: new Date() })
      .where(eq(inboxMessagesTable.id, id)),
    db.insert(inboxMessagesTable).values({
      recipientId: msg.senderId,
      senderId: APPROVER_ID,
      type: "developer_request_rejected",
      status: "pending_choice",
      targetUserId: msg.targetUserId,
      message: `Your promotion request for ${targetName} was rejected. Would you like to notify them?`,
    }),
  ]);

  res.json({ success: true });
});

router.put("/inbox/:id/notify-rejected", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.isDeveloper) {
    res.status(403).json({ error: "Developer access only." });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)))
    .limit(1);

  if (!msg) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  if (msg.type !== "developer_request_rejected") {
    res.status(400).json({ error: "Not a rejection notice." });
    return;
  }

  if (msg.status !== "pending_choice") {
    res.status(400).json({ error: "Choice has already been made." });
    return;
  }

  if (!msg.targetUserId) {
    res.status(400).json({ error: "No target user on this message." });
    return;
  }

  await Promise.all([
    db.update(inboxMessagesTable)
      .set({ status: "notified", readAt: new Date() })
      .where(eq(inboxMessagesTable.id, id)),
    db.insert(inboxMessagesTable).values({
      recipientId: msg.targetUserId,
      senderId: req.user!.id,
      type: "developer_rejected",
      status: "none",
      message: "Your developer promotion request was not approved at this time.",
    }),
  ]);

  res.json({ success: true });
});

router.delete("/inbox/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  const deleted = await db
    .delete(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)))
    .returning({ id: inboxMessagesTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  res.json({ success: true });
});

router.put("/inbox/:id/skip-notify", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.isDeveloper) {
    res.status(403).json({ error: "Developer access only." });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)))
    .limit(1);

  if (!msg) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  if (msg.type !== "developer_request_rejected") {
    res.status(400).json({ error: "Not a rejection notice." });
    return;
  }

  if (msg.status !== "pending_choice") {
    res.status(400).json({ error: "Choice has already been made." });
    return;
  }

  await db.update(inboxMessagesTable)
    .set({ status: "skipped", readAt: new Date() })
    .where(eq(inboxMessagesTable.id, id));

  res.json({ success: true });
});

router.put("/inbox/:id/accept-friend", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)))
    .limit(1);

  if (!msg || msg.type !== "friend_request") {
    res.status(404).json({ error: "Friend request not found." });
    return;
  }
  if (msg.status !== "pending") {
    res.status(400).json({ error: "Request already handled." });
    return;
  }

  const friendshipId = Number(msg.targetUserId);
  if (!friendshipId) {
    res.status(400).json({ error: "Invalid friendship reference." });
    return;
  }

  await Promise.all([
    db.update(friendshipsTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendshipsTable.id, friendshipId)),
    db.update(inboxMessagesTable)
      .set({ status: "accepted", readAt: new Date() })
      .where(eq(inboxMessagesTable.id, id)),
  ]);

  res.json({ success: true });
});

router.put("/inbox/:id/decline-friend", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  const [msg] = await db
    .select()
    .from(inboxMessagesTable)
    .where(and(eq(inboxMessagesTable.id, id), eq(inboxMessagesTable.recipientId, req.user!.id)))
    .limit(1);

  if (!msg || msg.type !== "friend_request") {
    res.status(404).json({ error: "Friend request not found." });
    return;
  }
  if (msg.status !== "pending") {
    res.status(400).json({ error: "Request already handled." });
    return;
  }

  const friendshipId = Number(msg.targetUserId);
  if (!friendshipId) {
    res.status(400).json({ error: "Invalid friendship reference." });
    return;
  }

  await Promise.all([
    db.delete(friendshipsTable).where(eq(friendshipsTable.id, friendshipId)),
    db.update(inboxMessagesTable)
      .set({ status: "declined", readAt: new Date() })
      .where(eq(inboxMessagesTable.id, id)),
  ]);

  res.json({ success: true });
});

export default router;

import { Router, type IRouter } from "express";
import { db, chatMessagesTable, friendshipsTable, usersTable, inboxMessagesTable, userAchievementsTable, userBlocksTable } from "@workspace/db";
import { eq, or, and, isNull } from "drizzle-orm";
import { ACHIEVEMENTS } from "../lib/achievements";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const [fs] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          and(eq(friendshipsTable.requesterId, userId), eq(friendshipsTable.addresseeId, otherId)),
          and(eq(friendshipsTable.requesterId, otherId), eq(friendshipsTable.addresseeId, userId))
        )
      )
    )
    .limit(1);
  return !!fs;
}

async function getUserBalance(userId: string): Promise<number> {
  const [earned, [userRow]] = await Promise.all([
    db.select({ key: userAchievementsTable.achievementKey }).from(userAchievementsTable).where(eq(userAchievementsTable.userId, userId)),
    db.select({ pointsSpent: usersTable.pointsSpent, bonusPoints: usersTable.bonusPoints }).from(usersTable).where(eq(usersTable.id, userId)),
  ]);
  const totalEarned = earned.reduce((sum, e) => {
    const def = ACHIEVEMENTS.find(a => a.key === e.key);
    return sum + (def?.points ?? 0);
  }, 0);
  const bonus = userRow?.bonusPoints ?? 0;
  const spent = userRow?.pointsSpent ?? 0;
  return Math.max(0, totalEarned + bonus - spent);
}

// GET current user's chat balance
router.get("/chat/balance", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user.id;
  const balance = await getUserBalance(userId);
  res.json({ balance });
});

// GET messages with a specific user (must be friends)
router.get("/chat/:userId", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const otherId = req.params.userId;

  const friends = await areFriends(req.user.id, otherId);
  if (!friends) {
    res.status(403).json({ error: "You must be friends to chat" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(
      and(
        or(
          and(eq(chatMessagesTable.senderId, req.user.id), eq(chatMessagesTable.receiverId, otherId)),
          and(eq(chatMessagesTable.senderId, otherId), eq(chatMessagesTable.receiverId, req.user.id))
        ),
        // Hide messages the current user soft-deleted for themselves only
        // (deletedForEveryone messages still appear — as a "deleted" placeholder)
        or(
          and(eq(chatMessagesTable.senderId, req.user.id), eq(chatMessagesTable.deletedForSender, false)),
          and(eq(chatMessagesTable.receiverId, req.user.id), eq(chatMessagesTable.deletedForReceiver, false)),
        )
      )
    )
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  // Mark unread messages from friend as read (only messages we received)
  await db
    .update(chatMessagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(chatMessagesTable.senderId, otherId),
        eq(chatMessagesTable.receiverId, req.user.id)
      )
    );

  res.json(messages);
});

// POST send a message (must be friends)
router.post("/chat/:userId", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const otherId = req.params.userId;
  const { content, mediaUrl } = req.body;

  const hasContent = content && typeof content === "string" && content.trim().length > 0;
  const hasMedia = mediaUrl && typeof mediaUrl === "string" && mediaUrl.trim().length > 0;

  if (!hasContent && !hasMedia) {
    res.status(400).json({ error: "Message content or media required" });
    return;
  }
  if (hasContent && content.trim().length > 2000) {
    res.status(400).json({ error: "Message too long (max 2000 chars)" });
    return;
  }

  // Check if sender is blocked by receiver
  const [blockRow] = await db
    .select({ id: userBlocksTable.id })
    .from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, otherId), eq(userBlocksTable.blockedId, req.user.id)))
    .limit(1);
  if (blockRow) {
    res.status(403).json({ error: "Could not send message" });
    return;
  }

  const friends = await areFriends(req.user.id, otherId);
  if (!friends) {
    // Check if receiver allows stranger messages
    const [receiverRow] = await db
      .select({ receiveStrangerMessages: usersTable.receiveStrangerMessages })
      .from(usersTable)
      .where(eq(usersTable.id, otherId))
      .limit(1);

    if (!receiverRow?.receiveStrangerMessages) {
      res.status(403).json({ error: "This user doesn't accept messages from non-friends" });
      return;
    }

    // Count messages sender has already sent to this non-friend
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(chatMessagesTable)
      .where(and(eq(chatMessagesTable.senderId, req.user.id), eq(chatMessagesTable.receiverId, otherId)));

    if (cnt >= 3) {
      res.status(403).json({ error: "You've reached the 3-message limit for non-friends. Add them as a friend to keep chatting!" });
      return;
    }

    // Send inbox notification on the very first message
    if (cnt === 0) {
      const [senderRow] = await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1);
      const senderName = [senderRow?.firstName, senderRow?.lastName].filter(Boolean).join(" ") || senderRow?.username || "Someone";
      await db.insert(inboxMessagesTable).values({
        recipientId: otherId,
        senderId: req.user.id,
        type: "stranger_message_request",
        message: `${senderName} wants to message you. Add them as a friend to continue chatting beyond 3 messages.`,
        status: "pending",
        targetUserId: req.user.id,
      });
    }
  }

  // Insert the message
  const [msg] = await db
    .insert(chatMessagesTable)
    .values({
      senderId: req.user.id,
      receiverId: otherId,
      content: hasContent ? content.trim() : "",
      mediaUrl: hasMedia ? mediaUrl.trim() : null,
    })
    .returning();

  res.status(201).json(msg);
});

// GET unread message count across all friends
router.get("/chat/unread/count", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const unread = await db
    .select()
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.receiverId, req.user.id),
      )
    );

  const count = unread.filter(m => !m.readAt).length;
  res.json({ count });
});

// GET unread messages with sender info (for badges + push notifications — does NOT mark as read)
router.get("/chat/unread/messages", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const unread = await db
    .select({
      id: chatMessagesTable.id,
      senderId: chatMessagesTable.senderId,
      content: chatMessagesTable.content,
      mediaUrl: chatMessagesTable.mediaUrl,
      createdAt: chatMessagesTable.createdAt,
      senderUsername: usersTable.username,
      senderFirstName: usersTable.firstName,
      senderLastName: usersTable.lastName,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(
      and(
        eq(chatMessagesTable.receiverId, req.user.id),
        isNull(chatMessagesTable.readAt)
      )
    )
    .orderBy(chatMessagesTable.createdAt);

  res.json({ messages: unread, count: unread.length });
});

// DELETE /chat/message/:id — delete for me only
router.delete("/chat/message/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const msgId = Number(req.params.id);
  if (isNaN(msgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  const isSender = msg.senderId === req.user.id;
  const isReceiver = msg.receiverId === req.user.id;
  if (!isSender && !isReceiver) { res.status(403).json({ error: "Forbidden" }); return; }

  if (isSender) {
    await db.update(chatMessagesTable).set({ deletedForSender: true }).where(eq(chatMessagesTable.id, msgId));
  } else {
    await db.update(chatMessagesTable).set({ deletedForReceiver: true }).where(eq(chatMessagesTable.id, msgId));
  }

  res.json({ success: true });
});

// DELETE /chat/message/:id/everyone — delete for everyone (sender only)
router.delete("/chat/message/:id/everyone", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const msgId = Number(req.params.id);
  if (isNaN(msgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  if (msg.senderId !== req.user.id) { res.status(403).json({ error: "Only the sender can delete for everyone" }); return; }

  await db.update(chatMessagesTable).set({ deletedForEveryone: true }).where(eq(chatMessagesTable.id, msgId));
  res.json({ success: true });
});

// PATCH /chat/message/:id — edit message text (sender only)
router.patch("/chat/message/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const msgId = Number(req.params.id);
  if (isNaN(msgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body;
  if (typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" }); return;
  }

  const [msg] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  if (msg.senderId !== req.user.id) { res.status(403).json({ error: "Only the sender can edit" }); return; }
  if (msg.deletedForEveryone) { res.status(400).json({ error: "Cannot edit a deleted message" }); return; }

  const [updated] = await db
    .update(chatMessagesTable)
    .set({ content: content.trim(), editedAt: new Date() })
    .where(eq(chatMessagesTable.id, msgId))
    .returning();

  res.json(updated);
});

export default router;

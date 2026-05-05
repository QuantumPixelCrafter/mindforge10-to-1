import { Router, type IRouter } from "express";
import { db, usersTable, friendshipsTable, inboxMessagesTable } from "@workspace/db";
import { eq, or, and, ilike, ne } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// Search users by name or username
router.get("/friends/search", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json([]);
    return;
  }
  const results = await db
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
    })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, req.user.id),
        or(
          ilike(usersTable.firstName, `%${q}%`),
          ilike(usersTable.lastName, `%${q}%`),
          ilike(usersTable.username, `%${q}%`)
        )
      )
    )
    .limit(20);

  // Fetch friendship status for each result
  const allFriendships = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.requesterId, req.user.id),
        eq(friendshipsTable.addresseeId, req.user.id)
      )
    );

  const withStatus = results.map(u => {
    const fs = allFriendships.find(
      f => (f.requesterId === u.id || f.addresseeId === u.id)
    );
    return {
      ...u,
      displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Anonymous",
      friendshipId: fs?.id ?? null,
      friendshipStatus: fs?.status ?? null,
      iAmRequester: fs?.requesterId === req.user.id,
    };
  });

  res.json(withStatus);
});

// List my friends and pending requests
router.get("/friends", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const friendships = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.requesterId, req.user.id),
        eq(friendshipsTable.addresseeId, req.user.id)
      )
    );

  const userIds = [...new Set(friendships.map(f =>
    f.requesterId === req.user.id ? f.addresseeId : f.requesterId
  ))];

  const users = userIds.length > 0
    ? await db.select({
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        level: usersTable.level,
        gameLevel: usersTable.gameLevel,
        xp: usersTable.xp,
        equippedNametag: usersTable.equippedNametag,
        equippedBackground: usersTable.equippedBackground,
        equippedFrame: usersTable.equippedFrame,
      }).from(usersTable).where(
        userIds.length === 1
          ? eq(usersTable.id, userIds[0]!)
          : or(...userIds.map(id => eq(usersTable.id, id)))
      )
    : [];

  const usersMap = Object.fromEntries(users.map(u => [u.id, u]));

  const result = friendships.map(f => {
    const otherId = f.requesterId === req.user.id ? f.addresseeId : f.requesterId;
    const u = usersMap[otherId];
    return {
      friendshipId: f.id,
      status: f.status,
      iAmRequester: f.requesterId === req.user.id,
      user: u ? {
        ...u,
        displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Anonymous",
      } : null,
    };
  });

  res.json(result);
});

// Send a friend request
router.post("/friends/request", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { addresseeId } = req.body;
  if (!addresseeId || typeof addresseeId !== "string") {
    res.status(400).json({ error: "addresseeId required" });
    return;
  }
  if (addresseeId === req.user.id) {
    res.status(400).json({ error: "Cannot friend yourself" });
    return;
  }

  // Check if friendship already exists
  const existing = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, req.user.id), eq(friendshipsTable.addresseeId, addresseeId)),
        and(eq(friendshipsTable.requesterId, addresseeId), eq(friendshipsTable.addresseeId, req.user.id))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Friendship already exists", friendship: existing[0] });
    return;
  }

  const [friendship] = await db
    .insert(friendshipsTable)
    .values({ requesterId: req.user.id, addresseeId })
    .returning();

  const senderName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.username || "Someone";

  await db.insert(inboxMessagesTable).values({
    recipientId: addresseeId,
    senderId: req.user.id,
    type: "friend_request",
    status: "pending",
    targetUserId: String(friendship.id),
    message: `${senderName} wants to be your friend.`,
  });

  res.status(201).json(friendship);
});

// Accept a friend request
router.post("/friends/:id/accept", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  const [fs] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id)).limit(1);
  if (!fs || fs.addresseeId !== req.user.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(friendshipsTable.id, id))
    .returning();
  res.json(updated);
});

// Decline a friend request
router.post("/friends/:id/decline", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  const [fs] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id)).limit(1);
  if (!fs || fs.addresseeId !== req.user.id) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, id));
  res.json({ success: true });
});

// Remove a friend / cancel a request
router.delete("/friends/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  const [fs] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, id)).limit(1);
  if (!fs || (fs.requesterId !== req.user.id && fs.addresseeId !== req.user.id)) {
    res.status(404).json({ error: "Friendship not found" });
    return;
  }
  await db.delete(friendshipsTable).where(eq(friendshipsTable.id, id));
  res.json({ success: true });
});

export default router;

import { Router, type IRouter } from "express";
import { db, usersTable, userPowerupsTable, inboxMessagesTable, userAchievementsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { ACHIEVEMENTS } from "../lib/achievements";

const router: IRouter = Router();

export const POWERUP_DEFS = [
  {
    key: "streak_freeze",
    name: "Streak Freeze",
    emoji: "🧊",
    description: "Protects your streak from breaking if you miss a day or get a wrong answer.",
    longDescription: "Activates automatically the next time your streak would break. One charge = one save.",
    price: 2000,
    purchasable: true,
  },
  {
    key: "double_points",
    name: "Double Points Boost",
    emoji: "⚡",
    description: "For one quiz session, all earned points are doubled.",
    longDescription: "Activate before starting a quiz. Points from that session are doubled before submission.",
    price: 1500,
    purchasable: true,
  },
  {
    key: "hint_token",
    name: "Hint Token",
    emoji: "💡",
    description: "Reveals a clue or narrows down options in AI quizzes.",
    longDescription: "Use during a quiz to eliminate two wrong answer choices. One token per question.",
    price: 500,
    purchasable: true,
  },
  {
    key: "retry_pass",
    name: "Retry Pass",
    emoji: "🔄",
    description: "Redo a quiz and earn points from the second attempt only.",
    longDescription: "You receive 3 free Retry Passes every week via your inbox. Cannot be purchased.",
    price: 0,
    purchasable: false,
  },
  {
    key: "random_quiz_bonus",
    name: "Random Quiz Bonus",
    emoji: "🎲",
    description: "Use before a quiz for a surprise reward — bonus points or a random power-up!",
    longDescription: "50% chance of bonus points (300–1000 pts, most likely ~650) · 50% chance of a random power-up grant. Activate it on the quiz settings screen before generating your quiz.",
    price: 700,
    purchasable: true,
  },
  {
    key: "spinning_voucher",
    name: "Spinning Voucher",
    emoji: "🎡",
    description: "One spin on the Wheel of Fortune. Rewards range from bonus points to rare items.",
    longDescription: "Head to the Wheel of Fortune page and spend one voucher to spin. Chances range from small points all the way to 20,000 pts and an exclusive nametag.",
    price: 500,
    purchasable: true,
  },
] as const;

export type PowerupKey = "streak_freeze" | "double_points" | "hint_token" | "retry_pass" | "random_quiz_bonus" | "spinning_voucher";

// Triangular distribution: min, max, mode
function triangularRandom(min: number, max: number, mode: number): number {
  const U = Math.random();
  const Fc = (mode - min) / (max - min);
  if (U < Fc) {
    return Math.round(min + Math.sqrt(U * (max - min) * (mode - min)));
  }
  return Math.round(max - Math.sqrt((1 - U) * (max - min) * (max - mode)));
}

function isNewWeek(lastGrant: Date | null): boolean {
  if (!lastGrant) return true;
  const now = new Date();
  const nowDay = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (nowDay === 0 ? 6 : nowDay - 1));
  weekStart.setHours(0, 0, 0, 0);
  return lastGrant < weekStart;
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

async function getOrCreatePowerup(userId: string, type: string): Promise<{ id: number; quantity: number }> {
  const existing = await db.select().from(userPowerupsTable)
    .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, type)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(userPowerupsTable).values({ userId, type, quantity: 0 }).returning();
  return created;
}

router.get("/powerups", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user.id;

  const [userRow] = await db.select({
    lastRetryPassGrantAt: usersTable.lastRetryPassGrantAt,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (isNewWeek(userRow?.lastRetryPassGrantAt ?? null)) {
    const retryRow = await getOrCreatePowerup(userId, "retry_pass");
    const newQty = retryRow.quantity + 3;
    await Promise.all([
      db.update(userPowerupsTable)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "retry_pass"))),
      db.update(usersTable)
        .set({ lastRetryPassGrantAt: new Date(), updatedAt: new Date() })
        .where(eq(usersTable.id, userId)),
      db.insert(inboxMessagesTable).values({
        recipientId: userId,
        senderId: userId,
        type: "retry_pass_grant",
        message: "You've received 3 Retry Passes for this week! Use them in the quiz page to redo any quiz and earn points from your second attempt.",
        status: "none",
      }),
    ]);
  }

  const powerups = await db.select().from(userPowerupsTable).where(eq(userPowerupsTable.userId, userId));
  const balance = await getUserBalance(userId);

  const inventory = POWERUP_DEFS.map(def => {
    const row = powerups.find(p => p.type === def.key);
    return { ...def, quantity: row?.quantity ?? 0 };
  });

  res.json({ inventory, balance });
});

router.post("/powerups/purchase", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { type } = req.body;
  const def = POWERUP_DEFS.find(d => d.key === type);

  if (!def) {
    res.status(404).json({ error: "Unknown powerup type" });
    return;
  }
  if (!def.purchasable) {
    res.status(400).json({ error: "This powerup cannot be purchased" });
    return;
  }

  const balance = await getUserBalance(req.user.id);
  if (balance < def.price) {
    res.status(400).json({ error: "Insufficient points" });
    return;
  }

  const existing = await getOrCreatePowerup(req.user.id, type);

  await Promise.all([
    db.update(userPowerupsTable)
      .set({ quantity: existing.quantity + 1, updatedAt: new Date() })
      .where(and(eq(userPowerupsTable.userId, req.user.id), eq(userPowerupsTable.type, type))),
    db.update(usersTable)
      .set({ pointsSpent: req.user.pointsSpent + def.price, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user.id)),
  ]);

  res.json({ success: true, newBalance: balance - def.price });
});

router.post("/powerups/weekly-grant", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = req.user.id;
  const [userRow] = await db.select({ lastRetryPassGrantAt: usersTable.lastRetryPassGrantAt })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (isNewWeek(userRow?.lastRetryPassGrantAt ?? null)) {
    const retryRow = await getOrCreatePowerup(userId, "retry_pass");
    const newQty = retryRow.quantity + 3;
    await Promise.all([
      db.update(userPowerupsTable)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "retry_pass"))),
      db.update(usersTable)
        .set({ lastRetryPassGrantAt: new Date(), updatedAt: new Date() })
        .where(eq(usersTable.id, userId)),
      db.insert(inboxMessagesTable).values({
        recipientId: userId,
        senderId: userId,
        type: "retry_pass_grant",
        message: "A new week has started! You've received 3 Retry Passes. Use them in the quiz page to redo any quiz and earn points from your second attempt.",
        status: "none",
      }),
    ]);
    res.json({ granted: true, quantity: newQty });
  } else {
    res.json({ granted: false });
  }
});

router.post("/powerups/gift", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { recipientId, type } = req.body;
  const senderId = req.user.id;

  if (!recipientId || typeof recipientId !== "string") {
    res.status(400).json({ error: "recipientId is required." });
    return;
  }
  if (recipientId === senderId) {
    res.status(400).json({ error: "You cannot gift yourself." });
    return;
  }

  const def = POWERUP_DEFS.find(d => d.key === type);
  if (!def) {
    res.status(404).json({ error: "Unknown powerup type." });
    return;
  }
  if (!def.purchasable) {
    res.status(400).json({ error: "This powerup cannot be gifted." });
    return;
  }

  const [senderRow] = await db.select({
    giftCooldownEndsAt: usersTable.giftCooldownEndsAt,
    pointsSpent: usersTable.pointsSpent,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    username: usersTable.username,
  }).from(usersTable).where(eq(usersTable.id, senderId));

  if (senderRow?.giftCooldownEndsAt && senderRow.giftCooldownEndsAt > new Date()) {
    const endsAt = senderRow.giftCooldownEndsAt;
    const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86400000);
    res.status(400).json({ error: `You're on a gift cooldown. Try again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.` });
    return;
  }

  const [recipient] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, recipientId)).limit(1);
  if (!recipient) {
    res.status(404).json({ error: "Recipient not found." });
    return;
  }

  const balance = await getUserBalance(senderId);
  if (balance < def.price) {
    res.status(400).json({ error: "Insufficient points to send this gift." });
    return;
  }

  const cooldownDays = Math.floor(def.price / 500);
  const cooldownEndsAt = new Date(Date.now() + cooldownDays * 86400000);
  const senderName = [senderRow?.firstName, senderRow?.lastName].filter(Boolean).join(" ") || senderRow?.username || "Someone";

  const recipientPowerup = await getOrCreatePowerup(recipientId, type);

  await Promise.all([
    db.update(userPowerupsTable)
      .set({ quantity: recipientPowerup.quantity + 1, updatedAt: new Date() })
      .where(and(eq(userPowerupsTable.userId, recipientId), eq(userPowerupsTable.type, type))),
    db.update(usersTable)
      .set({ pointsSpent: (senderRow?.pointsSpent ?? 0) + def.price, giftCooldownEndsAt: cooldownEndsAt, updatedAt: new Date() })
      .where(eq(usersTable.id, senderId)),
    db.insert(inboxMessagesTable).values({
      recipientId,
      senderId,
      type: "powerup_gift",
      message: `${senderName} gifted you a ${def.emoji} ${def.name}!`,
      status: "none",
    }),
  ]);

  res.json({ success: true, cooldownDays, cooldownEndsAt: cooldownEndsAt.toISOString() });
});

router.post("/powerups/use", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { type } = req.body;
  const def = POWERUP_DEFS.find(d => d.key === type);

  if (!def) {
    res.status(404).json({ error: "Unknown powerup type" });
    return;
  }

  const existing = await db.select().from(userPowerupsTable)
    .where(and(eq(userPowerupsTable.userId, req.user.id), eq(userPowerupsTable.type, type)))
    .limit(1);

  if (existing.length === 0 || existing[0].quantity <= 0) {
    res.status(400).json({ error: "No charges remaining" });
    return;
  }

  await db.update(userPowerupsTable)
    .set({ quantity: existing[0].quantity - 1, updatedAt: new Date() })
    .where(and(eq(userPowerupsTable.userId, req.user.id), eq(userPowerupsTable.type, type)));

  res.json({ success: true, remaining: existing[0].quantity - 1 });
});

// POST /api/powerups/use-random-bonus — consume one Random Quiz Bonus and resolve the reward
router.post("/powerups/use-random-bonus", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user.id;

  const existing = await db.select().from(userPowerupsTable)
    .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "random_quiz_bonus")))
    .limit(1);

  if (existing.length === 0 || existing[0].quantity <= 0) {
    res.status(400).json({ error: "No Random Quiz Bonus charges remaining" });
    return;
  }

  // Consume one charge
  await db.update(userPowerupsTable)
    .set({ quantity: existing[0].quantity - 1, updatedAt: new Date() })
    .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, "random_quiz_bonus")));

  const isPoints = Math.random() < 0.5;

  if (isPoints) {
    // Triangular distribution centred on the midpoint 650 (min 300, max 1000)
    const pts = triangularRandom(300, 1000, 650);
    await db.update(usersTable)
      .set({ bonusPoints: sql`${usersTable.bonusPoints} + ${pts}`, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    res.json({ rewardType: "points", points: pts });
  } else {
    // Equal-probability draw from all other power-ups
    const grantable = ["streak_freeze", "double_points", "hint_token", "retry_pass", "spinning_voucher"] as const;
    const chosen = grantable[Math.floor(Math.random() * grantable.length)];
    const chosenDef = POWERUP_DEFS.find(d => d.key === chosen)!;
    const existingPowerup = await getOrCreatePowerup(userId, chosen);
    await db.update(userPowerupsTable)
      .set({ quantity: existingPowerup.quantity + 1, updatedAt: new Date() })
      .where(and(eq(userPowerupsTable.userId, userId), eq(userPowerupsTable.type, chosen)));
    res.json({ rewardType: "powerup", powerupKey: chosen, powerupName: chosenDef.name, powerupEmoji: chosenDef.emoji });
  }
});

export default router;

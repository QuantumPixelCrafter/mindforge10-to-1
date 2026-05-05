import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, friendshipsTable, inboxMessagesTable } from "@workspace/db";
import { eq, or, and, ilike, sql } from "drizzle-orm";
import { isInappropriate } from "../lib/profanity";
import {
  createSession,
  updateSession,
  clearSession,
  getSessionId,
  deleteSession,
  getSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function buildSessionUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    level: user.level,
    pointsSpent: user.pointsSpent,
    equippedBackground: user.equippedBackground,
    equippedFrame: user.equippedFrame,
    equippedNametag: user.equippedNametag,
    xp: user.xp ?? 0,
    gameLevel: user.gameLevel ?? 1,
    isPublic: user.isPublic ?? true,
    showNameOnLeaderboard: user.showNameOnLeaderboard ?? true,
    showNameInSearch: user.showNameInSearch ?? true,
    allowProfileView: user.allowProfileView ?? true,
    isDeveloper: user.isDeveloper ?? false,
    devMode: user.devMode ?? false,
    country: user.country ?? null,
    gradeIndex: user.gradeIndex ?? null,
    gradeSchoolYear: user.gradeSchoolYear ?? null,
    preferredLanguage: user.preferredLanguage ?? null,
    goalReminderDays: user.goalReminderDays ?? null,
    receiveStrangerMessages: user.receiveStrangerMessages ?? false,
    usernameChangedAt: user.usernameChangedAt?.toISOString() ?? null,
  };
}

const SCHOOL_YEAR_START: Record<string, number> = {
  HK:9, MO:9, CN:9, TW:9, SG:1, MY:1, JP:4, KR:3, PH:6, ID:7, IN:6,
  GB:9, IE:9, US:9, CA:9, AU:2, NZ:2, ZA:1, DE:9, FR:9, ES:9, IT:9,
  NL:9, BE:9, CH:9, AT:9, PL:9, SE:8, NO:8, DK:8, FI:8, RU:9, BR:2,
  PT:9, GR:9, TR:9, SA:9, AE:9, EG:9, NG:9, KE:1, GH:9, MX:9, CO:1,
  AR:3, CL:3, TH:5, VN:9, PK:4, BD:1, LK:1,
};
const GRADE_COUNT: Record<string, number> = {
  HK:16, MO:16, CN:16, TW:14, SG:15, MY:13, JP:16, KR:16, PH:13, ID:14, IN:16,
  GB:15, IE:14, US:15, CA:14, AU:14, NZ:13, ZA:13, DE:16, FR:15, ES:13, IT:16,
  NL:16, BE:15, CH:16, AT:16, PL:15, SE:14, NO:14, DK:14, FI:14, RU:15, BR:16,
  PT:13, GR:15, TR:15, SA:15, AE:15, EG:15, NG:15, KE:15, GH:15, MX:13, CO:13,
  AR:13, CL:13, TH:15, VN:16, PK:15, BD:15, LK:15,
};

function computeSchoolYear(startMonth: number): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= startMonth ? year : year - 1;
}

async function autoIncrementGrade(userId: string, country: string, gradeIndex: number, gradeSchoolYear: number) {
  const startMonth = SCHOOL_YEAR_START[country];
  if (!startMonth) return null;
  const currentYear = computeSchoolYear(startMonth);
  if (currentYear <= gradeSchoolYear) return null;
  const yearsAdvanced = Math.min(currentYear - gradeSchoolYear, 4);
  const maxGrade = (GRADE_COUNT[country] ?? 16) - 1;
  const newGradeIndex = Math.min(gradeIndex + yearsAdvanced, maxGrade);
  if (newGradeIndex === gradeIndex) {
    await db.update(usersTable).set({ gradeSchoolYear: currentYear }).where(eq(usersTable.id, userId));
    return null;
  }
  const [updated] = await db.update(usersTable)
    .set({ gradeIndex: newGradeIndex, gradeSchoolYear: currentYear })
    .where(eq(usersTable.id, userId))
    .returning();
  return updated;
}

router.get("/auth/check-username", async (req: Request, res: Response) => {
  const { username } = req.query;
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    res.json({ available: false });
    return;
  }
  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_. ]+$/.test(trimmed)) {
    res.json({ available: false });
    return;
  }
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(ilike(usersTable.username, trimmed))
    .limit(1);
  res.json({ available: existing.length === 0 });
});

router.post("/auth/register", async (req: Request, res: Response) => {
  const { username, password, country, gradeIndex, preferredLanguage } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }
  if (typeof username !== "string" || username.trim().length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters." });
    return;
  }
  if (!/^[a-zA-Z0-9_. ]+$/.test(username.trim())) {
    res.status(400).json({ error: "Username can only contain letters, numbers, underscores, dots, and spaces." });
    return;
  }
  if (isInappropriate(username.trim())) {
    res.status(400).json({ error: "This username is not allowed. Please choose a different one." });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(ilike(usersTable.username, username.trim()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "This username is already taken." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let gradeSchoolYear: number | undefined;
  if (country && typeof gradeIndex === "number") {
    const startMonth = SCHOOL_YEAR_START[country];
    if (startMonth) gradeSchoolYear = computeSchoolYear(startMonth);
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username: username.trim(),
      passwordHash,
      ...(country ? { country } : {}),
      ...(typeof gradeIndex === "number" ? { gradeIndex } : {}),
      ...(gradeSchoolYear !== undefined ? { gradeSchoolYear } : {}),
      ...(preferredLanguage ? { preferredLanguage } : {}),
    })
    .returning();

  const sessionData: SessionData = { user: buildSessionUser(user), access_token: "" };
  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.status(201).json({ user: sessionData.user, sid });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(ilike(usersTable.username, username.trim()))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  let finalUser = user;
  if (user.country && user.gradeIndex !== null && user.gradeIndex !== undefined && user.gradeSchoolYear !== null && user.gradeSchoolYear !== undefined) {
    const updated = await autoIncrementGrade(user.id, user.country, user.gradeIndex, user.gradeSchoolYear);
    if (updated) finalUser = updated;
  }

  const sessionData: SessionData = { user: buildSessionUser(finalUser), access_token: "" };
  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ user: sessionData.user, sid });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

router.put("/auth/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { level, firstName, lastName, isPublic, showNameOnLeaderboard, showNameInSearch, allowProfileView, chatPointWarningThreshold, preferredLanguage, goalReminderDays, receiveStrangerMessages, country, gradeIndex } = req.body;
  const validLevels = ["P1","P2","P3","P4","P5","P6","S1","S2","S3","S4","S5","S6","U1","U2","U3","U4"];

  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    res.status(400).json({ error: "isPublic must be a boolean." });
    return;
  }

  if (level !== undefined && level !== null && !validLevels.includes(level)) {
    res.status(400).json({ error: "Invalid level." });
    return;
  }

  if (firstName !== undefined && (typeof firstName !== "string" || firstName.trim().length === 0)) {
    res.status(400).json({ error: "First name cannot be empty." });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (level !== undefined) updates.level = level ?? null;
  if (firstName !== undefined) updates.firstName = firstName.trim();
  if (lastName !== undefined) updates.lastName = lastName?.trim() || null;
  if (isPublic !== undefined) updates.isPublic = isPublic;
  if (showNameOnLeaderboard !== undefined && typeof showNameOnLeaderboard === "boolean") updates.showNameOnLeaderboard = showNameOnLeaderboard;
  if (showNameInSearch !== undefined && typeof showNameInSearch === "boolean") updates.showNameInSearch = showNameInSearch;
  if (allowProfileView !== undefined && typeof allowProfileView === "boolean") updates.allowProfileView = allowProfileView;
  if (chatPointWarningThreshold !== undefined) {
    if (chatPointWarningThreshold === null) {
      updates.chatPointWarningThreshold = null;
    } else if (typeof chatPointWarningThreshold === "number" && chatPointWarningThreshold >= 0) {
      updates.chatPointWarningThreshold = Math.floor(chatPointWarningThreshold);
    }
  }
  if (preferredLanguage !== undefined && typeof preferredLanguage === "string") {
    updates.preferredLanguage = preferredLanguage || null;
  }
  if (goalReminderDays !== undefined) {
    if (goalReminderDays === null) {
      updates.goalReminderDays = null;
    } else if (typeof goalReminderDays === "number" && goalReminderDays >= 0) {
      updates.goalReminderDays = Math.floor(goalReminderDays);
    }
  }
  if (receiveStrangerMessages !== undefined && typeof receiveStrangerMessages === "boolean") {
    updates.receiveStrangerMessages = receiveStrangerMessages;
  }
  if (country !== undefined) {
    updates.country = typeof country === "string" && country.trim() ? country.trim().toUpperCase() : null;
    if (updates.country && typeof gradeIndex === "number") {
      updates.gradeIndex = Math.max(0, Math.floor(gradeIndex));
      updates.gradeSchoolYear = computeSchoolYear(SCHOOL_YEAR_START[updates.country] ?? 9);
    } else if (updates.country === null) {
      updates.gradeIndex = null;
      updates.gradeSchoolYear = null;
    }
  } else if (gradeIndex !== undefined && typeof gradeIndex === "number") {
    updates.gradeIndex = Math.max(0, Math.floor(gradeIndex));
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      session.user = buildSessionUser(updated);
      await updateSession(sid, session);
    }
  }

  res.json({ user: buildSessionUser(updated) });
});

router.put("/auth/profile-picture", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { imageData } = req.body;

  if (!imageData || typeof imageData !== "string") {
    res.status(400).json({ error: "imageData is required" });
    return;
  }

  if (!imageData.startsWith("data:image/")) {
    res.status(400).json({ error: "Must be a valid image data URL" });
    return;
  }

  const base64Part = imageData.split(",")[1] ?? "";
  const sizeInBytes = (base64Part.length * 3) / 4;
  if (sizeInBytes > 3 * 1024 * 1024) {
    res.status(400).json({ error: "Image too large. Max 3MB." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ profileImageUrl: imageData, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      session.user = buildSessionUser(updated);
      await updateSession(sid, session);
    }
  }

  res.json({ user: buildSessionUser(updated) });
});

router.put("/auth/change-password", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required." });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(400).json({ error: "Password change is not available for accounts using Replit login." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id));

  res.json({ success: true });
});

const SYSTEM_SENDER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";
const USERNAME_CHANGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

router.patch("/auth/username", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Username is required." }); return;
  }
  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_. ]{3,30}$/.test(trimmed)) {
    res.status(400).json({ error: "Username must be 3–30 characters and contain only letters, numbers, underscores, dots, and spaces." }); return;
  }
  if (isInappropriate(trimmed)) {
    res.status(400).json({ error: "This username is not allowed. Please choose a different one." }); return;
  }

  // Check cooldown
  const [currentUser] = await db.select({ usernameChangedAt: usersTable.usernameChangedAt, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
  if (!currentUser) { res.status(404).json({ error: "User not found." }); return; }

  if (currentUser.usernameChangedAt) {
    const msSinceChange = Date.now() - new Date(currentUser.usernameChangedAt).getTime();
    if (msSinceChange < USERNAME_CHANGE_COOLDOWN_MS) {
      const daysLeft = Math.ceil((USERNAME_CHANGE_COOLDOWN_MS - msSinceChange) / (24 * 60 * 60 * 1000));
      res.status(429).json({ error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` }); return;
    }
  }

  if (trimmed.toLowerCase() === (currentUser.username ?? "").toLowerCase()) {
    res.status(400).json({ error: "That is already your username." }); return;
  }

  const [updated] = await db.update(usersTable)
    .set({ username: trimmed, usernameChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  // Update session
  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) { session.user = buildSessionUser(updated); await updateSession(sid, session); }
  }

  // Notify all accepted friends via inbox
  const friendships = await db.select().from(friendshipsTable).where(
    and(
      eq(friendshipsTable.status, "accepted"),
      or(eq(friendshipsTable.requesterId, req.user.id), eq(friendshipsTable.addresseeId, req.user.id))
    )
  );
  const friendIds = friendships.map(f => f.requesterId === req.user.id ? f.addresseeId : f.requesterId);
  const displayName = [updated.firstName, updated.lastName].filter(Boolean).join(" ") || updated.username || "A friend";

  if (friendIds.length > 0) {
    await db.insert(inboxMessagesTable).values(
      friendIds.map(fid => ({
        recipientId: fid,
        senderId: SYSTEM_SENDER_ID,
        type: "system",
        message: `${displayName} has changed their username to @${trimmed}.`,
        status: "none",
      }))
    );
  }

  res.json({ user: buildSessionUser(updated) });
});

router.delete("/auth/account", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  await db.delete(usersTable).where(eq(usersTable.id, userId));

  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });

  res.json({ success: true });
});

export default router;

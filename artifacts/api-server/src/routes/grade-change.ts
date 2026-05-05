import { Router } from "express";
import { db, usersTable, gradeChangeRequestsTable, inboxMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const APPROVER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";
const router = Router();

router.post("/grade-change-request", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const userId = req.user.id;
  const { requestedGradeIndex, reason } = req.body;

  if (requestedGradeIndex === undefined || requestedGradeIndex === null) {
    return res.status(400).json({ error: "Missing requestedGradeIndex" });
  }

  const [user] = await db.select({
    id: usersTable.id, username: usersTable.username,
    country: usersTable.country,
    gradeIndex: usersTable.gradeIndex,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user?.country || user.gradeIndex === null || user.gradeIndex === undefined) {
    return res.status(400).json({ error: "User has no current grade set" });
  }
  if (user.gradeIndex === requestedGradeIndex) {
    return res.status(400).json({ error: "Requested grade is the same as current grade" });
  }

  const currentGradeName = `Grade index ${user.gradeIndex}`;
  const requestedGradeName = `Grade index ${requestedGradeIndex}`;
  const reasonText = (reason ?? "").trim();

  const [request] = await db.insert(gradeChangeRequestsTable).values({
    userId,
    country: user.country,
    currentGradeIndex: user.gradeIndex,
    requestedGradeIndex: Number(requestedGradeIndex),
    currentGradeName,
    requestedGradeName,
    reason: reasonText,
    status: "pending",
  }).returning();

  const username = user.username ?? "Unknown";
  await db.insert(inboxMessagesTable).values({
    recipientId: APPROVER_ID,
    senderId: userId,
    type: "grade_change_request",
    message: `@${username} is requesting a grade change (grade index ${user.gradeIndex} → ${requestedGradeIndex} in ${user.country})${reasonText ? `\n\nReason: ${reasonText}` : ""}`,
    status: `pending:${request.id}`,
  });

  res.json({ ok: true, requestId: request.id });
});

router.get("/grade-change-requests", async (req, res) => {
  if (!req.user?.isDeveloper) return res.status(403).json({ error: "Forbidden" });
  const requests = await db
    .select({
      id: gradeChangeRequestsTable.id,
      userId: gradeChangeRequestsTable.userId,
      country: gradeChangeRequestsTable.country,
      currentGradeIndex: gradeChangeRequestsTable.currentGradeIndex,
      requestedGradeIndex: gradeChangeRequestsTable.requestedGradeIndex,
      currentGradeName: gradeChangeRequestsTable.currentGradeName,
      requestedGradeName: gradeChangeRequestsTable.requestedGradeName,
      reason: gradeChangeRequestsTable.reason,
      status: gradeChangeRequestsTable.status,
      createdAt: gradeChangeRequestsTable.createdAt,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(gradeChangeRequestsTable)
    .leftJoin(usersTable, eq(gradeChangeRequestsTable.userId, usersTable.id))
    .orderBy(desc(gradeChangeRequestsTable.createdAt));
  res.json({ requests });
});

router.put("/grade-change-requests/:id", async (req, res) => {
  if (!req.user?.isDeveloper) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(req.params.id, 10);
  const { action } = req.body;
  if (!["approve", "decline"].includes(action)) return res.status(400).json({ error: "Invalid action" });

  const [request] = await db.select().from(gradeChangeRequestsTable).where(eq(gradeChangeRequestsTable.id, id)).limit(1);
  if (!request) return res.status(404).json({ error: "Not found" });
  if (request.status !== "pending") return res.status(400).json({ error: "Already reviewed" });

  const newStatus = action === "approve" ? "approved" : "declined";
  await db.update(gradeChangeRequestsTable)
    .set({ status: newStatus, reviewedAt: new Date() })
    .where(eq(gradeChangeRequestsTable.id, id));

  if (action === "approve") {
    await db.update(usersTable)
      .set({ gradeIndex: request.requestedGradeIndex })
      .where(eq(usersTable.id, request.userId));
  }

  const message = action === "approve"
    ? `Your request to change your grade to **${request.requestedGradeName}** has been approved by the development team. Your grade has been updated.`
    : `Your request to change your grade to **${request.requestedGradeName}** has been declined by the development team. Your grade remains as **${request.currentGradeName}**.`;

  await db.insert(inboxMessagesTable).values({
    recipientId: request.userId,
    senderId: APPROVER_ID,
    type: "grade_change_result",
    message,
    status: newStatus,
  });

  res.json({ ok: true });
});

export default router;

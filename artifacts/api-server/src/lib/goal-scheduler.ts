import { db, goalsTable, inboxMessagesTable, usersTable } from "@workspace/db";
import { and, eq, lt, lte, isNotNull, gt } from "drizzle-orm";

// The system/admin account that sends automated notifications.
const SYSTEM_SENDER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";

/** Notify users whose goal deadline has already passed and they haven't completed it. */
async function checkOverdueGoals() {
  const now = new Date();

  const overdueGoals = await db
    .select()
    .from(goalsTable)
    .where(
      and(
        isNotNull(goalsTable.userId),
        eq(goalsTable.completed, false),
        eq(goalsTable.overdueNotified, false),
        lt(goalsTable.deadline, now),
      ),
    );

  for (const goal of overdueGoals) {
    try {
      await db.insert(inboxMessagesTable).values({
        recipientId: goal.userId!,
        senderId: SYSTEM_SENDER_ID,
        type: "system",
        message: `You missed your goal: "${goal.title}" — the deadline was ${goal.deadline.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Don't give up — set a new one!`,
        status: "none",
      });

      await db
        .update(goalsTable)
        .set({ overdueNotified: true })
        .where(eq(goalsTable.id, goal.id));

      console.log(`[goal-scheduler] Overdue notice sent to ${goal.userId} for "${goal.title}"`);
    } catch (err: any) {
      console.error(`[goal-scheduler] Overdue notice failed for goal ${goal.id}:`, err.message);
    }
  }
}

/** Notify users of upcoming goal deadlines based on their reminder preference. */
async function checkUpcomingGoals() {
  const now = new Date();

  // Fetch all users who have a goal reminder preference set
  const usersWithReminder = await db
    .select({ id: usersTable.id, goalReminderDays: usersTable.goalReminderDays })
    .from(usersTable)
    .where(
      and(
        isNotNull(usersTable.goalReminderDays),
        gt(usersTable.goalReminderDays, 0),
      ),
    );

  for (const u of usersWithReminder) {
    const days = u.goalReminderDays!;
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Goals owned by this user, not completed, not yet reminded, deadline within the window
    const upcomingGoals = await db
      .select()
      .from(goalsTable)
      .where(
        and(
          eq(goalsTable.userId, u.id),
          eq(goalsTable.completed, false),
          eq(goalsTable.reminderNotified, false),
          gt(goalsTable.deadline, now),       // not overdue yet
          lte(goalsTable.deadline, windowEnd),  // within reminder window
        ),
      );

    for (const goal of upcomingGoals) {
      try {
        const daysLeft = Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
        const deadlineStr = goal.deadline.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

        await db.insert(inboxMessagesTable).values({
          recipientId: u.id,
          senderId: SYSTEM_SENDER_ID,
          type: "system",
          message: `⏰ Reminder: your goal "${goal.title}" is due in ${daysLabel} (${deadlineStr}). Keep going — you've got this!`,
          status: "none",
        });

        await db
          .update(goalsTable)
          .set({ reminderNotified: true })
          .where(eq(goalsTable.id, goal.id));

        console.log(`[goal-scheduler] Reminder sent to ${u.id} for "${goal.title}" (${daysLabel} left)`);
      } catch (err: any) {
        console.error(`[goal-scheduler] Reminder failed for goal ${goal.id}:`, err.message);
      }
    }
  }
}

/** Start the goal scheduler — runs every 15 minutes. */
export function startGoalScheduler() {
  const INTERVAL_MS = 15 * 60 * 1000;

  async function tick() {
    await checkOverdueGoals().catch((e) =>
      console.error("[goal-scheduler] Overdue check failed:", e.message),
    );
    await checkUpcomingGoals().catch((e) =>
      console.error("[goal-scheduler] Reminder check failed:", e.message),
    );
  }

  tick(); // run immediately on startup
  setInterval(tick, INTERVAL_MS);

  console.log("[goal-scheduler] Started — checking every 15 minutes for overdue and upcoming goals");
}

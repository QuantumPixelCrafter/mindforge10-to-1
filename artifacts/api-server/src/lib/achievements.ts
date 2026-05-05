import { db, notesTable, noteEventsTable, subjectsTable, goalsTable, schedulesTable, moodsTable, scoresTable, userAchievementsTable, usersTable } from "@workspace/db";
import { eq, count, and, sum, isNotNull, asc, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  requirement: string;
  icon: string;
  points: number;
  category: "general" | "notes" | "quiz" | "goals" | "timetable" | "mood" | "games" | "challenges";
  periodic?: "weekly" | "monthly" | "seasonal";
}

export const ACHIEVEMENTS: AchievementDef[] = [

  // ─── General (all permanent milestones) ─────────────────────────────────────
  { key: "welcome",         title: "Welcome!",          description: "Join Mind Forge",                                                   requirement: "Create your account",                          icon: "🎉", points: 50,   category: "general" },
  { key: "level_set",       title: "All Set",            description: "Choose your education level",                                        requirement: "Select your education level in your profile",  icon: "🎓", points: 100,  category: "general" },
  { key: "game_level_1",    title: "First Steps",        description: "You've begun your journey. Every legend starts somewhere.",          requirement: "Reach Game Level 1",                           icon: "👣", points: 50,   category: "general" },
  { key: "game_level_25",   title: "Rising Challenger",  description: "Your skills are sharpening, and your presence is being felt.",       requirement: "Reach Game Level 25",                          icon: "⚔️", points: 360,  category: "general" },
  { key: "game_level_50",   title: "Seasoned Warrior",   description: "Halfway to greatness—your dedication is undeniable.",                requirement: "Reach Game Level 50",                          icon: "🛡️", points: 720,  category: "general" },
  { key: "game_level_75",   title: "Master of Trials",   description: "Few reach this height. You've proven your strength and resilience.", requirement: "Reach Game Level 75",                          icon: "👑", points: 1200, category: "general" },
  { key: "game_level_100",  title: "Legend Eternal",     description: "The pinnacle of achievement. Your name will be remembered forever.", requirement: "Reach Game Level 100",                         icon: "🌠", points: 2400, category: "general" },
  { key: "points_50",       title: "Getting Started",    description: "Your first milestone—proof that progress has begun.",                requirement: "Earn 50 total achievement points",              icon: "💫", points: 30,   category: "general" },
  { key: "points_500",      title: "Point Collector",    description: "You're gathering momentum, stacking up rewards with skill.",         requirement: "Earn 500 total achievement points",             icon: "💎", points: 50,   category: "general" },
  { key: "points_2000",     title: "Treasure Hunter",    description: "Your dedication shines as you uncover riches of effort.",            requirement: "Earn 2,000 total achievement points",           icon: "🏅", points: 100,  category: "general" },
  { key: "points_5000",     title: "Elite Scorer",       description: "You've reached rare heights—few achieve this level of mastery.",     requirement: "Earn 5,000 total achievement points",           icon: "🥇", points: 240,  category: "general" },
  { key: "points_10000",    title: "Mythic Champion",    description: "The ultimate accolade. Your name echoes in legend.",                 requirement: "Earn 10,000 total achievement points",          icon: "🏆", points: 480,  category: "general" },

  // ─── Notes ───────────────────────────────────────────────────────────────────
  // Permanent milestones
  { key: "first_note",    title: "First Words",    description: "Your knowledge journey starts with a single note.",           requirement: "Create your first note",          icon: "📝", points: 80,  category: "notes" },
  { key: "first_subject", title: "Organized",      description: "Structure is the foundation of learning.",                   requirement: "Create your first subject",       icon: "📁", points: 80,  category: "notes" },
  { key: "subjects_3",    title: "Multi-Subject",  description: "You're juggling multiple subjects like a pro.",              requirement: "Create 3 or more subjects",       icon: "🗂️", points: 200, category: "notes" },
  // Periodic
  { key: "notes_5",       title: "Note Taker",     description: "Five notes in a month—you're building good habits.",         requirement: "Write 5 notes this month",        icon: "📚", points: 150, category: "notes",  periodic: "monthly" },
  { key: "notes_20",      title: "Knowledge Base", description: "Twenty notes in a month—your dedication is impressive.",     requirement: "Write 20 notes this month",       icon: "🧠", points: 360, category: "notes",  periodic: "monthly" },

  // ─── Goals ───────────────────────────────────────────────────────────────────
  // Permanent milestones
  { key: "first_goal",     title: "Goal Setter",  description: "Every achievement starts with a goal.",                       requirement: "Set your first goal",                   icon: "🎯", points: 80,  category: "goals" },
  { key: "goal_completed", title: "Goal Crusher", description: "Words into action—you've crushed your first goal.",           requirement: "Mark your first goal as complete",       icon: "✅", points: 50,  category: "goals" },
  // Periodic
  { key: "goals_5_done",   title: "Overachiever", description: "Five completed goals in one month—you're relentless.",        requirement: "Complete 5 goals this month",            icon: "🌟", points: 110, category: "goals",  periodic: "monthly" },

  // ─── Timetable ───────────────────────────────────────────────────────────────
  // Permanent milestones
  { key: "first_event",    title: "Scheduled",    description: "Planning is the first step to success.",                      requirement: "Add your first event to the timetable",  icon: "📅", points: 80,  category: "timetable" },
  { key: "exam_scheduled", title: "Exam Ready",   description: "Preparation beats panic every time.",                         requirement: "Add an exam event to your timetable",    icon: "📋", points: 120, category: "timetable" },
  { key: "eca_scheduled",  title: "All-Rounder",  description: "Balance academics with activities—well done.",                requirement: "Add an ECA activity to your timetable",  icon: "⚽", points: 100, category: "timetable" },
  // Periodic
  { key: "events_5",       title: "Planner",      description: "Five scheduled events—you're running a tight calendar.",      requirement: "Schedule 5 or more events this month",   icon: "🗓️", points: 170, category: "timetable", periodic: "monthly" },

  // ─── Mood ────────────────────────────────────────────────────────────────────
  // Permanent milestone
  { key: "first_mood",  title: "Check-In",    description: "Self-awareness begins with a single log.",                   requirement: "Log your mood for the first time",        icon: "😊", points: 50,  category: "mood" },
  // Periodic
  { key: "mood_7",      title: "Consistent",  description: "Seven mood logs in a week—you're building self-awareness.",  requirement: "Log your mood 7 times this week",         icon: "💪", points: 240, category: "mood", periodic: "weekly"  },
  { key: "mood_30",     title: "Mood Master", description: "Thirty logs in a month—you know yourself deeply.",           requirement: "Log your mood 30 times this month",       icon: "🧘", points: 720, category: "mood", periodic: "monthly" },

  // ─── Quiz ────────────────────────────────────────────────────────────────────
  // Permanent milestones
  { key: "quiz_submitted",      title: "Quiz Time",       description: "Your learning journey begins here.",                           requirement: "Complete and submit a quiz",                     icon: "❓", points: 120,  category: "quiz" },
  { key: "quiz_first_attempt",  title: "First Attempt",   description: "You've taken the leap—every expert was once a beginner.",      requirement: "Complete your first quiz",                        icon: "🎯", points: 80,   category: "quiz" },
  { key: "quiz_master_200",     title: "Quiz Master",     description: "200 quizzes total—your expertise is undeniable.",              requirement: "Submit 200 quiz scores (ever)",                   icon: "🎓", points: 1920, category: "quiz" },
  // Periodic
  { key: "quiz_5",                 title: "Quiz Regular",       description: "Five quizzes in a week—keep that momentum going.",             requirement: "Submit 5 quiz scores this week",       icon: "📊", points: 290,  category: "quiz", periodic: "weekly"   },
  { key: "quiz_10",                title: "Quiz Veteran",       description: "Ten quizzes this month—practice makes perfect.",               requirement: "Submit 10 quiz scores this month",     icon: "🎖️", points: 480,  category: "quiz", periodic: "monthly"  },
  { key: "quiz_curious_learner",   title: "Curious Learner",    description: "Fifteen quizzes this month—your curiosity drives you forward.", requirement: "Submit 15 quiz scores this month",     icon: "🔍", points: 600,  category: "quiz", periodic: "monthly"  },
  { key: "quiz_dedicated_scholar", title: "Dedicated Scholar",  description: "Thirty quizzes in a month—that's serious dedication.",          requirement: "Submit 30 quiz scores this month",     icon: "📖", points: 840,  category: "quiz", periodic: "monthly"  },
  { key: "quiz_knowledge_seeker",  title: "Knowledge Seeker",   description: "A hundred quizzes this season—your pursuit of knowledge never stops.", requirement: "Submit 100 quiz scores this season", icon: "🧭", points: 1440, category: "quiz", periodic: "seasonal" },

  // ─── Games ───────────────────────────────────────────────────────────────────
  // Permanent milestones
  { key: "memory_match",    title: "Memory Pro",      description: "You've entered the memory arena.",                                  requirement: "Complete a Memory Match game",                         icon: "🃏", points: 100,  category: "games" },
  { key: "bubble_pop",      title: "Pop Star",        description: "Let the bubbles fly!",                                             requirement: "Play a round of Bubble Pop",                           icon: "🫧", points: 100,  category: "games" },
  { key: "all_games",       title: "Triple Threat",   description: "Mastering all three—a true all-rounder.",                          requirement: "Play Memory Match, Bubble Pop, and complete a Quiz",   icon: "🎮", points: 240,  category: "games" },
  { key: "bubbles_200",     title: "Bubble Veteran",  description: "Two hundred pops and counting—you're no newcomer.",               requirement: "Pop 200 bubbles total (ever)",                         icon: "🔮", points: 800,  category: "games" },
  { key: "bubbles_500",     title: "Pop Obsessed",    description: "Five hundred pops? You clearly can't stop.",                      requirement: "Pop 500 bubbles total (ever)",                         icon: "🌊", points: 1600, category: "games" },
  { key: "bubbles_1000",    title: "Bubble Deity",    description: "A thousand pops—beyond mortal limits, you've ascended.",          requirement: "Pop 1,000 bubbles total (ever)",                       icon: "💠", points: 2800, category: "games" },
  { key: "bubbles_5000",    title: "Bubble God",      description: "Five thousand pops. There are no words. Only bubbles.",           requirement: "Pop 5,000 bubbles total (ever)",                       icon: "🌌", points: 5000, category: "games" },
  { key: "memory_under_50", title: "Swift Starter",   description: "You've proven you can finish fast—speed is on your side.",         requirement: "Complete Memory Match in under 50 seconds",            icon: "⏱️", points: 150,  category: "games" },
  { key: "memory_under_30", title: "Rapid Runner",    description: "Your reflexes and focus are razor sharp.",                         requirement: "Complete Memory Match in under 30 seconds",            icon: "🏃", points: 290,  category: "games" },
  { key: "memory_under_20", title: "Lightning Striker",description: "You blaze through challenges with electrifying speed.",           requirement: "Complete Memory Match in under 20 seconds",            icon: "⚡", points: 480,  category: "games" },
  { key: "memory_under_15", title: "Blazing Phantom", description: "Almost untouchable—your moves are a blur.",                        requirement: "Complete Memory Match in under 15 seconds",            icon: "👻", points: 960,  category: "games" },
  { key: "memory_under_10", title: "Time-Breaker",    description: "So hard, yet you did it. You've shattered the limits of possibility.", requirement: "Complete Memory Match in under 10 seconds",         icon: "💥", points: 2400, category: "games" },
  // Periodic — weekly
  { key: "bubbles_weekly_30",   title: "Pop Warm-Up",        description: "Thirty pops this week—you're just getting started.",            requirement: "Pop 30 bubbles this week",     icon: "🫧", points: 150,  category: "games", periodic: "weekly"   },
  { key: "bubbles_weekly_75",   title: "Pop Enthusiast",     description: "Seventy-five pops this week—there's no stopping you.",          requirement: "Pop 75 bubbles this week",     icon: "💦", points: 320,  category: "games", periodic: "weekly"   },
  { key: "bubbles_weekly_150",  title: "Weekly Pop Machine", description: "A hundred-fifty pops this week—relentless and unstoppable.",    requirement: "Pop 150 bubbles this week",    icon: "⚡", points: 600,  category: "games", periodic: "weekly"   },
  // Periodic — monthly
  { key: "bubbles_monthly_100", title: "Bubble Breaker",     description: "A hundred pops this month—your aim is sharpening.",             requirement: "Pop 100 bubbles this month",   icon: "💥", points: 300,  category: "games", periodic: "monthly"  },
  { key: "bubbles_monthly_300", title: "Burst Specialist",   description: "Three hundred pops this month—precision and speed combined.",   requirement: "Pop 300 bubbles this month",   icon: "🌊", points: 600,  category: "games", periodic: "monthly"  },
  { key: "bubbles_monthly_600", title: "Pop Fanatic",        description: "Six hundred pops this month—an absolute force of nature.",      requirement: "Pop 600 bubbles this month",   icon: "🌪️", points: 960, category: "games", periodic: "monthly"  },
  // Periodic — seasonal
  { key: "bubbles_seasonal_500",  title: "Bubble Storm",        description: "Five hundred pops this season—an unstoppable flurry.",       requirement: "Pop 500 bubbles this season",   icon: "🌀", points: 1200, category: "games", periodic: "seasonal" },
  { key: "bubbles_seasonal_1500", title: "Seasonal Bubble Titan", description: "Fifteen hundred pops in one season—you're a popping legend.", requirement: "Pop 1,500 bubbles this season", icon: "👑", points: 2400, category: "games", periodic: "seasonal" },

  // ─── Donations ───────────────────────────────────────────────────────────────
  { key: "donated_seed",   title: "Seed Backer",   description: "You planted the first seed. Every great journey starts with a single step — thank you for yours.", requirement: "Donate $1 via the Store",  icon: "🌱", points: 240,  category: "general" },
  { key: "donated_sprout", title: "Sprout Backer",  description: "Your support is helping Mind Forge grow. A sprout reaching toward the sun — just like this app.", requirement: "Donate $2 via the Store",  icon: "🌿", points: 480,  category: "general" },
  { key: "donated_oak",    title: "Oak Backer",     description: "Mighty oaks from little acorns grow. You've made a real difference — the team is truly grateful.", requirement: "Donate $5 via the Store",  icon: "🌳", points: 1200, category: "general" },

  // ─── Challenges (repeatable, separate section) ────────────────────────────────
  // Weekly
  { key: "weekly_quiz_5",    title: "Weekly Grinder",       description: "Stay sharp—quiz yourself every week to keep the momentum going.", requirement: "Complete 5 quizzes this week",                    icon: "⚡", points: 240,  category: "challenges", periodic: "weekly"   },
  { key: "weekly_notes_3",   title: "Weekly Scribe",        description: "Capture ideas while they're fresh—3 new notes every week.",       requirement: "Write 3 notes this week",                        icon: "✍️", points: 180,  category: "challenges", periodic: "weekly"   },
  { key: "weekly_mood_5",    title: "Weekly Check-In",      description: "A small habit, a big impact—log your mood 5 times this week.",    requirement: "Log your mood 5 times this week",                icon: "😌", points: 120,  category: "challenges", periodic: "weekly"   },
  // Monthly
  { key: "monthly_quiz_20",  title: "Monthly Marathon",     description: "Twenty quizzes in a month—your dedication is something else.",    requirement: "Complete 20 quizzes this month",                  icon: "🏃", points: 600,  category: "challenges", periodic: "monthly"  },
  { key: "monthly_notes_10", title: "Monthly Writer",       description: "Ten notes in a month—you're actively building your knowledge.",   requirement: "Write 10 notes this month",                      icon: "📒", points: 480,  category: "challenges", periodic: "monthly"  },
  { key: "monthly_mood_20",  title: "Month of Mindfulness", description: "Twenty mood logs in a month—consistency is your superpower.",    requirement: "Log your mood 20 times this month",              icon: "🧘", points: 360,  category: "challenges", periodic: "monthly"  },
  { key: "monthly_goals_2",  title: "Monthly Achiever",     description: "Set the pace—crush at least 2 goals every month.",               requirement: "Complete 2 goals this month",                    icon: "🎯", points: 130,  category: "challenges", periodic: "monthly"  },
  // Seasonal
  { key: "seasonal_quiz_50",  title: "Seasonal Scholar",    description: "Fifty quizzes a season proves you're always in study mode.",     requirement: "Complete 50 quizzes this season",                icon: "📚", points: 1200, category: "challenges", periodic: "seasonal" },
  { key: "seasonal_notes_20", title: "Seasonal Author",     description: "Twenty notes across a season—your knowledge library is growing.", requirement: "Write 20 notes this season",                    icon: "🗒️", points: 960,  category: "challenges", periodic: "seasonal" },
  { key: "seasonal_mood_50",  title: "Seasonal Wellness",   description: "Fifty mood logs in one season—you're truly in tune with yourself.", requirement: "Log your mood 50 times this season",          icon: "🌸", points: 720,  category: "challenges", periodic: "seasonal" },
];

// ─── Period helpers ───────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getSeasonStart(date: Date): Date {
  const q = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(date.getUTCFullYear(), q * 3, 1));
}

export function getSeasonKey(date: Date): string {
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${q}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AchievementWithStatus extends AchievementDef {
  earned: boolean;
  earnedAt?: string;
  timesEarned?: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUserAchievements(userId: string): Promise<AchievementWithStatus[]> {
  const earned = await db
    .select()
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));

  const earnedMap = new Map(earned.map(e => [e.achievementKey, e.earnedAt]));

  const now = new Date();
  const currentWeekKey   = getWeekKey(now);
  const currentMonthKey  = getMonthKey(now);
  const currentSeasonKey = getSeasonKey(now);

  return ACHIEVEMENTS.map(a => {
    if (a.periodic) {
      const prefix = `${a.key}__`;
      const matches = earned.filter(e => e.achievementKey.startsWith(prefix));
      const timesEarned = matches.length;
      const latest = matches.sort((x, y) => y.earnedAt.getTime() - x.earnedAt.getTime())[0];

      // Only mark as earned if it was completed in the CURRENT period.
      // This ensures weekly objectives reset each week, monthly each month, etc.
      const currentPeriodKey =
        a.periodic === "weekly"   ? currentWeekKey   :
        a.periodic === "monthly"  ? currentMonthKey  :
                                    currentSeasonKey;
      const earnedThisPeriod = matches.some(e => e.achievementKey === `${a.key}__${currentPeriodKey}`);

      return {
        ...a,
        earned: earnedThisPeriod,
        earnedAt: latest?.earnedAt.toISOString(),
        timesEarned,
      };
    }
    return {
      ...a,
      earned: earnedMap.has(a.key),
      earnedAt: earnedMap.get(a.key)?.toISOString(),
      timesEarned: earnedMap.has(a.key) ? 1 : 0,
    };
  });
}

export async function checkAndAwardAchievements(userId: string): Promise<AchievementDef[]> {
  const now = new Date();
  const weekStart   = getWeekStart(now);
  const monthStart  = getMonthStart(now);
  const seasonStart = getSeasonStart(now);
  const weekKey     = getWeekKey(now);
  const monthKey    = getMonthKey(now);
  const seasonKey   = getSeasonKey(now);

  const [
    alreadyEarned,
    [userRow],
    [{ notesCount }],
    [{ subjectsCount }],
    [{ goalsCount }],
    [{ goalsCompletedCount }],
    [{ schedulesCount }],
    [{ moodsCount }],
    userScores,
    examSchedule,
    ecaSchedule,
    [{ totalBubbles }],
    bestMemoryTime,
    // ── Period-bounded counts ──────────────────────────────────────────────────
    // Quiz (scoresTable has userId — per-user accurate)
    [{ weeklyQuizCount }],
    [{ monthlyQuizCount }],
    [{ seasonalQuizCount }],
    // Notes (no userId on notesTable — global, matches existing behavior)
    [{ weeklyNotesCount }],
    [{ monthlyNotesCount }],
    [{ seasonalNotesCount }],
    // Mood (no userId on moodsTable — global)
    [{ weeklyMoodCount }],
    [{ monthlyMoodCount }],
    [{ seasonalMoodCount }],
    // Goals completed (no userId — global)
    [{ weeklyGoalsCompleted }],
    [{ monthlyGoalsCompleted }],
    // Schedules created this month (no userId — global)
    [{ monthlySchedulesCount }],
    // Bubble pop sums (scoresTable has userId — per-user accurate)
    [{ weeklyBubbles }],
    [{ monthlyBubbles }],
    [{ seasonalBubbles }],
  ] = await Promise.all([
    db.select({ key: userAchievementsTable.achievementKey }).from(userAchievementsTable).where(eq(userAchievementsTable.userId, userId)),
    db.select({ level: usersTable.level, gameLevel: usersTable.gameLevel }).from(usersTable).where(eq(usersTable.id, userId)),
    db.select({ notesCount: count() }).from(notesTable),
    db.select({ subjectsCount: count() }).from(subjectsTable),
    db.select({ goalsCount: count() }).from(goalsTable),
    db.select({ goalsCompletedCount: count() }).from(goalsTable).where(eq(goalsTable.completed, true)),
    db.select({ schedulesCount: count() }).from(schedulesTable),
    db.select({ moodsCount: count() }).from(moodsTable),
    db.select({ gameType: scoresTable.gameType }).from(scoresTable).where(eq(scoresTable.userId, userId)),
    db.select({ id: schedulesTable.id }).from(schedulesTable).where(eq(schedulesTable.eventType, "exam")).limit(1),
    db.select({ id: schedulesTable.id }).from(schedulesTable).where(eq(schedulesTable.eventType, "eca")).limit(1),
    db.select({ totalBubbles: sql<number>`coalesce(sum(${scoresTable.score}), 0)` })
      .from(scoresTable)
      .where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "bubble-pop"))),
    db.select({ secondsTaken: scoresTable.secondsTaken })
      .from(scoresTable)
      .where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "memory-match"), isNotNull(scoresTable.secondsTaken)))
      .orderBy(asc(scoresTable.secondsTaken))
      .limit(1),
    // Quiz counts per period
    db.select({ weeklyQuizCount: count() }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "quiz"), gte(scoresTable.createdAt, weekStart))),
    db.select({ monthlyQuizCount: count() }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "quiz"), gte(scoresTable.createdAt, monthStart))),
    db.select({ seasonalQuizCount: count() }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "quiz"), gte(scoresTable.createdAt, seasonStart))),
    // Notes per period — use note_events so deletions don't reduce progress
    db.select({ weeklyNotesCount: count() }).from(noteEventsTable).where(and(eq(noteEventsTable.userId, userId), gte(noteEventsTable.createdAt, weekStart))),
    db.select({ monthlyNotesCount: count() }).from(noteEventsTable).where(and(eq(noteEventsTable.userId, userId), gte(noteEventsTable.createdAt, monthStart))),
    db.select({ seasonalNotesCount: count() }).from(noteEventsTable).where(and(eq(noteEventsTable.userId, userId), gte(noteEventsTable.createdAt, seasonStart))),
    // Mood per period
    db.select({ weeklyMoodCount: count() }).from(moodsTable).where(gte(moodsTable.createdAt, weekStart)),
    db.select({ monthlyMoodCount: count() }).from(moodsTable).where(gte(moodsTable.createdAt, monthStart)),
    db.select({ seasonalMoodCount: count() }).from(moodsTable).where(gte(moodsTable.createdAt, seasonStart)),
    // Goals completed per period (using createdAt as proxy)
    db.select({ weeklyGoalsCompleted: count() }).from(goalsTable).where(and(eq(goalsTable.completed, true), gte(goalsTable.createdAt, weekStart))),
    db.select({ monthlyGoalsCompleted: count() }).from(goalsTable).where(and(eq(goalsTable.completed, true), gte(goalsTable.createdAt, monthStart))),
    // Schedules created this month
    db.select({ monthlySchedulesCount: count() }).from(schedulesTable).where(gte(schedulesTable.createdAt, monthStart)),
    // Bubble pop sums per period
    db.select({ weeklyBubbles: sql<number>`coalesce(sum(${scoresTable.score}), 0)` }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "bubble-pop"), gte(scoresTable.createdAt, weekStart))),
    db.select({ monthlyBubbles: sql<number>`coalesce(sum(${scoresTable.score}), 0)` }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "bubble-pop"), gte(scoresTable.createdAt, monthStart))),
    db.select({ seasonalBubbles: sql<number>`coalesce(sum(${scoresTable.score}), 0)` }).from(scoresTable).where(and(eq(scoresTable.userId, userId), eq(scoresTable.gameType, "bubble-pop"), gte(scoresTable.createdAt, seasonStart))),
  ]);

  const alreadyEarnedSet = new Set(alreadyEarned.map(e => e.key));

  // Total points earned (handles both permanent and periodic keys)
  const earnedPointsTotal = alreadyEarned.reduce((sum, e) => {
    const baseKey = e.key.includes("__") ? e.key.split("__")[0] : e.key;
    const def = ACHIEVEMENTS.find(a => a.key === baseKey);
    return sum + (def?.points ?? 0);
  }, 0);

  const gameTypes       = new Set(userScores.map(s => s.gameType));
  const quizScoreCount  = userScores.filter(s => s.gameType === "quiz").length;
  const bubbleTotal     = Number(totalBubbles ?? 0);
  const bestMemorySecs  = bestMemoryTime[0]?.secondsTaken ?? null;
  const gameLevel       = userRow?.gameLevel ?? 1;
  const wBubbles        = Number(weeklyBubbles ?? 0);
  const mBubbles        = Number(monthlyBubbles ?? 0);
  const sBubbles        = Number(seasonalBubbles ?? 0);

  const conditions: Record<string, boolean> = {

    // ── Permanent ─────────────────────────────────────────────────────────────
    welcome:          true,
    level_set:        !!userRow?.level,
    first_note:       notesCount >= 1,
    first_subject:    subjectsCount >= 1,
    subjects_3:       subjectsCount >= 3,
    first_goal:       goalsCount >= 1,
    goal_completed:   goalsCompletedCount >= 1,
    first_event:      schedulesCount >= 1,
    exam_scheduled:   examSchedule.length > 0,
    eca_scheduled:    ecaSchedule.length > 0,
    first_mood:       moodsCount >= 1,
    memory_match:     gameTypes.has("memory-match"),
    bubble_pop:       gameTypes.has("bubble-pop"),
    quiz_submitted:   quizScoreCount >= 1,
    quiz_first_attempt: quizScoreCount >= 1,
    quiz_master_200:  quizScoreCount >= 200,
    all_games:        gameTypes.has("memory-match") && gameTypes.has("bubble-pop") && gameTypes.has("quiz"),
    bubbles_200:      bubbleTotal >= 200,
    bubbles_500:      bubbleTotal >= 500,
    bubbles_1000:     bubbleTotal >= 1000,
    bubbles_5000:     bubbleTotal >= 5000,
    game_level_1:     gameLevel >= 1,
    game_level_25:    gameLevel >= 25,
    game_level_50:    gameLevel >= 50,
    game_level_75:    gameLevel >= 75,
    game_level_100:   gameLevel >= 100,
    points_50:        earnedPointsTotal >= 50,
    points_500:       earnedPointsTotal >= 500,
    points_2000:      earnedPointsTotal >= 2000,
    points_5000:      earnedPointsTotal >= 5000,
    points_10000:     earnedPointsTotal >= 10000,
    memory_under_50:  bestMemorySecs !== null && bestMemorySecs <= 50,
    memory_under_30:  bestMemorySecs !== null && bestMemorySecs <= 30,
    memory_under_20:  bestMemorySecs !== null && bestMemorySecs <= 20,
    memory_under_15:  bestMemorySecs !== null && bestMemorySecs <= 15,
    memory_under_10:  bestMemorySecs !== null && bestMemorySecs <= 10,

    // ── Periodic: Notes ────────────────────────────────────────────────────────
    [`notes_5__${monthKey}`]:  monthlyNotesCount >= 5,
    [`notes_20__${monthKey}`]: monthlyNotesCount >= 20,

    // ── Periodic: Goals ────────────────────────────────────────────────────────
    [`goals_5_done__${monthKey}`]: monthlyGoalsCompleted >= 5,

    // ── Periodic: Timetable ────────────────────────────────────────────────────
    [`events_5__${monthKey}`]: monthlySchedulesCount >= 5,

    // ── Periodic: Mood ─────────────────────────────────────────────────────────
    [`mood_7__${weekKey}`]:   weeklyMoodCount >= 7,
    [`mood_30__${monthKey}`]: monthlyMoodCount >= 30,

    // ── Periodic: Quiz ─────────────────────────────────────────────────────────
    [`quiz_5__${weekKey}`]:                weeklyQuizCount >= 5,
    [`quiz_10__${monthKey}`]:              monthlyQuizCount >= 10,
    [`quiz_curious_learner__${monthKey}`]: monthlyQuizCount >= 15,
    [`quiz_dedicated_scholar__${monthKey}`]: monthlyQuizCount >= 30,
    [`quiz_knowledge_seeker__${seasonKey}`]: seasonalQuizCount >= 100,

    // ── Periodic: Games (Bubble Pop) ───────────────────────────────────────────
    [`bubbles_weekly_30__${weekKey}`]:    wBubbles >= 30,
    [`bubbles_weekly_75__${weekKey}`]:    wBubbles >= 75,
    [`bubbles_weekly_150__${weekKey}`]:   wBubbles >= 150,
    [`bubbles_monthly_100__${monthKey}`]: mBubbles >= 100,
    [`bubbles_monthly_300__${monthKey}`]: mBubbles >= 300,
    [`bubbles_monthly_600__${monthKey}`]: mBubbles >= 600,
    [`bubbles_seasonal_500__${seasonKey}`]:  sBubbles >= 500,
    [`bubbles_seasonal_1500__${seasonKey}`]: sBubbles >= 1500,

    // ── Periodic: Challenges ───────────────────────────────────────────────────
    [`weekly_quiz_5__${weekKey}`]:    weeklyQuizCount >= 5,
    [`weekly_notes_3__${weekKey}`]:   weeklyNotesCount >= 3,
    [`weekly_mood_5__${weekKey}`]:    weeklyMoodCount >= 5,
    [`monthly_quiz_20__${monthKey}`]:  monthlyQuizCount >= 20,
    [`monthly_notes_10__${monthKey}`]: monthlyNotesCount >= 10,
    [`monthly_mood_20__${monthKey}`]:  monthlyMoodCount >= 20,
    [`monthly_goals_2__${monthKey}`]:  monthlyGoalsCompleted >= 2,
    [`seasonal_quiz_50__${seasonKey}`]:  seasonalQuizCount >= 50,
    [`seasonal_notes_20__${seasonKey}`]: seasonalNotesCount >= 20,
    [`seasonal_mood_50__${seasonKey}`]:  seasonalMoodCount >= 50,
  };

  const newlyEarned: AchievementDef[] = [];
  for (const [key, earned] of Object.entries(conditions)) {
    if (earned && !alreadyEarnedSet.has(key)) {
      const baseKey = key.includes("__") ? key.split("__")[0] : key;
      const def = ACHIEVEMENTS.find(a => a.key === baseKey);
      if (def) {
        await db.insert(userAchievementsTable).values({ userId, achievementKey: key }).onConflictDoNothing();
        newlyEarned.push(def);
      }
    }
  }

  return newlyEarned;
}

export function getTotalPoints(achievements: AchievementWithStatus[]): number {
  return achievements.reduce((sum, a) => {
    if (!a.earned) return sum;
    return sum + a.points * (a.timesEarned ?? 1);
  }, 0);
}

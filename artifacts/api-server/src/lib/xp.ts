import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// XP required to reach each level (index = level - 1, so index 0 = level 1)
// Level 1-5:   50 XP per level
// Level 5-15:  100 XP per level
// Level 15-30: 150 XP per level
// Level 30-60: 200 XP per level
// Level 60-80: 300 XP per level
// Level 80-85: 400 XP per level
// Level 85-90: 500 XP per level
// Level 90-100: 600/700/800/900/1000/1250/1500/1750/2000/3000 XP
export const LEVEL_THRESHOLDS = [
  0,     // Level 1
  50,    // Level 2
  100,   // Level 3
  150,   // Level 4
  200,   // Level 5
  300,   // Level 6
  400,   // Level 7
  500,   // Level 8
  600,   // Level 9
  700,   // Level 10
  800,   // Level 11
  900,   // Level 12
  1000,  // Level 13
  1100,  // Level 14
  1200,  // Level 15
  1350,  // Level 16
  1500,  // Level 17
  1650,  // Level 18
  1800,  // Level 19
  1950,  // Level 20
  2100,  // Level 21
  2250,  // Level 22
  2400,  // Level 23
  2550,  // Level 24
  2700,  // Level 25
  2850,  // Level 26
  3000,  // Level 27
  3150,  // Level 28
  3300,  // Level 29
  3450,  // Level 30
  3650,  // Level 31
  3850,  // Level 32
  4050,  // Level 33
  4250,  // Level 34
  4450,  // Level 35
  4650,  // Level 36
  4850,  // Level 37
  5050,  // Level 38
  5250,  // Level 39
  5450,  // Level 40
  5650,  // Level 41
  5850,  // Level 42
  6050,  // Level 43
  6250,  // Level 44
  6450,  // Level 45
  6650,  // Level 46
  6850,  // Level 47
  7050,  // Level 48
  7250,  // Level 49
  7450,  // Level 50
  7650,  // Level 51
  7850,  // Level 52
  8050,  // Level 53
  8250,  // Level 54
  8450,  // Level 55
  8650,  // Level 56
  8850,  // Level 57
  9050,  // Level 58
  9250,  // Level 59
  9450,  // Level 60
  9750,  // Level 61
  10050, // Level 62
  10350, // Level 63
  10650, // Level 64
  10950, // Level 65
  11250, // Level 66
  11550, // Level 67
  11850, // Level 68
  12150, // Level 69
  12450, // Level 70
  12750, // Level 71
  13050, // Level 72
  13350, // Level 73
  13650, // Level 74
  13950, // Level 75
  14250, // Level 76
  14550, // Level 77
  14850, // Level 78
  15150, // Level 79
  15450, // Level 80
  15850, // Level 81
  16250, // Level 82
  16650, // Level 83
  17050, // Level 84
  17450, // Level 85
  17950, // Level 86
  18450, // Level 87
  18950, // Level 88
  19450, // Level 89
  19950, // Level 90
  20550, // Level 91
  21250, // Level 92
  22050, // Level 93
  22950, // Level 94
  23950, // Level 95
  25200, // Level 96
  26700, // Level 97
  28450, // Level 98
  30450, // Level 99
  33450, // Level 100 (max)
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  return Math.min(level, MAX_LEVEL);
}

export function getXpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] ?? 0;
}

export function getXpForNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level] ?? null;
}

export function getLevelProgress(xp: number): { level: number; currentXp: number; xpInLevel: number; xpNeeded: number; progress: number } {
  const level = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForNextLevel(level);
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp !== null ? nextLevelXp - currentLevelXp : 0;
  const progress = nextLevelXp !== null ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
  return { level, currentXp: xp, xpInLevel, xpNeeded, progress };
}

export async function awardXp(userId: string, amount: number): Promise<{ newXp: number; newLevel: number; leveledUp: boolean; oldLevel: number }> {
  const [user] = await db.select({ xp: usersTable.xp, gameLevel: usersTable.gameLevel }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) throw new Error("User not found");

  const oldLevel = user.gameLevel ?? 1;
  const newXp = (user.xp ?? 0) + amount;
  const newLevel = getLevelFromXp(newXp);
  const leveledUp = newLevel > oldLevel;

  await db.update(usersTable).set({ xp: newXp, gameLevel: newLevel }).where(eq(usersTable.id, userId));

  return { newXp, newLevel, leveledUp, oldLevel };
}

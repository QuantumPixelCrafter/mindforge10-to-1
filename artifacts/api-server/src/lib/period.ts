export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getPrevWeekKey(date: Date = new Date()): string {
  const prev = new Date(date);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return getWeekKey(prev);
}

export function getPrevMonthKey(date: Date = new Date()): string {
  const prev = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return getMonthKey(prev);
}

export function getNextWeeklyReset(from: Date = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  return d;
}

export function getNextMonthlyReset(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

export type WeeklyRewardTier = { minRank: number; maxRank: number; xp: number; coins: number };

export const WEEKLY_REWARDS: WeeklyRewardTier[] = [
  { minRank: 1,  maxRank: 1,  xp: 300, coins: 150 },
  { minRank: 2,  maxRank: 2,  xp: 200, coins: 100 },
  { minRank: 3,  maxRank: 3,  xp: 150, coins: 75  },
  { minRank: 4,  maxRank: 10, xp: 100, coins: 50  },
  { minRank: 11, maxRank: 25, xp: 60,  coins: 30  },
  { minRank: 26, maxRank: 50, xp: 30,  coins: 15  },
];

export const SEASON_REWARDS: WeeklyRewardTier[] = [
  { minRank: 1,  maxRank: 1,  xp: 1000, coins: 500 },
  { minRank: 2,  maxRank: 2,  xp: 600,  coins: 300 },
  { minRank: 3,  maxRank: 3,  xp: 450,  coins: 225 },
  { minRank: 4,  maxRank: 10, xp: 300,  coins: 150 },
  { minRank: 11, maxRank: 25, xp: 180,  coins: 90  },
  { minRank: 26, maxRank: 50, xp: 90,   coins: 45  },
];

export function getRewardForRank(rank: number, tiers: WeeklyRewardTier[]): { xp: number; coins: number } | null {
  const tier = tiers.find(t => rank >= t.minRank && rank <= t.maxRank);
  return tier ? { xp: tier.xp, coins: tier.coins } : null;
}

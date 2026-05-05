import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetAchievements, useCheckAchievements } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Star, Lock, CheckCircle2, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

const PERIODIC_META = {
  weekly:   { emoji: "📅", color: "bg-sky-500/15 text-sky-600 dark:text-sky-400",         dot: "bg-sky-500",    ringColor: "ring-sky-400/30",    gradient: "from-sky-400 to-cyan-500",      border: "border-sky-200 dark:border-sky-900",     headerBg: "from-sky-500 to-cyan-400" },
  monthly:  { emoji: "🗓️", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400", dot: "bg-violet-500", ringColor: "ring-violet-400/30", gradient: "from-violet-400 to-purple-500",  border: "border-violet-200 dark:border-violet-900", headerBg: "from-violet-500 to-purple-400" },
  seasonal: { emoji: "🌸", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",   dot: "bg-amber-500",  ringColor: "ring-amber-400/30",  gradient: "from-amber-400 to-orange-500",  border: "border-amber-200 dark:border-amber-900",  headerBg: "from-amber-500 to-orange-400" },
};

function getWeekEnd(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getSeasonEnd(): Date {
  const now = new Date();
  const lastMonthOfQ = (Math.floor(now.getMonth() / 3) + 1) * 3;
  return new Date(now.getFullYear(), lastMonthOfQ, 0, 23, 59, 59, 999);
}

function daysUntil(date: Date): number {
  const now = new Date();
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86400000));
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PERIOD_ENDS = {
  weekly:   getWeekEnd(),
  monthly:  getMonthEnd(),
  seasonal: getSeasonEnd(),
};

const PERIOD_ORDER: Array<"weekly" | "monthly" | "seasonal"> = ["weekly", "monthly", "seasonal"];

export default function ObjectivesPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data, isLoading, isError } = useGetAchievements();
  const checkMut = useCheckAchievements();
  const [newlyEarnedKeys, setNewlyEarnedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    customFetch<{ granted: boolean; quantity?: number }>("/api/powerups/weekly-grant", { method: "POST" })
      .then((res) => {
        if (res.granted) {
          toast({
            title: "🔄 Weekly Retry Passes granted!",
            description: "3 Retry Passes have been added to your inventory. Check your inbox!",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkMut.mutate(undefined, {
      onSuccess: (res) => {
        if (res.newlyEarned.length > 0) {
          setNewlyEarnedKeys(new Set(res.newlyEarned.map((a: any) => a.key)));
          res.newlyEarned.forEach((a: any) => {
            toast({ title: `Objective Complete! ${a.icon} ${a.title}`, description: `+${a.points} pts — ${a.description}` });
          });
          setTimeout(() => setNewlyEarnedKeys(new Set()), 3000);
        }
      },
    });
  }, []);

  const allAchievements = data?.achievements ?? [];
  const objectives = allAchievements.filter((a: any) => a.periodic);

  const totalObjectives = objectives.length;
  const earnedObjectives = objectives.filter((a: any) => a.earned).length;
  const pct = totalObjectives > 0 ? Math.round((earnedObjectives / totalObjectives) * 100) : 0;

  const periodLabels: Record<string, string> = {
    weekly: t.objectives.weekly,
    monthly: t.objectives.monthly,
    seasonal: t.objectives.seasonal,
  };

  return (
    <Layout title="Objectives">
      <div className="space-y-5 pb-12">

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-sky-500 via-violet-500 to-amber-500 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-sm font-medium">{t.objectives.periodicObjectives}</p>
              <p className="text-4xl font-black tracking-tight">
                {earnedObjectives} <span className="text-xl font-bold text-white/70">/ {totalObjectives}</span>
              </p>
              <p className="text-white/60 text-xs mt-1">{t.objectives.resetNote}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">
              🎯
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-white/80">{t.objectives.currentProgress}</span>
              <span className="text-white/80">{pct}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-4 text-xs text-white/70">
              <span>✅ <span className="font-bold text-white">{earnedObjectives}</span> {t.objectives.done}</span>
              <span>⏳ <span className="font-bold text-white">{totalObjectives - earnedObjectives}</span> {t.objectives.remaining}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkMut.mutate(undefined, {
                onSuccess: (res) => {
                  if (res.newlyEarned.length > 0) {
                    setNewlyEarnedKeys(new Set(res.newlyEarned.map((a: any) => a.key)));
                    res.newlyEarned.forEach((a: any) => toast({ title: `Objective Complete! ${a.icon} ${a.title}`, description: `+${a.points} pts` }));
                    setTimeout(() => setNewlyEarnedKeys(new Set()), 3000);
                  } else {
                    toast({ title: t.objectives.allCaughtUp, description: t.objectives.noNewObjectives });
                  }
                },
              })}
              disabled={checkMut.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className={cn("w-3 h-3", checkMut.isPending && "animate-spin")} />
              {checkMut.isPending ? t.objectives.checking : t.objectives.refresh}
            </Button>
          </div>
        </motion.div>

        {/* Period reset countdown row */}
        <div className="grid grid-cols-3 gap-2">
          {PERIOD_ORDER.map((period) => {
            const m = PERIODIC_META[period];
            const end = PERIOD_ENDS[period];
            const days = daysUntil(end);
            const urgency = days === 0
              ? t.objectives.endsToday
              : days === 1
              ? t.objectives.oneDayLeft
              : t.objectives.daysLeft.replace("{n}", String(days));
            const periodObjs = objectives.filter((a: any) => a.periodic === period);
            const periodEarned = periodObjs.filter((a: any) => a.earned).length;
            return (
              <div key={period} className={cn("rounded-2xl border p-3 space-y-1 ring-1 bg-card border-border", m.ringColor)}>
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", m.dot)} />
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", m.color)}>{periodLabels[period]}</span>
                </div>
                <p className="text-xs font-bold text-foreground">{periodEarned}/{periodObjs.length} {t.objectives.done}</p>
                <p className="text-[10px] text-muted-foreground">{t.objectives.ends} {fmtDate(end)}</p>
                <p className={cn("text-[10px] font-medium", days <= 2 ? "text-red-500 dark:text-red-400" : "text-muted-foreground")}>
                  {urgency}
                </p>
              </div>
            );
          })}
        </div>

        {/* Objectives grouped by period */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-28 rounded-full bg-muted/60 animate-pulse" />
                <div className="rounded-2xl border overflow-hidden divide-y divide-border">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="h-14 bg-muted/30 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-1">{t.objectives.couldntLoad}</p>
            <p className="text-sm">{t.objectives.loginTryAgain}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {PERIOD_ORDER.map((period, periodIdx) => {
              const m = PERIODIC_META[period];
              const periodObjs = objectives.filter((a: any) => a.periodic === period);
              if (periodObjs.length === 0) return null;
              const periodEarned = periodObjs.filter((a: any) => a.earned).length;

              return (
                <motion.div
                  key={period}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: periodIdx * 0.06 }}
                >
                  {/* Period header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shrink-0", m.color)}>
                      <span>{m.emoji}</span>
                      <span>{periodLabels[period]}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">
                      {periodEarned} / {periodObjs.length}
                    </span>
                  </div>

                  {/* Objective rows */}
                  <div className={cn("rounded-2xl border overflow-hidden divide-y", m.border)}>
                    {periodObjs.map((a: any) => {
                      const isNew = newlyEarnedKeys.has(a.key);
                      const timesEarned = a.timesEarned ?? 0;

                      return (
                        <div
                          key={a.key}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3",
                            a.earned ? "bg-card" : "bg-muted/10"
                          )}
                        >
                          {/* Icon */}
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
                            a.earned
                              ? cn("bg-gradient-to-br", m.gradient)
                              : "bg-muted/50 border border-border"
                          )}>
                            <span className={cn("select-none text-lg", !a.earned && "grayscale opacity-50")}>
                              {a.icon}
                            </span>
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                "text-sm font-semibold",
                                a.earned ? "text-foreground" : "text-foreground/60"
                              )}>
                                {a.title}
                              </span>

                              {isNew && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary text-white animate-pulse">
                                  {t.objectives.newBadge}
                                </span>
                              )}

                              {timesEarned > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                                  {timesEarned}{t.objectives.timesEarned}
                                </span>
                              )}

                              {!a.earned && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                  {t.objectives.locked}
                                </span>
                              )}
                            </div>

                            {a.requirement ? (
                              <p className={cn(
                                "text-xs mt-0.5 font-medium",
                                a.earned ? "text-muted-foreground" : "text-muted-foreground/80"
                              )}>
                                {a.earned ? "✓ " : "→ "}{a.requirement}
                              </p>
                            ) : (
                              <p className={cn(
                                "text-xs mt-0.5",
                                a.earned ? "text-muted-foreground" : "text-muted-foreground/70"
                              )}>
                                {a.description}
                              </p>
                            )}
                          </div>

                          {/* Points */}
                          <div className={cn(
                            "shrink-0 flex items-center gap-0.5 text-xs font-bold",
                            a.earned ? "text-amber-500" : "text-muted-foreground/50"
                          )}>
                            <Star className={cn("w-3 h-3", a.earned && "fill-amber-400 text-amber-400")} />
                            {a.points}
                          </div>

                          {/* Status */}
                          <div className="shrink-0 w-6 flex items-center justify-center">
                            {a.earned ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/20" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

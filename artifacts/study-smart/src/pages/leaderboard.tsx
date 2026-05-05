import { useState, useEffect } from "react";
import { useGetLeaderboard, useMathBlitzLeaderboard } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Layout } from "@/components/layout";
import { Leaf, Sparkles, Trophy, GraduationCap, Zap, Clock, Gift, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getItemDef } from "@/lib/shop-data";
import type { LevelBoardEntry } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/language-context";

const ALL_LEVELS = ["P1","P2","P3","P4","P5","P6","S1","S2","S3","S4","S5","S6","U1","U2","U3","U4"];

const GAME_TABS = [
  { key: "bubblePop",   label: "Bubble Pop",   icon: Leaf,       color: "text-sky-500",    bg: "bg-sky-500/10",    gradient: "from-sky-400 to-violet-500" },
  { key: "quiz",        label: "Quiz Scores",  icon: Sparkles,   color: "text-amber-500",  bg: "bg-amber-500/10",  gradient: "from-amber-400 to-orange-500" },
] as const;

const EXTRA_TABS = [
  { key: "level", label: "Level", icon: Zap, color: "text-violet-500", bg: "bg-violet-500/10", gradient: "from-violet-500 to-fuchsia-500" },
] as const;

const ALL_TABS = [...GAME_TABS, ...EXTRA_TABS] as const;
type TabKey = (typeof ALL_TABS)[number]["key"];
type BoardType = "weekly" | "season";


function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
}

function useCountdown(targetIso: string | undefined) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!targetIso) return;
    const update = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      const s = Math.floor(diff / 1000);
      setRemaining({ days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}

const WEEKLY_PRIZES = [
  { label: "🥇 1st",      xp: 300,  coins: 150 },
  { label: "🥈 2nd",      xp: 200,  coins: 100 },
  { label: "🥉 3rd",      xp: 150,  coins: 75  },
  { label: "🏅 4–10th",   xp: 100,  coins: 50  },
  { label: "🎖 11–25th",  xp: 60,   coins: 30  },
  { label: "⭐ 26–50th",  xp: 30,   coins: 15  },
];

const SEASON_PRIZES = [
  { label: "🥇 1st",      xp: 1000, coins: 500 },
  { label: "🥈 2nd",      xp: 600,  coins: 300 },
  { label: "🥉 3rd",      xp: 450,  coins: 225 },
  { label: "🏅 4–10th",   xp: 300,  coins: 150 },
  { label: "🎖 11–25th",  xp: 180,  coins: 90  },
  { label: "⭐ 26–50th",  xp: 90,   coins: 45  },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<TabKey>("bubblePop");
  const [boardType, setBoardType] = useState<BoardType>("weekly");
  const [showPrizes, setShowPrizes] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const BOARD_LABELS: Record<BoardType, { label: string; short: string; color: string }> = {
    weekly: { label: t.leaderboard.weeklyTitle, short: "Weekly",  color: "from-sky-500 to-cyan-400" },
    season: { label: t.leaderboard.monthlyTitle, short: "Season", color: "from-fuchsia-500 to-violet-500" },
  };

  const [quizLevel, setQuizLevel] = useState<string>("");
  const [mbDiff, setMbDiff] = useState<"easy" | "normal" | "hard">("easy");
  const { data: mbBoard } = useMathBlitzLeaderboard(tab === "mathBlitz");

  useEffect(() => {
    if (user?.level && !quizLevel) setQuizLevel(user.level);
  }, [user?.level]);

  const params: Record<string, string> = { boardType };
  if (tab === "quiz") {
    if (quizLevel) params.quizLevel = quizLevel;
  }

  const { data: lb, isLoading } = useGetLeaderboard(params);

  const entries = tab === "quiz" ? (lb?.quiz ?? [])
    : tab === "bubblePop" ? (lb?.bubblePop ?? [])
    : [];

  const levelBoardEntries: LevelBoardEntry[] = tab === "level" ? ((lb as any)?.levelBoard ?? []) : [];
  const activeTab = ALL_TABS.find(t => t.key === tab)!;
  const meta = (lb as any)?.meta as { boardType: string; nextReset: string } | undefined;

  const nextReset = meta?.nextReset;
  const countdown = useCountdown(tab !== "level" ? nextReset : undefined);
  const prizes = boardType === "weekly" ? WEEKLY_PRIZES : SEASON_PRIZES;

  return (
    <Layout title="Leaderboard">
      <div className="max-w-2xl mx-auto space-y-5 py-4">
        {/* Game Type Tabs */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
          {ALL_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200",
                tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className={cn("w-4 h-4", tab === t.key ? t.color : "")} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Weekly / Season toggle (only for game score tabs, not Math Blitz which is all-time) */}
        {tab !== "level" && tab !== "mathBlitz" && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit mx-auto">
            {(["weekly", "season"] as BoardType[]).map(bt => (
              <button
                key={bt}
                onClick={() => setBoardType(bt)}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-sm font-bold transition-all duration-200",
                  boardType === bt
                    ? bt === "weekly"
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                      : "bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {BOARD_LABELS[bt].label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Header card with countdown */}
        <div className={cn(
          "rounded-3xl bg-gradient-to-r p-6 text-white shadow-xl",
          tab === "level" ? activeTab.gradient : tab === "mathBlitz" ? activeTab.gradient : BOARD_LABELS[boardType].color
        )}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Trophy className="w-5 h-5" />
                <h2 className="text-lg font-bold leading-tight">
                  {tab === "level"
                    ? t.leaderboard.levelTitle
                    : tab === "mathBlitz"
                    ? "Math Blitz · All-Time Best"
                    : `${activeTab.label} · ${BOARD_LABELS[boardType].label}`}
                </h2>
              </div>
              <p className="text-white/75 text-sm">
                {tab === "level"
                  ? "Top 50 students ranked by XP earned"
                  : tab === "mathBlitz"
                  ? "All-time highest scores per difficulty"
                  : `Top 50 scores — resets automatically when the period ends`}
              </p>
            </div>
            {tab !== "level" && tab !== "mathBlitz" && (
              <button
                onClick={() => setShowPrizes(p => !p)}
                className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors"
              >
                <Gift className="w-3.5 h-3.5" /> Prizes
              </button>
            )}
          </div>

          {/* Countdown timer */}
          {countdown && tab !== "level" && tab !== "mathBlitz" && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-white/70 shrink-0" />
              <span className="text-white/70 text-xs font-medium">{t.leaderboard.resetsIn}</span>
              {[
                { v: countdown.days,    label: t.leaderboard.days },
                { v: countdown.hours,   label: t.leaderboard.hours },
                { v: countdown.minutes, label: t.leaderboard.min },
                { v: countdown.seconds, label: t.leaderboard.sec },
              ].map(({ v, label }) => (
                <div key={label} className="flex items-baseline gap-0.5 bg-white/15 rounded-lg px-2.5 py-1">
                  <span className="text-base font-extrabold tabular-nums">{String(v).padStart(2, "0")}</span>
                  <span className="text-[10px] text-white/60 uppercase tracking-wide ml-0.5">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prize tiers panel */}
        <AnimatePresence>
          {showPrizes && tab !== "level" && tab !== "mathBlitz" && (
            <motion.div
              key="prizes"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  {BOARD_LABELS[boardType].label} End Rewards
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {prizes.map(p => (
                    <div key={p.label} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
                      <span className="text-xs font-bold">{p.label}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-violet-500 font-bold">+{p.xp} XP</span>
                        <span className="text-amber-500 font-bold">+{p.coins} ⭐</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Rewards are sent automatically when the period resets. Only top 50 qualify.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Filters */}
        {tab === "quiz" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Filter by Level
            </p>
            <div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setQuizLevel("")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", !quizLevel ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  All
                </button>
                {ALL_LEVELS.map(l => (
                  <button key={l} onClick={() => setQuizLevel(l)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      quizLevel === l
                        ? l.startsWith("P") ? "bg-green-500 text-white shadow-md" : l.startsWith("S") ? "bg-blue-500 text-white shadow-md" : "bg-purple-500 text-white shadow-md"
                        : l.startsWith("P") ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          : l.startsWith("S") ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                          : "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20"
                    )}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {user?.level && !quizLevel && (
              <p className="text-xs text-muted-foreground">
                Your level is <span className="font-bold text-primary">{user.level}</span> — select it above to see your competition.
              </p>
            )}
          </motion.div>
        )}

        {/* Math Blitz board */}
        {tab === "mathBlitz" && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Difficulty sub-tabs */}
            <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit mx-auto">
              {([
                { key: "easy",   label: "Easy",         color: "bg-green-500",  shadow: "shadow-green-500/30" },
                { key: "normal", label: "Normal",        color: "bg-blue-500",   shadow: "shadow-blue-500/30" },
                { key: "hard",   label: "Hard + Extreme",color: "bg-red-500",    shadow: "shadow-red-500/30" },
              ] as const).map(d => (
                <button
                  key={d.key}
                  onClick={() => setMbDiff(d.key)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200",
                    mbDiff === d.key
                      ? `${d.color} text-white shadow-md ${d.shadow}`
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Board entries */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
              {(() => {
                const mbEntries: any[] = (mbBoard as any)?.[mbDiff] ?? [];
                if (mbEntries.length === 0) {
                  return (
                    <div className="py-20 text-center">
                      <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="font-semibold text-lg mb-1">No scores yet</p>
                      <p className="text-muted-foreground text-sm">Be the first! Play Math Blitz to get on the board.</p>
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-border/40">
                    {mbEntries.map((entry: any, idx: number) => {
                      const isMe = entry.userId === user?.id;
                      const initials = entry.displayName.slice(0, 2).toUpperCase();
                      return (
                        <motion.div
                          key={entry.userId}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => setLocation(`/users/${entry.userId}`)}
                          className={cn("flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer", isMe ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30")}
                        >
                          <div className="w-8 flex items-center justify-center shrink-0">
                            <RankBadge rank={entry.rank} />
                          </div>
                          {entry.profileImageUrl ? (
                            <img src={entry.profileImageUrl} alt={entry.displayName}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-border/40 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-semibold truncate", isMe && "text-primary")}>
                              {entry.displayName}
                              {isMe && <span className="ml-2 text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">You</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Lv.{entry.gameLevel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-xl font-extrabold",
                              idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-foreground")}>
                              {entry.score}
                            </p>
                            <p className="text-xs text-muted-foreground">correct</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* Game score boards */}
        {tab !== "level" && tab !== "mathBlitz" && (
          <div className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col gap-1 p-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-20 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-lg mb-1">{t.leaderboard.noData}</p>
                <p className="text-muted-foreground text-sm">
                  {tab === "quiz" && !quizLevel
                    ? "Select a level above to filter quiz scores."
                    : `Be the first! Scores from previous periods don't carry over.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                <AnimatePresence>
                  {entries.map((entry, idx) => {
                    const isMe = entry.userId === user?.id;
                    const initials = entry.displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
                    return (
                      <motion.div key={entry.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setLocation(`/users/${entry.userId}`)}
                        className={cn("flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer", isMe ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30")}
                      >
                        <div className="w-8 flex items-center justify-center shrink-0">
                          <RankBadge rank={idx + 1} />
                        </div>
                        {entry.profileImageUrl ? (
                          <img src={entry.profileImageUrl} alt={entry.displayName}
                            className="w-10 h-10 rounded-xl object-cover border-2 border-border/40 shrink-0" />
                        ) : (
                          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shrink-0", activeTab.gradient)}>
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-semibold truncate", isMe && "text-primary")}>
                            {entry.displayName}
                            {isMe && <span className="ml-2 text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">You</span>}
                          </p>
                          {entry.userLevel && (
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block",
                              entry.userLevel.startsWith("P") ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                : entry.userLevel.startsWith("S") ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                : "bg-purple-500/15 text-purple-700 dark:text-purple-400")}>
                              {entry.userLevel}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-xl font-extrabold",
                            idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-foreground")}>
                            {entry.score.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{t.leaderboard.points}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Level board */}
        {tab === "level" && (
          <div className="space-y-2">
            {levelBoardEntries.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No data yet. Earn XP by completing goals, quizzes, and achievements!
              </div>
            )}
            {levelBoardEntries.map((entry, idx) => {
              const isMe = entry.userId === user?.id;
              const nametag = getItemDef(entry.equippedNametag);
              return (
                <motion.div key={entry.userId}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                  onClick={() => setLocation(`/users/${entry.userId}`)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:border-border",
                    isMe ? "bg-violet-500/5 border-violet-500/20" : "bg-card border-border/60"
                  )}
                >
                  <div className="w-8 flex justify-center shrink-0">
                    {idx === 0 ? <span className="text-xl">🥇</span>
                      : idx === 1 ? <span className="text-xl">🥈</span>
                      : idx === 2 ? <span className="text-xl">🥉</span>
                      : <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={cn("font-bold text-sm", isMe && "text-violet-600 dark:text-violet-400")}>
                        {entry.displayName} {isMe && "(you)"}
                      </p>
                      {nametag && <span className="text-sm">{nametag.emoji}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-violet-500/15 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-primary rounded-full"
                          style={{ width: `${entry.levelProgress.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{entry.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-violet-500 font-extrabold">
                      <Zap className="w-3.5 h-3.5" /> Lv.{entry.gameLevel}
                    </div>
                    {entry.level && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.level}</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Not-on-board notice */}
        {tab !== "level" && tab !== "mathBlitz" && !isLoading && entries.length > 0 && user && !entries.find(e => e.userId === user.id) && (
          <div className="bg-muted/40 rounded-2xl p-4 border border-border/40 text-center text-sm text-muted-foreground">
            {tab === "quiz"
              ? "You haven't submitted a quiz score this period. Generate an AI quiz from your notes!"
              : `You haven't submitted a score this ${boardType === "weekly" ? "week" : "month"} yet. Play to get on the board!`}
          </div>
        )}
      </div>
    </Layout>
  );
}

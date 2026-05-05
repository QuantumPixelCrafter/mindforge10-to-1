import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useSubmitScore, customFetch } from "@workspace/api-client-react";
import { useGetPowerups, useUsePowerup } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, CheckCircle2, XCircle, ArrowRight, Trophy, Upload, RotateCcw, Sparkles, BookOpen, Lightbulb, Zap, X } from "lucide-react";
import {
  type LevelGroup, type QuizSubject, type QuizTopic, type Difficulty,
  LEVEL_GROUP_INFO, LEVEL_TO_GROUP, LEVEL_LABELS, LEVEL_GROUP_SECTIONS,
  getSubjectsForGroup, DIFFICULTY_LABELS,
} from "@/lib/quiz-curriculum";
import { useLanguage } from "@/lib/language-context";

type Step = "levelGroup" | "subject" | "topic" | "settings" | "loading" | "playing" | "results";

type QuizQuestion = {
  id: number; question: string;
  options: string[]; correctAnswer: number; explanation: string;
};

type QuizData = {
  level: string; subject: string; topic: string; difficulty: string;
  questions: QuizQuestion[];
};

const QUESTION_COUNTS = [5, 10, 15] as const;
type QCount = (typeof QUESTION_COUNTS)[number];

const LEVEL_ORDER = ["P1","P2","P3","P4","P5","P6","S1","S2","S3","S4","S5","S6","U1","U2","U3","U4"];

// Points per correct answer based on difficulty (at or above the user's grade level).
const DIFFICULTY_PTS: Record<string, number> = { easy: 4.5, normal: 5, hard: 5.5 };

function calcScore(correct: number, quizLevel: string, userLevel: string, difficulty: string): number {
  if (correct === 0) return 0;
  const isBelowGrade = isQuizBelowGrade(quizLevel, userLevel);
  const ptsEach = isBelowGrade ? 2 : (DIFFICULTY_PTS[difficulty] ?? 5);
  return Math.round(correct * ptsEach);
}

function isQuizBelowGrade(quizLevel: string, userLevel: string): boolean {
  const quizIdx = LEVEL_ORDER.indexOf(quizLevel);
  const userIdx = LEVEL_ORDER.indexOf(userLevel);
  if (quizIdx === -1 || userIdx === -1) return false;
  // Within the same level group (e.g. P1–P3 all = Junior Primary) → never below grade
  if (LEVEL_TO_GROUP[quizLevel] && LEVEL_TO_GROUP[quizLevel] === LEVEL_TO_GROUP[userLevel]) return false;
  return quizIdx < userIdx;
}

type WrongAnswer = {
  question: string; options: string[];
  correctAnswer: number; userAnswer: number; explanation: string;
};

type StreakResult =
  | { isFirstToday: false; currentStreak: number }
  | { isFirstToday: true; currentStreak: number; streakBonus: number; bonusAwarded: boolean; streakReset?: boolean; requiresFreezeDecision?: never }
  | { isFirstToday: true; requiresFreezeDecision: true; freezesAvailable: number; currentStreak: number; streakIfFrozen: number; streakBonusIfFrozen: number };

type FreezeResponse = { currentStreak: number; streakBonus: number; bonusAwarded: boolean; freezeUsed: boolean; streakReset?: boolean };

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["levelGroup", "subject", "topic", "settings", "playing"];
  const cur = steps.indexOf(step === "loading" ? "playing" : step === "results" ? "playing" : step);
  return (
    <div className="flex items-center gap-2 justify-center mb-2">
      {steps.map((s, i) => (
        <div key={s} className={cn(
          "h-1.5 rounded-full transition-all duration-300",
          i < cur ? "w-6 bg-primary" : i === cur ? "w-8 bg-primary" : "w-4 bg-muted"
        )} />
      ))}
    </div>
  );
}

type RandomBonusResult =
  | { rewardType: "points"; points: number }
  | { rewardType: "powerup"; powerupKey: string; powerupName: string; powerupEmoji: string };

export default function QuizPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t: tl } = useLanguage();
  const submitScoreMut = useSubmitScore();
  const { data: powerupsData, refetch: refetchPowerups } = useGetPowerups();
  const usePowerupMut = useUsePowerup();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("levelGroup");
  const [levelGroup, setLevelGroup] = useState<LevelGroup | null>(null);
  const [level, setLevel] = useState<string>(() => user?.level ?? "");
  const [subject, setSubject] = useState<QuizSubject | null>(null);
  const [topic, setTopic] = useState<QuizTopic | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [questionCount, setQuestionCount] = useState<QCount>(10);
  const [recentConcepts, setRecentConcepts] = useState("");

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const [forfeited, setForfeited] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [nextBtnCountdown, setNextBtnCountdown] = useState(5);

  const [doublePointsActive, setDoublePointsActive] = useState(false);
  const [doublePointsUsed, setDoublePointsUsed] = useState(false);
  const [hintUsedThisQ, setHintUsedThisQ] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
  const [randomBonusActive, setRandomBonusActive] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [reviewSent, setReviewSent] = useState(false);

  const [streakResult, setStreakResult] = useState<StreakResult | null>(null);
  const [streakRecorded, setStreakRecorded] = useState(false);
  const streakRecordingRef = useRef(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [postFreezeResult, setPostFreezeResult] = useState<FreezeResponse | null>(null);

  const hintQty = powerupsData?.inventory.find(p => p.key === "hint_token")?.quantity ?? 0;
  const doubleQty = powerupsData?.inventory.find(p => p.key === "double_points")?.quantity ?? 0;
  const retryQty = powerupsData?.inventory.find(p => p.key === "retry_pass")?.quantity ?? 0;
  const randomBonusQty = powerupsData?.inventory.find(p => p.key === "random_quiz_bonus")?.quantity ?? 0;

  const useRandomBonusMut = useMutation({
    mutationFn: () => customFetch<RandomBonusResult>("/api/powerups/use-random-bonus", { method: "POST" }),
  });

  const reviewLaterMut = useMutation({
    mutationFn: (payload: { level: string; subject: string; topic: string; difficulty: string; wrongAnswers: WrongAnswer[] }) =>
      customFetch<{ inserted: number }>("/api/review", { method: "POST", body: JSON.stringify(payload) }),
  });

  const generateMut = useMutation({
    mutationFn: async (params: { level: string; subject: string; topic: string; difficulty: string; questionCount: number; recentConcepts?: string }) => {
      const sid = localStorage.getItem("study_smart_sid");
      const res = await fetch("/api/curriculum-quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sid ? { Authorization: `Bearer ${sid}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? "Failed to generate quiz");
      }
      return res.json() as Promise<QuizData>;
    },
  });

  const pickGroup = (g: LevelGroup) => {
    setLevelGroup(g);
    const info = LEVEL_GROUP_INFO[g];
    if (!level || LEVEL_TO_GROUP[level] !== g) setLevel(info.levels[0]);
    setSubject(null);
    setTopic(null);
    setStep("subject");
  };

  const pickSubject = (s: QuizSubject) => {
    setSubject(s);
    setTopic(null);
    setStep("topic");
  };

  const pickTopic = (t: QuizTopic) => {
    setTopic(t);
    setStep("settings");
  };

  const startQuiz = async () => {
    if (!level || !subject || !topic) return;
    setStep("loading");
    setScore(0);
    setCurrentQ(0);
    setSelected(null);
    setShowExp(false);
    setScoreSubmitted(false);
    setHintUsedThisQ(false);
    setEliminatedOptions(new Set());

    if (doublePointsActive && !doublePointsUsed) {
      try {
        await usePowerupMut.mutateAsync("double_points");
        setDoublePointsUsed(true);
        refetchPowerups();
      } catch {
        setDoublePointsActive(false);
      }
    }

    if (randomBonusActive && randomBonusQty > 0) {
      try {
        const result = await useRandomBonusMut.mutateAsync();
        refetchPowerups();
        if (result.rewardType === "points") {
          toast({
            title: "🎲 Random Quiz Bonus!",
            description: `You received ${result.points.toLocaleString()} bonus points!`,
          });
        } else {
          toast({
            title: "🎲 Random Quiz Bonus!",
            description: `You received a ${result.powerupEmoji} ${result.powerupName}!`,
          });
        }
        setRandomBonusActive(false);
      } catch {
        // bonus failed silently — quiz still runs
      }
    }

    try {
      const data = await generateMut.mutateAsync({ level, subject: subject.name, topic: topic.name, difficulty, questionCount, recentConcepts: recentConcepts.trim() || undefined });
      setQuiz(data);
      setStep("playing");
    } catch (err: any) {
      setStep("settings");
      toast({ title: "Failed to generate quiz", description: err?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleAnswer = useCallback((idx: number) => {
    if (showExp || !quiz || eliminatedOptions.has(idx)) return;
    setSelected(idx);
    setShowExp(true);
    const q = quiz.questions[currentQ];
    if (idx === q.correctAnswer) {
      setScore(s => s + 1);
    } else {
      setWrongAnswers(prev => [...prev, {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: idx,
        explanation: q.explanation,
      }]);
    }
  }, [showExp, quiz, currentQ, eliminatedOptions]);

  const handleUseHint = async () => {
    if (!quiz || hintUsedThisQ || hintQty <= 0 || showExp) return;
    const q = quiz.questions[currentQ];
    const wrongOptions = q.options.map((_, i) => i).filter(i => i !== q.correctAnswer);
    const toEliminate = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
    try {
      await usePowerupMut.mutateAsync("hint_token");
      setEliminatedOptions(new Set(toEliminate));
      setHintUsedThisQ(true);
      refetchPowerups();
    } catch {
      // not enough hints
    }
  };

  const nextQuestion = () => {
    if (!quiz) return;
    setHintUsedThisQ(false);
    setEliminatedOptions(new Set());
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(i => i + 1);
      setSelected(null);
      setShowExp(false);
    } else {
      setStep("results");
    }
  };

  const resetStreakState = () => {
    setStreakResult(null);
    setStreakRecorded(false);
    streakRecordingRef.current = false;
    setFreezeLoading(false);
    setPostFreezeResult(null);
  };

  const forfeit = () => {
    setForfeited(true);
    setStep("results");
  };

  const reset = () => {
    setStep("levelGroup");
    setLevelGroup(null);
    setSubject(null);
    setTopic(null);
    setQuiz(null);
    setScoreSubmitted(false);
    setForfeited(false);
    setDoublePointsActive(false);
    setDoublePointsUsed(false);
    setHintUsedThisQ(false);
    setEliminatedOptions(new Set());
    setWrongAnswers([]);
    setReviewSent(false);
    setRecentConcepts("");
    resetStreakState();
  };

  const retryTopic = () => {
    setQuiz(null);
    setStep("settings");
    setScoreSubmitted(false);
    setForfeited(false);
    setDoublePointsActive(false);
    setDoublePointsUsed(false);
    setHintUsedThisQ(false);
    setEliminatedOptions(new Set());
    setWrongAnswers([]);
    setReviewSent(false);
    setRecentConcepts("");
    resetStreakState();
  };

  const retryWithPass = async () => {
    try {
      await usePowerupMut.mutateAsync("retry_pass");
      refetchPowerups();
      retryTopic();
    } catch {
      // no passes left
    }
    setWrongAnswers([]);
    setReviewSent(false);
  };

  // Record streak on first appearance of results screen — forfeited quizzes do NOT count
  useEffect(() => {
    if (step !== "results" || !isAuthenticated || streakRecordingRef.current || forfeited) return;
    streakRecordingRef.current = true;
    customFetch<StreakResult>("/api/streaks/record", { method: "POST" })
      .then(result => {
        setStreakResult(result);
        setStreakRecorded(true);
      })
      .catch(() => setStreakRecorded(true));
  }, [step, isAuthenticated, forfeited]);

  useEffect(() => {
    if (!showExp) {
      setNextBtnEnabled(false);
      setNextBtnCountdown(5);
      return;
    }
    const isCorrect = quiz && selected !== null && selected === quiz.questions[currentQ]?.correctAnswer;
    if (isCorrect) {
      setNextBtnEnabled(true);
      setNextBtnCountdown(0);
      return;
    }
    setNextBtnEnabled(false);
    setNextBtnCountdown(5);
    const interval = setInterval(() => {
      setNextBtnCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setNextBtnEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showExp, selected, quiz, currentQ]);

  const respondToFreeze = async (useFreeze: boolean) => {
    setFreezeLoading(true);
    try {
      const result = await customFetch<FreezeResponse>("/api/streaks/freeze-respond", {
        method: "POST",
        body: JSON.stringify({ useFreeze }),
      });
      setPostFreezeResult(result);
      refetchPowerups();
    } catch {
      // silently fail
    } finally {
      setFreezeLoading(false);
    }
  };

  const q = quiz?.questions[currentQ];
  const failed = score === 0 && (quiz?.questions.length ?? 0) > 0;
  const rawScore = quiz ? calcScore(score, quiz.level, user?.level ?? "", quiz.difficulty) : 0;
  const belowGrade = quiz ? isQuizBelowGrade(quiz.level, user?.level ?? "") : false;
  // No points for 0 correct, forfeit, or below grade; double-points power-up still applies for above/at-grade quizzes
  const finalScore = forfeited || score === 0 ? 0 : (doublePointsActive ? rawScore * 2 : rawScore);
  const pct = quiz ? Math.round((score / quiz.questions.length) * 100) : 0;
  const subjects = levelGroup ? getSubjectsForGroup(levelGroup) : [];
  const groupInfo = levelGroup ? LEVEL_GROUP_INFO[levelGroup] : null;

  return (
    <Layout title={tl.nav.quiz}>
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        {(step !== "levelGroup") && (
          <ProgressDots step={step} />
        )}

        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Level Group ─────────────────────────────────── */}
          {step === "levelGroup" && (
            <motion.div key="levelGroup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{tl.quiz.aiPowered}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{tl.quiz.aiDesc}</p>
              </div>

              <div className="space-y-6">
                {LEVEL_GROUP_SECTIONS.map(section => (
                  <div key={section.label}>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 pl-1">{section.label}</p>
                    <div className={cn("gap-3", section.groups.length > 1 ? "grid grid-cols-2" : "flex")}>
                      {section.groups.map(g => {
                        const info = LEVEL_GROUP_INFO[g];
                        return (
                          <motion.button
                            key={g}
                            onClick={() => pickGroup(g)}
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            className="w-full text-left bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0 shadow-md", info.gradient)}>
                                {info.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold group-hover:text-primary transition-colors leading-tight">{info.label}</h3>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {info.levels.map(l => (
                                    <span key={l} className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r", info.gradient
                                    )}>{l}</span>
                                  ))}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{info.description}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: Subject ─────────────────────────────────────── */}
          {step === "subject" && groupInfo && (
            <motion.div key="subject" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={() => setStep("levelGroup")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> {tl.common.back}
              </button>

              <h3 className="text-lg font-bold mb-4">{tl.quiz.chooseSubject}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.map(s => (
                  <motion.button key={s.id} onClick={() => pickSubject(s)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="text-left bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl mb-3 shadow-sm", s.color)}>
                      {s.icon}
                    </div>
                    <p className="font-bold text-sm group-hover:text-primary transition-colors">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.topics.length} {tl.quiz.quizTopics}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Topic ───────────────────────────────────────── */}
          {step === "topic" && subject && (
            <motion.div key="topic" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={() => setStep("subject")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> {tl.quiz.backToSubjects}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl", subject.color)}>{subject.icon}</div>
                <div>
                  <h3 className="text-lg font-bold">{subject.name}</h3>
                  <p className="text-xs text-muted-foreground">{level ? LEVEL_LABELS[level] : ""}</p>
                </div>
              </div>

              <p className="text-sm font-semibold text-muted-foreground mb-3">{tl.quiz.chooseTopicLabel}</p>
              <div className="space-y-3">
                {subject.topics.map((t, i) => (
                  <motion.button key={t.id} onClick={() => pickTopic(t)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full text-left bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all group flex items-center gap-4"
                  >
                    <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shrink-0", subject.color)}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4: Settings ────────────────────────────────────── */}
          {step === "settings" && topic && subject && (
            <motion.div key="settings" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={() => setStep("topic")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> {tl.quiz.backToTopics}
              </button>

              <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0", subject.color)}>{subject.icon}</div>
                <div>
                  <p className="font-bold text-sm">{topic.name}</p>
                  <p className="text-xs text-muted-foreground">{subject.name} · {level ? LEVEL_LABELS[level] : ""}</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Grade level selector */}
                {groupInfo && groupInfo.levels.length > 1 && (
                  <div>
                    <p className="text-sm font-bold mb-1">Grade level</p>
                    <p className="text-xs text-muted-foreground mb-3">{groupInfo.levelDesc}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupInfo.levels.map(l => (
                        <button
                          key={l}
                          onClick={() => setLevel(l)}
                          className={cn(
                            "px-4 py-2 rounded-xl border font-bold text-sm transition-all",
                            level === l
                              ? "border-primary bg-primary text-primary-foreground shadow-md"
                              : "border-border/60 bg-card hover:border-primary/40 text-muted-foreground"
                          )}
                        >
                          {LEVEL_LABELS[l]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold mb-3">{tl.quiz.difficulty}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_LABELS.map(d => (
                      <button key={d.value} onClick={() => setDifficulty(d.value)}
                        className={cn(
                          "rounded-2xl p-4 border text-center transition-all",
                          difficulty === d.value
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border/60 bg-card hover:border-primary/30"
                        )}>
                        <div className="text-xl mb-1">{d.emoji}</div>
                        <div className="font-bold text-sm">{d.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold mb-3">{tl.quiz.numQuestions}</p>
                  <div className="flex gap-2">
                    {QUESTION_COUNTS.map(n => (
                      <button key={n} onClick={() => setQuestionCount(n)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border font-bold text-sm transition-all",
                          questionCount === n
                            ? "border-primary bg-primary text-primary-foreground shadow-md"
                            : "border-border/60 bg-card hover:border-primary/40 text-muted-foreground"
                        )}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-sm font-bold">Recent concepts</p>
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    What have you been learning recently? Our AI will tailor the quiz to these. Separate each concept with a semicolon (;)
                  </p>
                  <textarea
                    value={recentConcepts}
                    onChange={(e) => setRecentConcepts(e.target.value)}
                    placeholder={`e.g. ${subject?.name === "Mathematics" ? "Pythagoras theorem; trigonometry; surds" : "photosynthesis; cellular respiration; osmosis"}`}
                    rows={2}
                    className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Power-up activations */}
                {(doubleQty > 0 || hintQty > 0 || randomBonusQty > 0) && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold">{tl.quiz.powerUps}</p>
                    {randomBonusQty > 0 && (
                      <button
                        onClick={() => setRandomBonusActive(v => !v)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all",
                          randomBonusActive
                            ? "border-purple-400 bg-purple-500/10 shadow-md shadow-purple-500/10"
                            : "border-border/60 bg-card hover:border-purple-400/40"
                        )}
                      >
                        <span className="text-2xl">🎲</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{tl.quiz.randomBonusTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {tl.quiz.randomBonusDesc.replace("{n}", String(randomBonusQty))}
                          </p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          randomBonusActive ? "border-purple-500 bg-purple-500" : "border-muted-foreground/40"
                        )}>
                          {randomBonusActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    )}
                    {doubleQty > 0 && (
                      <button
                        onClick={() => setDoublePointsActive(v => !v)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all",
                          doublePointsActive
                            ? "border-amber-400 bg-amber-500/10 shadow-md shadow-amber-500/10"
                            : "border-border/60 bg-card hover:border-amber-400/40"
                        )}
                      >
                        <span className="text-2xl">⚡</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{tl.quiz.doublePointsTitle}</p>
                          <p className="text-xs text-muted-foreground">{tl.quiz.doublePointsDesc.replace("{n}", String(doubleQty))}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          doublePointsActive ? "border-amber-500 bg-amber-500" : "border-muted-foreground/40"
                        )}>
                          {doublePointsActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    )}
                    {hintQty > 0 && (
                      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                        <span className="text-2xl">💡</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{tl.quiz.hintTokensTitle}</p>
                          <p className="text-xs text-muted-foreground">{tl.quiz.hintTokensDesc.replace("{n}", String(hintQty))}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {generateMut.isError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 text-center">
                    {(generateMut.error as Error)?.message || tl.quiz.failedGenerate}
                  </div>
                )}

                <Button size="lg" onClick={startQuiz} className={cn(
                  "w-full rounded-2xl shadow-xl text-base gap-2",
                  doublePointsActive ? "bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-amber-500/20" : "shadow-primary/20"
                )}>
                  {doublePointsActive ? <><Zap className="w-5 h-5" /> {tl.quiz.generateDouble}</> : <><Sparkles className="w-5 h-5" /> {tl.quiz.generateN.replace("{n}", String(questionCount))}</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── LOADING ─────────────────────────────────────────────── */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-5">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="font-bold text-lg">{tl.quiz.aiCrafting}</p>
                <p className="text-muted-foreground text-sm mt-1">{tl.quiz.generating.replace("{n}", String(questionCount)).replace("{d}", difficulty).replace("{t}", topic?.name ?? "")}</p>
                {doublePointsActive && (
                  <p className="text-amber-500 text-sm font-bold mt-2">⚡ {tl.quiz.doublePointsActive}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── PLAYING ─────────────────────────────────────────────── */}
          {step === "playing" && quiz && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-background overflow-y-auto">
              <div className="max-w-2xl mx-auto py-4 px-4 space-y-4">
                {/* Top bar: exit + HUD */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={forfeit}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Leave quiz"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    {doublePointsActive && (
                      <div className="flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                        ⚡ 2×
                      </div>
                    )}
                    {q && !showExp && hintQty > 0 && !hintUsedThisQ && (
                      <button
                        onClick={handleUseHint}
                        disabled={usePowerupMut.isPending}
                        className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-400/30 transition-all"
                      >
                        <Lightbulb className="w-3 h-3" /> {tl.quiz.hint} ×{hintQty}
                      </button>
                    )}
                    {hintUsedThisQ && (
                      <div className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                        💡 {tl.quiz.hintUsed}
                      </div>
                    )}
                    <div className="text-sm font-bold text-primary">{score} / {currentQ + (showExp ? 1 : 0)} {tl.quiz.correct}</div>
                    <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
                      {currentQ + 1} / {quiz.questions.length}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full"
                    animate={{ width: `${((currentQ) / quiz.questions.length) * 100}%` }} transition={{ duration: 0.4 }} />
                </div>

                {/* Per-question animated content */}
                <AnimatePresence mode="wait">
                  {q && (
                    <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-4">
                      {/* Question card */}
                      <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
                        <p className="text-base font-semibold leading-snug">{q.question}</p>
                      </div>

                      {/* Options */}
                      <div className="space-y-2.5">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctAnswer;
                          const isSelected = idx === selected;
                          const isEliminated = eliminatedOptions.has(idx);
                          return (
                            <motion.button key={idx} onClick={() => handleAnswer(idx)} whileTap={{ scale: 0.99 }}
                              disabled={showExp || isEliminated}
                              className={cn(
                                "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-3",
                                isEliminated
                                  ? "opacity-30 bg-muted/20 border-border/20 cursor-not-allowed line-through"
                                  : !showExp ? "bg-card border-border/60 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                                  : isCorrect ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-300"
                                  : isSelected ? "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300"
                                  : "bg-muted/30 border-border/30 text-muted-foreground cursor-default"
                              )}>
                              <span className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                isEliminated ? "bg-muted/40 text-muted-foreground/40"
                                  : !showExp ? "bg-muted text-muted-foreground"
                                  : isCorrect ? "bg-green-500 text-white"
                                  : isSelected ? "bg-red-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {["A","B","C","D"][idx]}
                              </span>
                              <span className="text-sm font-medium flex-1">{opt}</span>
                              {showExp && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                              {showExp && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              {isEliminated && <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <AnimatePresence>
                        {showExp && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                            <div className={cn(
                              "rounded-2xl p-4 border text-sm",
                              selected === q.correctAnswer
                                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
                                : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
                            )}>
                              <p className="font-bold mb-1">{selected === q.correctAnswer ? `✓ ${tl.quiz.correctAnswer}` : `✗ ${tl.quiz.notQuite}`}</p>
                              <p className="text-sm leading-relaxed opacity-90">{q.explanation}</p>
                            </div>
                            <Button
                              className="w-full mt-3 rounded-2xl gap-2 transition-opacity"
                              onClick={nextQuestion}
                              disabled={!nextBtnEnabled}
                            >
                              {!nextBtnEnabled ? (
                                <>
                                  <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
                                  {nextBtnCountdown}s
                                </>
                              ) : currentQ < quiz.questions.length - 1 ? (
                                <>{tl.quiz.nextQuestion} <ArrowRight className="w-4 h-4" /></>
                              ) : (
                                <><Trophy className="w-4 h-4" /> {tl.quiz.seeResults}</>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ─── RESULTS ─────────────────────────────────────────────── */}
          {step === "results" && quiz && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-5">
              <div className="text-center">
                <motion.div className="text-6xl mb-4" animate={{ rotate: [0,-10,10,-10,10,0] }} transition={{ duration: 0.6, delay: 0.2 }}>
                  {forfeited ? "🚪" : failed ? "💪" : pct >= 80 ? "🏆" : pct >= 50 ? "🎯" : "📚"}
                </motion.div>
                <h2 className="text-2xl font-bold mb-1">{forfeited ? "Quiz ended early" : failed ? tl.quiz.dontGiveUp : pct >= 80 ? tl.quiz.excellent : pct >= 50 ? tl.quiz.goodJob : tl.quiz.keepStudying}</h2>
                <p className="text-muted-foreground text-sm">{quiz.topic} · {LEVEL_LABELS[quiz.level] ?? quiz.level}</p>
                {forfeited && (
                  <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 text-sm text-orange-700 dark:text-orange-400 text-center">
                    You left the quiz before finishing — no points have been awarded.
                  </div>
                )}
                {!forfeited && failed && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{tl.quiz.mistakesMsg}</p>
                )}
                {!forfeited && !failed && doublePointsActive && (
                  <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30">
                    ⚡ {tl.quiz.doubleApplied}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: tl.quiz.scoreLabel, value: finalScore.toLocaleString(), sub: !failed && doublePointsActive ? tl.quiz.pts2x : tl.quiz.pts, highlight: true },
                  { label: tl.quiz.correctLabel, value: `${score}/${quiz.questions.length}`, sub: tl.quiz.answers, highlight: false },
                  { label: tl.quiz.accuracyLabel, value: `${pct}%`, sub: tl.quiz.correctSub, highlight: false },
                ].map(({ label, value, sub, highlight }) => (
                  <div key={label} className={cn("rounded-2xl p-4 text-center", highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/40")}>
                    <div className={cn("text-xl font-extrabold", highlight && "text-primary")}>{value}</div>
                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">{label}</div>
                    <div className="text-[9px] text-muted-foreground">{sub}</div>
                  </div>
                ))}
              </div>

              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className={cn("h-full rounded-full", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")} />
              </div>

              {/* ── Streak panel ─────────────────────────────────────── */}
              {isAuthenticated && streakRecorded && streakResult && (() => {
                // Freeze decision pending and not yet resolved
                if (streakResult.isFirstToday && streakResult.requiresFreezeDecision && !postFreezeResult) {
                  return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🧊</span>
                        <div>
                          <p className="font-bold text-sm text-blue-600 dark:text-blue-400">You missed yesterday</p>
                          <p className="text-xs text-muted-foreground">Your {streakResult.currentStreak}-day streak is at risk. Use a Streak Freeze to save it?</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" disabled={freezeLoading}
                          className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white border-0 gap-1.5 text-xs"
                          onClick={() => respondToFreeze(true)}>
                          🧊 Use Freeze ({streakResult.freezesAvailable} left)
                        </Button>
                        <Button size="sm" variant="outline" disabled={freezeLoading}
                          className="rounded-xl gap-1.5 text-xs border-muted-foreground/30"
                          onClick={() => respondToFreeze(false)}>
                          Let it reset
                        </Button>
                      </div>
                    </motion.div>
                  );
                }

                // Freeze was used
                if (postFreezeResult) {
                  return postFreezeResult.freezeUsed ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 flex items-center gap-3">
                      <span className="text-2xl">🧊</span>
                      <div>
                        <p className="font-bold text-sm text-blue-600 dark:text-blue-400">Streak Freeze used!</p>
                        <p className="text-xs text-muted-foreground">
                          🔥 {postFreezeResult.currentStreak}-day streak continues
                          {postFreezeResult.bonusAwarded && postFreezeResult.streakBonus > 0
                            ? ` · +${postFreezeResult.streakBonus} bonus pts` : ""}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-muted bg-muted/30 p-4 flex items-center gap-3">
                      <span className="text-2xl">🔥</span>
                      <div>
                        <p className="font-bold text-sm">Streak reset</p>
                        <p className="text-xs text-muted-foreground">Starting fresh — Day 1! Keep it going tomorrow.</p>
                      </div>
                    </motion.div>
                  );
                }

                // Normal streak outcome
                if (streakResult.isFirstToday && !streakResult.requiresFreezeDecision) {
                  if (streakResult.streakReset) {
                    return (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-muted bg-muted/30 p-4 flex items-center gap-3">
                        <span className="text-2xl">🔥</span>
                        <div>
                          <p className="font-bold text-sm">Streak reset</p>
                          <p className="text-xs text-muted-foreground">Starting fresh — Day 1! Keep it going tomorrow.</p>
                        </div>
                      </motion.div>
                    );
                  }
                  const streak = streakResult.currentStreak;
                  return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-2xl border p-4 flex items-center gap-3",
                        streak >= 7 ? "border-amber-400/40 bg-amber-500/10" : "border-orange-400/30 bg-orange-500/10")}>
                      <span className="text-2xl">{streak >= 30 ? "🌟" : streak >= 14 ? "⚡" : "🔥"}</span>
                      <div className="flex-1">
                        <p className={cn("font-bold text-sm", streak >= 7 ? "text-amber-600 dark:text-amber-400" : "text-orange-600 dark:text-orange-400")}>
                          {streak === 1 ? "Day 1 — keep it up!" : `${streak}-Day Streak!`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {streakResult.bonusAwarded && streakResult.streakBonus > 0
                            ? `+${streakResult.streakBonus} bonus pts · come back tomorrow to keep it going`
                            : "Come back tomorrow to start earning streak bonuses"}
                        </p>
                      </div>
                      {streakResult.bonusAwarded && streakResult.streakBonus > 0 && (
                        <span className="text-sm font-extrabold text-amber-500">+{streakResult.streakBonus}</span>
                      )}
                    </motion.div>
                  );
                }

                return null;
              })()}

              <div className="space-y-3">
                {/* Below-grade notice: score is still shown but doesn't go to leaderboard */}
                {belowGrade && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2 text-amber-700 dark:text-amber-400 text-sm">
                    <span className="text-base shrink-0">⚠️</span>
                    <span className="font-medium">This quiz is below your grade level — scores from lower-grade quizzes are not counted on the leaderboard.</span>
                  </div>
                )}

                {isAuthenticated && !forfeited && !scoreSubmitted && !belowGrade && score > 0 && (
                  <Button onClick={async () => {
                    await submitScoreMut.mutateAsync({ data: {
                      gameType: "quiz", score: finalScore,
                      subject: quiz.subject, userLevel: quiz.level,
                    }});
                    setScoreSubmitted(true);
                  }}
                    disabled={submitScoreMut.isPending}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-lg shadow-amber-500/20 gap-2">
                    <Upload className="w-4 h-4" />
                    {submitScoreMut.isPending ? tl.quiz.submitting : tl.quiz.submitPts.replace("{n}", finalScore.toLocaleString())}
                  </Button>
                )}
                {scoreSubmitted && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> {tl.quiz.scoreSubmitted}
                  </div>
                )}

                {/* Retry Pass */}
                {retryQty > 0 && (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl gap-2 border-blue-400/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    onClick={retryWithPass}
                    disabled={usePowerupMut.isPending}
                  >
                    🔄 {tl.quiz.useRetryPass.replace("{n}", String(retryQty))}
                  </Button>
                )}

                {/* Review Later */}
                {wrongAnswers.length > 0 && !reviewSent && (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl gap-2 border-orange-400/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                    disabled={reviewLaterMut.isPending}
                    onClick={async () => {
                      await reviewLaterMut.mutateAsync({
                        level: quiz.level, subject: quiz.subject,
                        topic: quiz.topic, difficulty: quiz.difficulty,
                        wrongAnswers,
                      });
                      setReviewSent(true);
                    }}
                  >
                    📋 {reviewLaterMut.isPending ? tl.quiz.saving : tl.quiz.reviewLater.replace("{n}", String(wrongAnswers.length))}
                  </Button>
                )}
                {reviewSent && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> {tl.quiz.savedToReview}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={retryTopic}>
                    <RotateCcw className="w-4 h-4" /> {tl.quiz.tryAgain}
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={() => setStep("topic")}>
                    <BookOpen className="w-4 h-4" /> {tl.quiz.newTopic}
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={reset}>
                    <Sparkles className="w-4 h-4" /> {tl.quiz.newQuiz}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

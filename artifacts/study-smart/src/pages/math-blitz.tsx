import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSubmitScore } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Timer, Zap, RotateCcw, ChevronRight,
  CheckCircle2, XCircle, Calculator,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Difficulty = "easy" | "normal" | "hard" | "extreme";
type GameState = "select" | "countdown" | "playing" | "results";
type Op = "+" | "−" | "×" | "÷";

interface Question {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTY_META: Record<Difficulty, {
  label: string;
  emoji: string;
  color: string;
  border: string;
  bg: string;
  textColor: string;
  gradient: string;
  time: number;
  grades: string;
  ops: string;
  gameType: string;
}> = {
  easy: {
    label: "Easy",
    emoji: "🌱",
    color: "text-emerald-500",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-400 to-teal-500",
    time: 60,
    grades: "K1 – P3",
    ops: "+  −  (1–2 digit ± 1 digit)",
    gameType: "math-blitz-easy",
  },
  normal: {
    label: "Normal",
    emoji: "🔥",
    color: "text-sky-500",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    textColor: "text-sky-600 dark:text-sky-400",
    gradient: "from-sky-400 to-blue-500",
    time: 60,
    grades: "P4 – P6",
    ops: "+  −  ×  ÷  (1–3 digit)",
    gameType: "math-blitz-normal",
  },
  hard: {
    label: "Hard",
    emoji: "⚡",
    color: "text-orange-500",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    textColor: "text-orange-600 dark:text-orange-400",
    gradient: "from-orange-400 to-red-500",
    time: 40,
    grades: "S1 – S4",
    ops: "+  −  ×  ÷  (3–5 ± 2–3 digit)",
    gameType: "math-blitz-hard",
  },
  extreme: {
    label: "Extreme",
    emoji: "💀",
    color: "text-red-500",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    textColor: "text-red-600 dark:text-red-400",
    gradient: "from-red-500 to-rose-600",
    time: 40,
    grades: "S5 +",
    ops: "+  −  ×  ÷  (3–6 ± 2–3 digit)",
    gameType: "math-blitz-hard",
  },
};

// ─── Grade → suggested difficulty ─────────────────────────────────────────────
function suggestDifficulty(level: string | null | undefined): Difficulty {
  if (!level) return "easy";
  if (["P1", "P2", "P3"].includes(level)) return "easy";
  if (["P4", "P5", "P6"].includes(level)) return "normal";
  if (["S1", "S2", "S3", "S4"].includes(level)) return "hard";
  return "extreme";
}

// ─── Question generator ────────────────────────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randNDigits(minD: number, maxD: number) {
  const d = randInt(minD, maxD);
  const lo = d === 1 ? 1 : Math.pow(10, d - 1);
  const hi = Math.pow(10, d) - 1;
  return randInt(lo, hi);
}

function generateQuestion(diff: Difficulty): Question {
  if (diff === "easy") {
    const op: Op = Math.random() < 0.5 ? "+" : "−";
    let a = randNDigits(1, 2);
    const b = randInt(1, 9);
    if (op === "−" && a < b) a = b + randInt(0, 9);
    return { a, b, op, answer: op === "+" ? a + b : a - b };
  }

  if (diff === "normal") {
    if (Math.random() < 0.4) {
      const useDiv = Math.random() < 0.5;
      if (!useDiv) {
        const a = randNDigits(1, 2);
        const b = randInt(1, 9);
        return { a, b, op: "×", answer: a * b };
      } else {
        const b = randInt(2, 9);
        const result = randInt(1, 11);
        return { a: result * b, b, op: "÷", answer: result };
      }
    }
    const op: Op = Math.random() < 0.5 ? "+" : "−";
    let a = randNDigits(1, 3);
    const b = randNDigits(1, 2);
    if (op === "−" && a < b) a = b + randNDigits(1, 2);
    return { a, b, op, answer: op === "+" ? a + b : a - b };
  }

  if (diff === "hard") {
    if (Math.random() < 0.4) {
      const useDiv = Math.random() < 0.5;
      if (!useDiv) {
        const a = randNDigits(2, 3);
        const b = randInt(1, 9);
        return { a, b, op: "×", answer: a * b };
      } else {
        const b = randInt(2, 9);
        const result = randNDigits(2, 3);
        return { a: result * b, b, op: "÷", answer: result };
      }
    }
    const op: Op = Math.random() < 0.5 ? "+" : "−";
    let a = randNDigits(3, 5);
    const b = randNDigits(2, 3);
    if (op === "−" && a < b) a = b + randNDigits(2, 3);
    return { a, b, op, answer: op === "+" ? a + b : a - b };
  }

  // extreme
  if (Math.random() < 0.4) {
    const useDiv = Math.random() < 0.5;
    if (!useDiv) {
      const a = randNDigits(2, 3);
      const b = randNDigits(1, 2);
      return { a, b, op: "×", answer: a * b };
    } else {
      const b = randNDigits(1, 2);
      const result = randNDigits(2, 3);
      return { a: result * b, b, op: "÷", answer: result };
    }
  }
  const op: Op = Math.random() < 0.5 ? "+" : "−";
  let a = randNDigits(3, 6);
  const b = randNDigits(2, 3);
  if (op === "−" && a < b) a = b + randNDigits(2, 3);
  return { a, b, op, answer: op === "+" ? a + b : a - b };
}

// ─── Feedback flash ────────────────────────────────────────────────────────────
type Feedback = "correct" | "wrong" | null;

// ─── Main component ────────────────────────────────────────────────────────────
export default function MathBlitzPage() {
  const { user } = useAuth();
  const submitMut = useSubmitScore();

  const [gameState, setGameState] = useState<GameState>("select");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);
  const diffRef = useRef<Difficulty>("easy");

  const meta = DIFFICULTY_META[difficulty];
  const suggestedDiff = suggestDifficulty(user?.level as string | null | undefined);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(diffRef.current));
    setInput("");
    setFeedback(null);
    setCorrectAnswer(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalScore = scoreRef.current;
    setGameState("results");
    setSubmitted(false);
    if (finalScore > 0) {
      const gameType = DIFFICULTY_META[diffRef.current].gameType;
      submitMut.mutate(
        { data: { gameType: gameType as any, score: finalScore, secondsTaken: DIFFICULTY_META[diffRef.current].time } },
        { onSuccess: () => { setSubmitted(true); } },
      );
    } else {
      setSubmitted(true);
    }
  }, [submitMut]);

  const startCountdown = (diff: Difficulty) => {
    setDifficulty(diff);
    diffRef.current = diff;
    scoreRef.current = 0;
    setScore(0);
    setCountdown(3);
    setGameState("countdown");
  };

  // Countdown
  useEffect(() => {
    if (gameState !== "countdown") return;
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id);
          const t = DIFFICULTY_META[diffRef.current].time;
          setTimeLeft(t);
          setGameState("playing");
          setQuestion(generateQuestion(diffRef.current));
          setTimeout(() => inputRef.current?.focus(), 100);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, endGame]);

  const handleSubmit = () => {
    if (!question || feedback) return;
    const val = parseInt(input.trim(), 10);
    if (isNaN(val)) return;

    if (val === question.answer) {
      scoreRef.current += 1;
      setScore(s => s + 1);
      setFeedback("correct");
      feedbackRef.current = setTimeout(nextQuestion, 400);
    } else {
      setFeedback("wrong");
      setCorrectAnswer(question.answer);
      feedbackRef.current = setTimeout(nextQuestion, 1000);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const timeFraction = timeLeft / meta.time;
  const timerColor = timeFraction > 0.5
    ? "bg-emerald-500"
    : timeFraction > 0.25
    ? "bg-amber-500"
    : "bg-red-500";

  return (
    <Layout title="Math Blitz">
      <div className="max-w-xl mx-auto pb-12 py-4 space-y-5">

        {/* ─── SELECT SCREEN ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {gameState === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Calculator className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black">Math Blitz</h1>
                <p className="text-muted-foreground text-sm mt-1">Answer as many as you can before time runs out!</p>
              </div>

              {/* Group play notice */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-4 py-3 mb-2 text-sm text-amber-800 dark:text-amber-300">
                <span className="text-base shrink-0">⚠️</span>
                <p>Scores only count towards the leaderboard when you play <span className="font-semibold">within your group</span>. Games played outside your group won't be recorded.</p>
              </div>

              {/* Difficulty cards */}
              <div className="grid grid-cols-1 gap-3">
                {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(diff => {
                  const m = DIFFICULTY_META[diff];
                  const isSuggested = diff === suggestedDiff;
                  return (
                    <motion.button
                      key={diff}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startCountdown(diff)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border-2 transition-all",
                        m.border, m.bg,
                        isSuggested && "ring-2 ring-offset-2 ring-offset-background ring-primary",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{m.emoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("font-bold text-base", m.color)}>{m.label}</span>

                              {(diff === "hard" || diff === "extreme") && (
                                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                  shared board
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{m.grades} · {m.ops}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl", m.bg, m.textColor)}>
                            <Timer className="w-3 h-3" />
                            {m.time}s
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* No-calculator notice */}
              <div className="flex items-start gap-2 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-2xl px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
                <span className="text-base shrink-0">🚫</span>
                <p>This is a <span className="font-semibold">mental maths</span> challenge. Please do not use a calculator — scores achieved with one are unfair to other players.</p>
              </div>
            </motion.div>
          )}

          {/* ─── COUNTDOWN ─────────────────────────────────────────────────── */}
          {gameState === "countdown" && (
            <motion.div key="countdown" className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-lg text-muted-foreground font-semibold">{meta.label} · {meta.time}s</p>
              <AnimatePresence mode="wait">
                <motion.p key={countdown}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn("text-8xl font-black tabular-nums", meta.color)}
                >
                  {countdown}
                </motion.p>
              </AnimatePresence>
              <p className="text-muted-foreground text-sm">Get ready!</p>
            </motion.div>
          )}

          {/* ─── PLAYING ───────────────────────────────────────────────────── */}
          {gameState === "playing" && question && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Timer bar + score */}
              <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className={cn("font-bold tabular-nums text-lg", timeFraction <= 0.25 && "text-red-500 animate-pulse")}>
                      {timeLeft}s
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-black text-xl">{score}</span>
                    <span className="text-muted-foreground text-xs">correct</span>
                  </div>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full transition-colors duration-300", timerColor)}
                    animate={{ width: `${timeFraction * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${question.a}${question.op}${question.b}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className={cn(
                    "bg-card rounded-3xl border-2 p-8 text-center transition-colors duration-200",
                    feedback === "correct" && "border-emerald-500 bg-emerald-500/5",
                    feedback === "wrong" && "border-red-500 bg-red-500/5",
                    !feedback && "border-border/60",
                  )}
                >
                  <p className="text-5xl font-black tracking-tight tabular-nums">
                    {question.a.toLocaleString()} {question.op} {question.b.toLocaleString()} = ?
                  </p>

                  {feedback === "correct" && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 flex items-center justify-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold">Correct!</span>
                    </motion.div>
                  )}
                  {feedback === "wrong" && correctAnswer !== null && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 flex items-center justify-center gap-2 text-red-500">
                      <XCircle className="w-5 h-5" />
                      <span className="font-bold">Answer: {correctAnswer.toLocaleString()}</span>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Input */}
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={!!feedback}
                  placeholder="Your answer…"
                  className="flex-1 text-center text-2xl font-bold h-14 rounded-2xl border-2 border-border/60 bg-card focus:border-primary focus:outline-none tabular-nums px-4 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!!feedback || input.trim() === ""}
                  className="h-14 px-6 rounded-2xl text-base font-bold"
                >
                  Go
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">Press Enter or tap Go to submit</p>
            </motion.div>
          )}

          {/* ─── RESULTS ───────────────────────────────────────────────────── */}
          {gameState === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* Score card */}
              <div className={cn(
                "rounded-3xl p-8 text-center bg-gradient-to-br border-2",
                `${meta.border}`,
                score >= 20 ? "from-yellow-500/10 to-amber-500/10 border-yellow-500/30"
                : score >= 10 ? "from-primary/10 to-accent/10 border-primary/30"
                : "from-muted/30 to-muted/10 border-border/40",
              )}>
                <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide mb-1">{meta.label} · {meta.time}s</p>
                <p className="text-7xl font-black tabular-nums mt-2">{score}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {score === 0 ? "Keep practising!" : score < 10 ? "Good effort!" : score < 20 ? "Great work!" : "Outstanding! 🏆"}
                </p>
                {!submitted && score > 0 && (
                  <p className="text-xs text-muted-foreground mt-3 animate-pulse">Saving score…</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setGameState("select")} className="flex-1 rounded-2xl gap-2">
                  <RotateCcw className="w-4 h-4" /> Change Difficulty
                </Button>
                <Button onClick={() => startCountdown(difficulty)} className="flex-1 rounded-2xl gap-2">
                  <Zap className="w-4 h-4" /> Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

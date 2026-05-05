import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useGenerateRevisionCards, useSubmitScore } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "@/lib/language-context";
import { Brain, Gamepad2, Sparkles, Trophy, Timer, RefreshCw, Play, RotateCcw, Leaf, Star, Upload, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Memory Match Game ────────────────────────────────────────────────
type CardType = { id: number; pairId: number; text: string; type: "term" | "definition"; flipped: boolean; matched: boolean };

function MemoryMatch() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "loading" | "playing" | "won" | "noNotes">("idle");
  const [finalScore, setFinalScore] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false);

  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const genMut = useGenerateRevisionCards();
  const submitScoreMut = useSubmitScore();

  const startGame = async () => {
    setGameState("loading");
    setScoreSubmitted(false);
    setSubmitError(null);
    setFinalScore(0);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setFlipped([]);
    try {
      const result = await genMut.mutateAsync({ data: { count: 6 } });
      const raw = result.cards ?? [];
      if (raw.length === 0) { setGameState("noNotes"); return; }

      const deck: CardType[] = [];
      raw.forEach((card: { id: number; term: string; definition: string }) => {
        deck.push({ id: card.id * 2 - 1, pairId: card.id, text: card.term, type: "term", flipped: false, matched: false });
        deck.push({ id: card.id * 2, pairId: card.id, text: card.definition, type: "definition", flipped: false, matched: false });
      });

      const shuffled = deck.sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setGameState("playing");
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setGameState("idle");
    }
  };

  const handleFlip = (idx: number) => {
    if (lockRef.current || gameState !== "playing") return;
    const card = cards[idx];
    if (card.flipped || card.matched || flipped.includes(idx)) return;

    const newFlipped = [...flipped, idx];
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      lockRef.current = true;
      const [a, b] = newFlipped;
      if (newCards[a].pairId === newCards[b].pairId) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c));
          setFlipped([]);
          setMatches(m => {
            const next = m + 1;
            if (next === (newCards.length / 2)) {
              setGameState("won");
              if (timerRef.current) clearInterval(timerRef.current);
              setSeconds(s => {
                setMoves(mv => {
                  const computed = Math.max(50, 1000 - s * 3 - mv * 15);
                  setFinalScore(computed);
                  return mv;
                });
                return s;
              });
            }
            return next;
          });
          lockRef.current = false;
        }, 600);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c));
          setFlipped([]);
          lockRef.current = false;
        }, 1000);
      }
    }
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {gameState === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">{t.games.memoryMatch}</h3>
            <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
              {t.games.memoryDesc}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              {[
                [t.games.mmStat1, t.games.mmStat1Desc],
                [t.games.mmStat2, t.games.mmStat2Desc],
                [t.games.mmStat3, t.games.mmStat3Desc],
              ].map(([lbl, desc]) => (
                <div key={lbl} className="bg-primary/5 rounded-2xl p-4">
                  <div className="font-bold text-sm">{lbl}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
              ))}
            </div>
            <Button size="lg" className="rounded-2xl px-10 shadow-xl shadow-primary/20 text-base" onClick={startGame}>
              <Play className="w-5 h-5 mr-2" /> {t.games.startGame}
            </Button>
          </motion.div>
        )}

        {gameState === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="font-semibold text-lg">{t.games.aiReadingNotes}</p>
            <p className="text-muted-foreground text-sm">{t.games.generatingPairs}</p>
          </motion.div>
        )}

        {gameState === "noNotes" && (
          <motion.div key="noNotes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <Brain className="w-16 h-16 text-muted-foreground/40" />
            <h3 className="text-xl font-bold">{t.games.noNotes}</h3>
            <p className="text-muted-foreground">{t.games.noNotesDesc}</p>
            <Button variant="outline" onClick={() => setGameState("idle")} className="rounded-xl mt-2">{t.games.gotIt}</Button>
          </motion.div>
        )}

        {gameState === "won" && (
          <motion.div key="won" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
            <motion.div className="text-7xl mb-6" animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 0.6, delay: 0.2 }}>
              🏆
            </motion.div>
            <h3 className="text-3xl font-bold mb-2">{t.games.youWon}</h3>
            <p className="text-muted-foreground mb-6">{t.games.pairsMatched.replace("{n}", String(matches))}</p>
            <div className="flex gap-4 mb-6 justify-center">
              <div className="bg-primary/10 rounded-2xl p-4 text-center min-w-[80px]">
                <div className="text-xl font-bold text-primary">{fmt(seconds)}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.games.timeLabel}</div>
              </div>
              <div className="bg-primary/10 rounded-2xl p-4 text-center min-w-[80px]">
                <div className="text-xl font-bold text-primary">{moves}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.games.moves}</div>
              </div>
              <div className="bg-amber-500/10 rounded-2xl p-4 text-center min-w-[80px] border border-amber-500/20">
                <div className="text-xl font-bold text-amber-500">{finalScore}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.games.scoreLabel}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 justify-center w-full max-w-xs">
              {isAuthenticated && !scoreSubmitted && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    setSubmitError(null);
                    try {
                      await submitScoreMut.mutateAsync({ data: { gameType: "memory-match", score: finalScore, secondsTaken: seconds } });
                      setScoreSubmitted(true);
                    } catch (err: any) {
                      setSubmitError(err?.message || "Failed to submit score. Please try again.");
                    }
                  }}
                  disabled={submitScoreMut.isPending}
                  className="rounded-xl gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
                >
                  <Upload className="w-4 h-4" />
                  {submitScoreMut.isPending ? t.games.saving : t.games.submitScore}
                </Button>
              )}
              {submitError && (
                <p className="text-xs text-red-500 text-center px-2">{submitError}</p>
              )}
              {scoreSubmitted && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 justify-center">
                  ✓ {t.games.scoreSubmitted}
                </p>
              )}
              <Button size="lg" className="rounded-xl px-8 shadow-xl shadow-primary/20" onClick={startGame}>
                <RefreshCw className="w-5 h-5 mr-2" /> {t.games.playAgain}
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* HUD */}
            <div className="flex items-center justify-between px-2 py-3 shrink-0">
              <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2">
                <Timer className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold text-primary">{fmt(seconds)}</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground">{matches}/{cards.length / 2} {t.games.pairs}</div>
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-bold">{moves} {t.games.movesLabel}</span>
              </div>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-auto py-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 auto-rows-max">
                {cards.map((card, idx) => (
                  <motion.button
                    key={card.id}
                    onClick={() => handleFlip(idx)}
                    className={cn(
                      "relative h-24 sm:h-28 rounded-2xl border-2 text-xs font-medium transition-all duration-200 overflow-hidden",
                      card.matched
                        ? "bg-green-50 dark:bg-green-900/20 border-green-400 cursor-default shadow-md shadow-green-500/10"
                        : card.flipped
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/15 cursor-pointer"
                        : "bg-muted/60 border-border/60 hover:border-primary/30 hover:bg-primary/5 cursor-pointer shadow-sm"
                    )}
                    whileTap={!card.matched && !card.flipped ? { scale: 0.96 } : {}}
                  >
                    <AnimatePresence mode="wait">
                      {card.flipped || card.matched ? (
                        <motion.div
                          key="front"
                          initial={{ rotateY: 90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 p-2 flex flex-col items-center justify-center"
                        >
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5",
                            card.type === "term"
                              ? "bg-primary/15 text-primary"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {card.type === "term" ? t.games.term : t.games.definition}
                          </span>
                          <p className="text-center leading-snug line-clamp-3">{card.text}</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="back"
                          initial={{ rotateY: -90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Brain className="w-7 h-7 text-muted-foreground/30" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="py-2 flex justify-center shrink-0">
              <Button variant="ghost" size="sm" onClick={() => { setGameState("idle"); if (timerRef.current) clearInterval(timerRef.current); }} className="rounded-xl text-muted-foreground gap-2">
                <RotateCcw className="w-4 h-4" /> {t.games.giveUp}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Bubble Pop Game ──────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right";
type Bubble = {
  id: number; x: number; y: number; r: number;
  color: string; speed: number;
  wobble: number; wobbleOffset: number;
  direction: Direction; isBomb: boolean;
};

const BUBBLE_COLORS = [
  "from-sky-300 to-blue-400",
  "from-violet-300 to-purple-400",
  "from-teal-300 to-emerald-400",
  "from-pink-300 to-rose-400",
  "from-amber-300 to-orange-400",
  "from-indigo-300 to-blue-500",
  "from-green-300 to-teal-400",
  "from-fuchsia-300 to-pink-500",
];

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const MAX_LIVES = 5;

let bubbleIdCounter = 0;

function BubblePop() {
  const { t } = useLanguage();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead" | "stopped">("idle");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalBubbleScore, setFinalBubbleScore] = useState(0);
  const [shakeHeart, setShakeHeart] = useState(false);
  const [hellMode, setHellMode] = useState(false);
  const [showHellBanner, setShowHellBanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const hellModeRef = useRef(false);
  const gameStateRef = useRef<"idle" | "playing" | "dead" | "stopped">("idle");

  const { isAuthenticated } = useAuth();
  const submitScoreMut = useSubmitScore();

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    setShakeHeart(true);
    setTimeout(() => setShakeHeart(false), 400);
    if (livesRef.current <= 0) {
      cancelAnimationFrame(animRef.current);
      bubblesRef.current = [];
      setBubbles([]);
      setFinalBubbleScore(scoreRef.current);
      gameStateRef.current = "dead";
      setGameState("dead");
    }
  }, []);

  const spawnBubble = useCallback(() => {
    const w = containerRef.current?.clientWidth ?? 400;
    const h = containerRef.current?.clientHeight ?? 600;
    const r = 26 + Math.random() * 24;
    const dir: Direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const isBomb = Math.random() < 0.18;

    let x = 0, y = 0;
    if (dir === "up")    { x = r + Math.random() * (w - r * 2); y = h + r; }
    if (dir === "down")  { x = r + Math.random() * (w - r * 2); y = -r; }
    if (dir === "left")  { x = w + r; y = r + Math.random() * (h - r * 2); }
    if (dir === "right") { x = -r;    y = r + Math.random() * (h - r * 2); }

    const speedBoost = Math.floor(scoreRef.current / 10) * 0.2;
    const base = 1.2 + Math.random() * 0.5 + speedBoost;
    const speed = Math.min(base, 5.0) * (hellModeRef.current ? 2 : 1);

    const b: Bubble = {
      id: ++bubbleIdCounter,
      x, y, r, speed, direction: dir, isBomb,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      wobble: Math.random() * 2 - 1,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
    return b;
  }, []);

  const activateHellMode = useCallback(() => {
    hellModeRef.current = true;
    setHellMode(true);
    setShowHellBanner(true);
    bubblesRef.current = bubblesRef.current.map(b => ({ ...b, speed: b.speed * 2 }));
    setTimeout(() => setShowHellBanner(false), 2500);
  }, []);

  const tick = useCallback((ts: number) => {
    if (gameStateRef.current !== "playing") return;
    const w = containerRef.current?.clientWidth ?? 400;
    const h = containerRef.current?.clientHeight ?? 600;
    const spawnInterval = Math.max(450, 1200 - Math.floor(scoreRef.current / 5) * 35);

    if (!hellModeRef.current && scoreRef.current >= 150) {
      activateHellMode();
    }

    if (ts - lastSpawnRef.current > spawnInterval) {
      lastSpawnRef.current = ts;
      bubblesRef.current = [...bubblesRef.current, spawnBubble()];
    }

    const t = Date.now() / 1000;
    const escaped: Bubble[] = [];

    bubblesRef.current = bubblesRef.current
      .filter(b => {
        const gone =
          (b.direction === "up"    && b.y < -(b.r * 2)) ||
          (b.direction === "down"  && b.y > h + b.r * 2) ||
          (b.direction === "left"  && b.x < -(b.r * 2)) ||
          (b.direction === "right" && b.x > w + b.r * 2);
        if (gone && !b.isBomb) escaped.push(b);
        return !gone;
      })
      .map(b => {
        const wob = Math.sin(t * b.wobble + b.wobbleOffset) * 0.5;
        return {
          ...b,
          x: b.x + (b.direction === "left" ? -b.speed : b.direction === "right" ? b.speed : wob),
          y: b.y + (b.direction === "up" ? -b.speed : b.direction === "down" ? b.speed : wob),
        };
      });

    setBubbles([...bubblesRef.current]);

    if (escaped.length > 0) {
      for (let i = 0; i < escaped.length; i++) loseLife();
      if (gameStateRef.current !== "playing") return;
    }

    animRef.current = requestAnimationFrame(tick);
  }, [spawnBubble, loseLife, activateHellMode]);

  const startGame = () => {
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    hellModeRef.current = false;
    gameStateRef.current = "playing";
    setScore(0);
    setLives(MAX_LIVES);
    setHellMode(false);
    setShowHellBanner(false);
    setScoreSubmitted(false);
    setSubmitError(null);
    setFinalBubbleScore(0);
    setShakeHeart(false);
    bubblesRef.current = [];
    setBubbles([]);
    setGameState("playing");
    lastSpawnRef.current = 0;
    animRef.current = requestAnimationFrame(tick);
  };

  const stopGame = () => {
    cancelAnimationFrame(animRef.current);
    bubblesRef.current = [];
    setBubbles([]);
    setFinalBubbleScore(scoreRef.current);
    gameStateRef.current = "stopped";
    setGameState("stopped");
  };

  const popBubble = useCallback((b: Bubble) => {
    if (gameStateRef.current !== "playing") return;
    if (b.isBomb) {
      bubblesRef.current = bubblesRef.current.filter(bub => bub.id !== b.id);
      setBubbles([...bubblesRef.current]);
      loseLife();
      return;
    }
    bubblesRef.current = bubblesRef.current.filter(bub => bub.id !== b.id);
    scoreRef.current += 1;
    setScore(s => s + 1);
    setBubbles([...bubblesRef.current]);
  }, [loseLife]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const speedTier = Math.floor(finalBubbleScore / 10);
  const isResult = gameState === "dead" || gameState === "stopped";

  return (
    <div className="h-full flex flex-col">
      {gameState === "idle" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-violet-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-violet-500/20">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3">{t.games.bubblePop}</h3>
          <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
            {t.games.bubblePopGameDesc}
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            {[
              [t.games.bpStat1, t.games.bpStat1Desc],
              [t.games.bpStat2, t.games.bpStat2Desc],
              [t.games.bpStat3, t.games.bpStat3Desc],
            ].map(([lbl, desc]) => (
              <div key={lbl} className="bg-sky-500/5 rounded-2xl p-4 border border-sky-500/10">
                <div className="font-bold text-sm">{lbl}</div>
                <div className="text-xs text-muted-foreground mt-1">{desc}</div>
              </div>
            ))}
          </div>
          <Button size="lg" className="rounded-2xl px-10 shadow-xl shadow-violet-500/20 text-base bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90 border-0" onClick={startGame}>
            <Play className="w-5 h-5 mr-2" /> {t.games.startGame}
          </Button>
        </motion.div>
      )}

      {isResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
          <div className="text-6xl mb-5">{gameState === "dead" ? "💀" : "🫧"}</div>
          <h3 className="text-2xl font-bold mb-1">{gameState === "dead" ? t.games.outOfLives : t.games.greatSession}</h3>
          <p className="text-muted-foreground mb-6">
            {gameState === "dead" ? t.games.popped.replace("{n}", String(finalBubbleScore)) : t.games.poppedSimple.replace("{n}", String(finalBubbleScore))}
          </p>
          <div className="bg-sky-500/10 rounded-2xl px-10 py-5 border border-sky-500/10 mb-3">
            <div className="text-4xl font-extrabold text-sky-500">{finalBubbleScore}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.games.bubblesPopped}</div>
          </div>
          {speedTier > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-5">
              ⚡ {t.games.speedLevel.replace("{n}", String(speedTier))}
            </p>
          )}
          <div className="flex flex-col gap-3 justify-center w-full max-w-xs">
            {isAuthenticated && !scoreSubmitted && (
              <Button
                variant="outline"
                onClick={async () => {
                  setSubmitError(null);
                  try {
                    await submitScoreMut.mutateAsync({ data: { gameType: "bubble-pop", score: finalBubbleScore } });
                    setScoreSubmitted(true);
                  } catch (err: any) {
                    setSubmitError(err?.message || "Failed to submit score. Please try again.");
                  }
                }}
                disabled={submitScoreMut.isPending}
                className="rounded-xl gap-2 border-sky-500/30 text-sky-600 hover:bg-sky-500/5"
              >
                <Upload className="w-4 h-4" />
                {submitScoreMut.isPending ? "Saving…" : "Submit Score"}
              </Button>
            )}
            {submitError && (
              <p className="text-xs text-red-500 text-center px-2">{submitError}</p>
            )}
            {scoreSubmitted && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 justify-center">
                ✓ {t.games.scoreSubmitted}
              </p>
            )}
            <Button size="lg" className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90 border-0 shadow-lg" onClick={startGame}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t.games.playAgain}
            </Button>
          </div>
        </motion.div>
      )}

      {gameState === "playing" && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-2 py-3 shrink-0">
            <div className="flex items-center gap-2 bg-sky-500/10 rounded-xl px-4 py-2">
              <Star className="w-4 h-4 text-sky-500" />
              <span className="font-bold text-sky-600 dark:text-sky-400">{score} {t.games.bubblesPopped}</span>
            </div>
            <motion.div
              animate={shakeHeart ? { x: [-4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-0.5"
            >
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} className={cn("text-lg transition-all", i < lives ? "opacity-100" : "opacity-20 grayscale")}>❤️</span>
              ))}
            </motion.div>
            <Button variant="ghost" size="sm" onClick={stopGame} className="rounded-xl text-muted-foreground gap-2">
              <RotateCcw className="w-4 h-4" /> {t.games.stop}
            </Button>
          </div>

          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-gradient-to-b from-sky-50/30 to-violet-50/30 dark:from-sky-950/20 dark:to-violet-950/20 rounded-2xl border border-sky-200/30 dark:border-sky-800/20"
            style={{ cursor: "crosshair" }}
          >
            <AnimatePresence>
              {bubbles.map(b => (
                <motion.button
                  key={b.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.85 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => popBubble(b)}
                  className={cn(
                    "absolute rounded-full bg-gradient-to-br border border-white/30 shadow-lg cursor-pointer",
                    "hover:scale-110 active:scale-125 transition-transform select-none",
                    b.color
                  )}
                  style={{
                    width: b.r * 2,
                    height: b.r * 2,
                    left: b.x - b.r,
                    top: b.y - b.r,
                  }}
                >
                  <div className="absolute top-[20%] left-[22%] w-[30%] h-[22%] bg-white/50 rounded-full rotate-[-30deg]" />
                  <div className="absolute top-[35%] left-[55%] w-[15%] h-[10%] bg-white/30 rounded-full rotate-[-30deg]" />
                  {b.isBomb && (
                    <div className="absolute bottom-[8%] right-[10%] text-[11px] opacity-60 select-none leading-none">💣</div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>

            {bubbles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground/40 text-sm select-none">{t.games.bubblesIncoming}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Numerica Iframe ──────────────────────────────────────────────────
function NumericaEmbed() {
  return (
    <iframe
      src="/numerica/"
      className="w-full h-full rounded-2xl border-0"
      title="Numerica"
      allow="same-origin"
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
type Game = "memory" | "bubbles" | "numerica" | null;

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<Game>(null);
  const { t } = useLanguage();

  return (
    <Layout title={t.nav.minigames}>
      {activeGame === null ? (
        <div className="max-w-3xl mx-auto py-6">
          <p className="text-muted-foreground mb-8">{t.games.subtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Memory Match Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => setActiveGame("memory")}
            >
              <div className="h-3 bg-gradient-to-r from-primary to-purple-500" />
              <div className="p-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{t.games.memoryMatch}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.games.aiPoweredBadge}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {t.games.memoryMatchPageDesc}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 text-xs">
                  {t.games.memoryMatchTags.map((tag: string) => (
                    <span key={tag} className="bg-muted px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
                <Button className="w-full rounded-2xl shadow-lg shadow-primary/15 group-hover:shadow-primary/25 transition-all">
                  <Play className="w-4 h-4 mr-2" /> {t.games.playNow}
                </Button>
              </div>
            </motion.div>

            {/* Bubble Pop Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => setActiveGame("bubbles")}
            >
              <div className="h-3 bg-gradient-to-r from-sky-400 to-violet-500" />
              <div className="p-6">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-400/20 to-violet-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Leaf className="w-7 h-7 text-sky-500" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{t.games.bubblePop}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full">{t.games.relaxingBadge}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {t.games.bubblePopPageDesc}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 text-xs">
                  {t.games.bubblePopTags.map((tag: string) => (
                    <span key={tag} className="bg-muted px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
                <Button className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-violet-500/15 group-hover:shadow-violet-500/25 transition-all">
                  <Play className="w-4 h-4 mr-2" /> {t.games.playNow}
                </Button>
              </div>
            </motion.div>

            {/* Numerica Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group sm:col-span-2"
              onClick={() => setActiveGame("numerica")}
            >
              <div className="h-3 bg-gradient-to-r from-cyan-400 to-indigo-500" />
              <div className="p-6 sm:flex sm:items-center sm:gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 sm:mb-0 sm:shrink-0 group-hover:scale-110 transition-transform">
                  <Hash className="w-7 h-7 text-cyan-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">{t.games.numerica}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full">{t.games.numericaBadge}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t.games.numericaPageDesc}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5 text-xs">
                    {t.games.numericaTags.map((tag: string) => (
                      <span key={tag} className="bg-muted px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <Button className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 border-0 shadow-lg shadow-cyan-500/15 group-hover:shadow-cyan-500/25 transition-all px-8">
                    <Play className="w-4 h-4 mr-2" /> {t.games.playNow}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="rounded-xl gap-2 text-muted-foreground">
              <Gamepad2 className="w-4 h-4" /> {t.games.allGames}
            </Button>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold">
              {activeGame === "memory" ? t.games.memoryMatch : activeGame === "bubbles" ? t.games.bubblePop : t.games.numerica}
            </span>
            {activeGame === "memory" && (
              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
          </div>
          <div className="flex-1 bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col" style={activeGame === "numerica" ? { padding: 0 } : { padding: "1rem" }}>
            {activeGame === "memory" ? <MemoryMatch /> : activeGame === "bubbles" ? <BubblePop /> : <NumericaEmbed />}
          </div>
        </div>
      )}
    </Layout>
  );
}

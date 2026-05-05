import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useSessionStore } from "@/lib/sessionStore";
import {
  generateSolvablePuzzle,
  generateDigits,
  generateTarget,
  evaluateTokens,
  calculateScore,
} from "@/lib/engine";
import type { Operator } from "@/lib/engine";

const TIME_MAP: Record<string, number> = {
  "60s": 60,
  "2 min": 120,
  "3 min": 180,
  "Play 'til Dead": Infinity,
};

const DEFAULT_OPS: Operator[] = ['+', '-', '×', '÷'];
const ADVANCED_OPS: Operator[] = ['^', 'mod'];

export default function Game() {
  const [, setLocation] = useLocation();
  const { settings, unlockedOps, setHighScore, addScore: addPersistScore, setTotalScore } = useGameStore();
  const session = useSessionStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isClosest = settings.modes.includes("Closest Wins");
  const isPlayTilDead = settings.timeMode === "Play 'til Dead";
  const totalTime = TIME_MAP[settings.timeMode] ?? 60;

  const loadPuzzle = useCallback(() => {
    const target = settings.modes.includes("Classic")
      ? settings.customTarget
      : generateTarget();
    let digits: number[];
    if (settings.modes.includes("Random Numbers")) {
      digits = generateDigits(settings.digitCount, settings.allowNegative);
    } else {
      digits = generateSolvablePuzzle(settings.digitCount, target, settings.allowNegative);
    }
    session.setDigits(digits, target);
    session.setLastResult(null);
  }, [settings]);

  useEffect(() => {
    session.reset();
    const t = TIME_MAP[settings.timeMode] ?? 60;
    session.setTimeLeft(isPlayTilDead ? 99999 : t);
    loadPuzzle();
    session.setStarted(true);

    if (!isPlayTilDead) {
      timerRef.current = setInterval(() => {
        useSessionStore.setState((s) => {
          if (s.timeLeft <= 1) {
            clearInterval(timerRef.current!);
            return { timeLeft: 0, finished: true };
          }
          return { timeLeft: s.timeLeft - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (successRef.current) clearTimeout(successRef.current);
    };
  }, []);

  useEffect(() => {
    if (session.finished) {
      setHighScore(session.score);
      addPersistScore({ score: session.score, modes: settings.modes, date: new Date().toISOString() });
      setTotalScore(session.score);
      setLocation("/result");
    }
  }, [session.finished]);

  const handleSubmit = () => {
    const { tokens, target, timeLeft, puzzlesSolved } = session;
    if (tokens.length < 1) { session.setError("Build an expression first"); return; }

    const { result, error } = evaluateTokens(tokens);

    if (error || result === null) { session.setError(error ?? "Invalid expression"); return; }

    const exact = Math.abs(result - target) < 0.001;
    const distance = Math.abs(result - target);
    const opsUsed = tokens.filter(t => t.type === 'op').length;
    const pts = calculateScore({ exact, distance, timeLeft, totalTime, opsUsed });

    if (isPlayTilDead && !exact && !isClosest) {
      session.setLastResult({ correct: false, points: 0 });
      session.setError(`Wrong! Got ${result}, needed ${target}.`);
      successRef.current = setTimeout(() => {
        session.setFinished(true);
      }, 1200);
      return;
    }

    if (exact || isClosest) {
      session.addScore(pts);
      session.incrementPuzzles();
      session.setLastResult({ correct: exact, points: pts });
      successRef.current = setTimeout(() => {
        loadPuzzle();
      }, 900);
    } else {
      session.setError(`Got ${result}, target is ${target}. Try again!`);
    }
  };

  const ops = unlockedOps ? [...DEFAULT_OPS, ...ADVANCED_OPS] : DEFAULT_OPS;
  const isLow = !isPlayTilDead && session.timeLeft <= 10;

  const expressionStr = session.tokens.map((t) => {
    if (t.type === 'bracket') return t.value;
    if (t.type === 'op') return ` ${t.value} `;
    return String(t.value);
  }).join('');

  const formatTime = (s: number) => {
    if (!isFinite(s) || s > 9999) return '∞';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-between p-4 font-mono select-none">
      {/* Header */}
      <div className="w-full max-w-xl flex justify-between items-center pt-2">
        <button onClick={() => { session.setFinished(true); }} className="text-gray-500 hover:text-cyan-400 transition-colors text-sm uppercase tracking-widest">
          Quit
        </button>
        <motion.div
          animate={isLow ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className={`text-3xl font-bold tabular-nums ${isLow ? 'text-red-400' : 'text-cyan-400'}`}
          data-testid="timer-display"
        >
          {formatTime(session.timeLeft)}
        </motion.div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Score</div>
          <div className="text-xl font-bold text-cyan-400" data-testid="score-display">{session.score}</div>
        </div>
      </div>

      {/* Target */}
      <div className="text-center my-4">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Target</div>
        <motion.div
          key={session.target}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          data-testid="target-display"
        >
          {session.target}
        </motion.div>
      </div>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {session.lastResult && (
          <motion.div
            key={session.puzzlesSolved}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`text-center py-1 font-bold text-lg ${session.lastResult.correct ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {session.lastResult.correct ? `+${session.lastResult.points} pts` : `Closest: +${session.lastResult.points} pts`}
          </motion.div>
        )}
        {session.error && !session.lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-sm text-center py-1"
          >
            {session.error}
          </motion.div>
        )}
        {!session.lastResult && !session.error && <div className="h-7" />}
      </AnimatePresence>

      {/* Digit Tiles */}
      <div className="flex gap-3 flex-wrap justify-center my-2">
        {session.digits.map((d, i) => {
          const used = session.usedIndices.includes(i);
          return (
            <motion.button
              key={i}
              data-testid={`digit-tile-${i}`}
              whileHover={!used ? { scale: 1.08 } : {}}
              whileTap={!used ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: used ? 0.3 : 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => !used && session.toggleDigit(i)}
              className={`w-16 h-16 rounded-xl text-2xl font-black border-2 transition-colors
                ${used
                  ? 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed'
                  : 'bg-gray-900 border-cyan-700 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-950 shadow-[0_0_12px_rgba(34,211,238,0.2)] cursor-pointer'
                }`}
            >
              {d}
            </motion.button>
          );
        })}
      </div>

      {/* Expression Display */}
      <div className="w-full max-w-xl bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 text-center min-h-[52px] text-xl font-mono tracking-wider text-white my-2">
        {expressionStr || <span className="text-gray-600">Click digits and operators...</span>}
      </div>

      {/* Operators + Brackets */}
      <div className="flex flex-wrap gap-2 justify-center my-2">
        {/* Bracket buttons */}
        {(['(', ')'] as const).map((br) => (
          <motion.button
            key={br}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => session.addBracket(br)}
            className="w-14 h-14 rounded-xl text-2xl font-black bg-gray-800 border-2 border-gray-600 text-gray-300 hover:border-cyan-500 hover:bg-gray-700 transition-colors"
          >
            {br}
          </motion.button>
        ))}

        {/* Operator buttons */}
        {ops.map((op) => (
          <motion.button
            key={op}
            data-testid={`op-${op}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => session.addOp(op)}
            className="w-14 h-14 rounded-xl text-xl font-black bg-indigo-950 border-2 border-indigo-700 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.2)]"
          >
            {op}
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-xl mt-2 mb-4">
        <button
          data-testid="button-clear"
          onClick={() => session.clearExpression()}
          className="flex-1 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm"
        >
          Clear
        </button>
        <motion.button
          data-testid="button-submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          className="flex-[2] py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
        >
          Submit
        </motion.button>
      </div>

      {/* Puzzles solved */}
      <div className="text-xs text-gray-600 mb-2">
        Solved: <span className="text-gray-400">{session.puzzlesSolved}</span>
        {isPlayTilDead && <span className="ml-4">Streak: <span className="text-cyan-500">{session.streak}</span></span>}
      </div>
    </div>
  );
}

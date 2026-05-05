import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { useSessionStore } from "@/lib/sessionStore";
import { Trophy, RotateCcw, Settings, Star } from "lucide-react";

export default function Result() {
  const [, setLocation] = useLocation();
  const { highScore } = useGameStore();
  const { score, puzzlesSolved, totalTime, timeLeft, settings: _s } = useSessionStore() as any;

  const session = useSessionStore();
  const isNewBest = score >= highScore && score > 0;
  const timeTaken = isFinite(session.totalTime) ? session.totalTime - session.timeLeft : "∞";

  useEffect(() => {
    if (!session.started) setLocation("/");
  }, []);

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center p-6 font-mono">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Header */}
        <div className="space-y-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center"
          >
            {isNewBest ? (
              <Star className="w-16 h-16 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
            ) : (
              <Trophy className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
            )}
          </motion.div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white">
            {isNewBest ? "New Record!" : "Round Over"}
          </h1>
          {isNewBest && (
            <p className="text-yellow-400 text-sm uppercase tracking-widest">Personal Best</p>
          )}
        </div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/80 border-2 border-cyan-900 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]"
        >
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Final Score</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-6xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              data-testid="final-score"
            >
              {session.score}
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Puzzles</div>
              <div className="text-2xl font-bold text-white" data-testid="puzzles-solved">{session.puzzlesSolved}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Time Used</div>
              <div className="text-2xl font-bold text-white">{timeTaken}s</div>
            </div>
            <div className="text-center col-span-2 pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">All-Time Best</div>
              <div className="text-xl font-bold text-yellow-400">{highScore}</div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            data-testid="button-play-again"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setLocation("/game")}
            className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </motion.button>
          <button
            data-testid="button-change-settings"
            onClick={() => setLocation("/")}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Change Settings
          </button>
          <button
            onClick={() => setLocation("/leaderboard")}
            className="w-full py-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm uppercase tracking-widest"
          >
            View Leaderboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

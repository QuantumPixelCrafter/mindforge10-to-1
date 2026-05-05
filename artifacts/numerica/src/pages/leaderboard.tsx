import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { ArrowLeft, Trophy, Medal } from "lucide-react";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { scores, highScore } = useGameStore();

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center p-6 font-mono">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setLocation("/")}
            className="text-gray-500 hover:text-cyan-400 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-widest text-white">Leaderboard</h1>
        </div>

        {/* All-time best */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-950/40 border border-yellow-800/60 rounded-2xl p-5 text-center"
        >
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-xs text-yellow-600 uppercase tracking-widest mb-1">All-Time Best</div>
          <div className="text-4xl font-black text-yellow-400" data-testid="all-time-best">{highScore}</div>
        </motion.div>

        {/* Scores list */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest">Top Scores</div>
          {scores.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No scores yet. Play a round!</p>
            </div>
          ) : (
            scores.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3"
                data-testid={`score-entry-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{medals[i] || `#${i + 1}`}</span>
                  <div>
                    <div className="text-xs text-gray-500">{entry.modes.join(' + ')}</div>
                    <div className="text-xs text-gray-600">{new Date(entry.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-xl font-black text-cyan-400">{entry.score}</div>
              </motion.div>
            ))
          )}
        </div>

        {scores.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setLocation("/game")}
            className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] mt-4"
            data-testid="button-play"
          >
            Play Now
          </motion.button>
        )}
      </div>
    </div>
  );
}

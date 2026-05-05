import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScoreEntry {
  score: number;
  modes: string[];
  date: string;
}

interface GameState {
  highScore: number;
  scores: ScoreEntry[];
  unlockedOps: boolean;
  totalScore: number;
  
  settings: {
    digitCount: number;
    timeMode: string;
    modes: string[];
    allowNegative: boolean;
    allowFractions: boolean;
    customTarget: number;
  };
  
  setHighScore: (score: number) => void;
  addScore: (entry: ScoreEntry) => void;
  setTotalScore: (score: number) => void;
  updateSettings: (settings: Partial<GameState['settings']>) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      highScore: 0,
      scores: [],
      unlockedOps: false,
      totalScore: 0,
      
      settings: {
        digitCount: 4,
        timeMode: '60s',
        modes: ['Classic'],
        allowNegative: false,
        allowFractions: false,
        customTarget: 24,
      },
      
      setHighScore: (score) => set({ highScore: Math.max(get().highScore, score) }),
      addScore: (entry) => set((state) => {
        const newScores = [...state.scores, entry].sort((a, b) => b.score - a.score).slice(0, 10);
        return { scores: newScores };
      }),
      setTotalScore: (score) => set((state) => {
        const newTotal = state.totalScore + score;
        return { totalScore: newTotal, unlockedOps: newTotal >= 500 };
      }),
      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    {
      name: 'numerica-storage',
    }
  )
);

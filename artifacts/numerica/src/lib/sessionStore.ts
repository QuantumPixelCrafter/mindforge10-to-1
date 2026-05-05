import { create } from 'zustand';
import type { ExprToken, Operator } from './engine';

export interface GameSession {
  digits: number[];
  target: number;
  usedIndices: number[];
  tokens: ExprToken[];
  score: number;
  puzzlesSolved: number;
  timeLeft: number;
  totalTime: number;
  started: boolean;
  finished: boolean;
  streak: number;
  error: string | null;
  balanceEquation: { lhs: string; rhs: number; missingOp: Operator; candidates: Operator[]; operands: [number, number] } | null;
  lastResult: { correct: boolean; points: number } | null;
}

interface SessionActions {
  setDigits: (digits: number[], target: number) => void;
  toggleDigit: (idx: number) => void;
  addOp: (op: Operator) => void;
  clearExpression: () => void;
  setTokens: (tokens: ExprToken[]) => void;
  addScore: (points: number) => void;
  incrementPuzzles: () => void;
  setTimeLeft: (t: number) => void;
  setStarted: (v: boolean) => void;
  setFinished: (v: boolean) => void;
  setError: (e: string | null) => void;
  setBalance: (b: GameSession['balanceEquation']) => void;
  setLastResult: (r: GameSession['lastResult']) => void;
  reset: () => void;
}

const initial: GameSession = {
  digits: [],
  target: 24,
  usedIndices: [],
  tokens: [],
  score: 0,
  puzzlesSolved: 0,
  timeLeft: 60,
  totalTime: 60,
  started: false,
  finished: false,
  streak: 0,
  error: null,
  balanceEquation: null,
  lastResult: null,
};

export const useSessionStore = create<GameSession & SessionActions>((set) => ({
  ...initial,
  setDigits: (digits, target) => set({ digits, target, usedIndices: [], tokens: [], error: null }),
  toggleDigit: (idx) =>
    set((s) => {
      if (s.usedIndices.includes(idx)) return {};
      const newTokens: ExprToken[] = [...s.tokens, { type: 'number', value: s.digits[idx] }];
      return { tokens: newTokens, usedIndices: [...s.usedIndices, idx], error: null };
    }),
  addOp: (op) =>
    set((s) => {
      if (s.tokens.length === 0 || s.tokens[s.tokens.length - 1].type === 'op') return {};
      return { tokens: [...s.tokens, { type: 'op', value: op }], error: null };
    }),
  clearExpression: () => set({ tokens: [], usedIndices: [], error: null }),
  setTokens: (tokens) => set({ tokens }),
  addScore: (points) => set((s) => ({ score: s.score + points })),
  incrementPuzzles: () => set((s) => ({ puzzlesSolved: s.puzzlesSolved + 1, streak: s.streak + 1 })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  setStarted: (v) => set({ started: v }),
  setFinished: (v) => set({ finished: v }),
  setError: (e) => set({ error: e }),
  setBalance: (b) => set({ balanceEquation: b }),
  setLastResult: (r) => set({ lastResult: r }),
  reset: () => set({ ...initial }),
}));

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
  lastResult: { correct: boolean; points: number } | null;
}

interface SessionActions {
  setDigits: (digits: number[], target: number) => void;
  toggleDigit: (idx: number) => void;
  addOp: (op: Operator) => void;
  addBracket: (bracket: '(' | ')') => void;
  clearExpression: () => void;
  setTokens: (tokens: ExprToken[]) => void;
  addScore: (points: number) => void;
  incrementPuzzles: () => void;
  setTimeLeft: (t: number) => void;
  setStarted: (v: boolean) => void;
  setFinished: (v: boolean) => void;
  setError: (e: string | null) => void;
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
  lastResult: null,
};

export const useSessionStore = create<GameSession & SessionActions>((set) => ({
  ...initial,

  setDigits: (digits, target) => set({ digits, target, usedIndices: [], tokens: [], error: null }),

  toggleDigit: (idx) =>
    set((s) => {
      if (s.usedIndices.includes(idx)) return {};
      const last = s.tokens[s.tokens.length - 1];
      // Cannot place a number right after another number or a closing bracket
      if (last && (last.type === 'number' || (last.type === 'bracket' && last.value === ')'))) return {};
      const newTokens: ExprToken[] = [...s.tokens, { type: 'number', value: s.digits[idx] }];
      return { tokens: newTokens, usedIndices: [...s.usedIndices, idx], error: null };
    }),

  addOp: (op) =>
    set((s) => {
      const last = s.tokens[s.tokens.length - 1];
      // Op requires something before it; cannot follow another op or an open bracket
      if (!last) return {};
      if (last.type === 'op') return {};
      if (last.type === 'bracket' && last.value === '(') return {};
      return { tokens: [...s.tokens, { type: 'op', value: op }], error: null };
    }),

  addBracket: (bracket) =>
    set((s) => {
      const last = s.tokens[s.tokens.length - 1];
      if (bracket === '(') {
        // ( is allowed at start, after an op, or after another (
        if (last && last.type === 'number') return {};
        if (last && last.type === 'bracket' && last.value === ')') return {};
        return { tokens: [...s.tokens, { type: 'bracket', value: '(' }], error: null };
      } else {
        // ) requires a number or ) before it
        if (!last || last.type === 'op' || (last.type === 'bracket' && last.value === '(')) return {};
        // Must have an unmatched open bracket
        let depth = 0;
        for (const t of s.tokens) {
          if (t.type === 'bracket' && t.value === '(') depth++;
          if (t.type === 'bracket' && t.value === ')') depth--;
        }
        if (depth <= 0) return {};
        return { tokens: [...s.tokens, { type: 'bracket', value: ')' }], error: null };
      }
    }),

  clearExpression: () => set({ tokens: [], usedIndices: [], error: null }),
  setTokens: (tokens) => set({ tokens }),
  addScore: (points) => set((s) => ({ score: s.score + points })),
  incrementPuzzles: () => set((s) => ({ puzzlesSolved: s.puzzlesSolved + 1, streak: s.streak + 1 })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  setStarted: (v) => set({ started: v }),
  setFinished: (v) => set({ finished: v }),
  setError: (e) => set({ error: e }),
  setLastResult: (r) => set({ lastResult: r }),
  reset: () => set({ ...initial }),
}));

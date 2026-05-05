export type Operator = '+' | '-' | '×' | '÷' | '^' | 'mod';

export type ExprToken =
  | { type: 'number'; value: number }
  | { type: 'op'; value: Operator }
  | { type: 'bracket'; value: '(' | ')' };

export function applyOp(a: number, b: number, op: Operator): number | null {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? null : a / b;
    case '^': return Math.pow(a, b);
    case 'mod': return b === 0 ? null : a % b;
    default: return null;
  }
}

function precedence(op: Operator): number {
  if (op === '^') return 4;
  if (op === 'mod' || op === '×' || op === '÷') return 3;
  return 2;
}

function isRightAssoc(op: Operator): boolean {
  return op === '^';
}

function canSolveRec(nums: number[], target: number): boolean {
  if (nums.length === 1) return Math.abs(nums[0] - target) < 0.001;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const remaining = nums.filter((_, idx) => idx !== i && idx !== j);
      for (const op of ['+', '-', '×', '÷'] as Operator[]) {
        const result = applyOp(nums[i], nums[j], op);
        if (result !== null && Number.isFinite(result)) {
          if (canSolveRec([...remaining, result], target)) return true;
        }
      }
    }
  }
  return false;
}

export function canSolve(digits: number[], target: number): boolean {
  return canSolveRec(digits, target);
}

/**
 * Returns true if ANY non-empty subset of `digits` can be combined
 * (using all members of that subset) to reach `target`.
 * Used for Freestyle mode where not all digits need to be used.
 */
export function canSolveAny(digits: number[], target: number): boolean {
  const n = digits.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = digits.filter((_, i) => mask & (1 << i));
    if (subset.length === 1) {
      if (Math.abs(subset[0] - target) < 0.001) return true;
    } else {
      if (canSolveRec(subset, target)) return true;
    }
  }
  return false;
}

export function generateDigits(count: number, allowNegative: boolean): number[] {
  const digits: number[] = [];
  for (let i = 0; i < count; i++) {
    let n = Math.floor(Math.random() * 9) + 1;
    if (allowNegative && Math.random() < 0.2) n = -n;
    digits.push(n);
  }
  return digits;
}

export function generateTarget(min = 10, max = 50): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates random digits where at least one subset can reach the target.
 * Used for Freestyle mode — digits don't all need to be used.
 */
export function generateFreestylePuzzle(
  count: number,
  target: number,
  maxAttempts = 1000
): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const digits = generateDigits(count, false);
    if (canSolveAny(digits, target)) return digits;
  }
  // Constructive fallback: find 2-3 digits that solve the target, pad with randoms
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      if (canSolveRec([a, b], target)) {
        const pad = Array.from({ length: Math.max(0, count - 2) }, () => Math.floor(Math.random() * 9) + 1);
        return shuffle([a, b, ...pad]);
      }
      for (let c = 1; c <= 9; c++) {
        if (canSolveRec([a, b, c], target)) {
          const pad = Array.from({ length: Math.max(0, count - 3) }, () => Math.floor(Math.random() * 9) + 1);
          return shuffle([a, b, c, ...pad]);
        }
      }
    }
  }
  return generateDigits(count, false);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Brute-forces all 9^3 = 729 positive 3-digit combos to find one that solves
 * the target, then pads extra slots with 1 (×1 preserves any result).
 * This is the last-resort fallback and is guaranteed to succeed for any
 * target in the range 10–50.
 */
function constructGuaranteedDigits(count: number, target: number): number[] {
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      for (let c = 1; c <= 9; c++) {
        const base = [a, b, c];
        if (canSolve(base, target)) {
          return count <= 3 ? base : [...base, ...Array(count - 3).fill(1)];
        }
      }
    }
  }
  // Should never be reached for targets 10–50
  return Array(count).fill(1);
}

export function generateSolvablePuzzle(
  count: number,
  target: number,
  allowNegative: boolean,
  maxAttempts = 1000
): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const digits = generateDigits(count, allowNegative);
    if (canSolve(digits, target)) return digits;
  }
  // Guaranteed constructive fallback — never returns an unsolvable puzzle
  return constructGuaranteedDigits(count, target);
}

export function evaluateTokens(tokens: ExprToken[]): { result: number | null; error?: string } {
  if (tokens.length === 0) return { result: null, error: 'Empty expression' };
  if (tokens.length === 1 && tokens[0].type === 'number') return { result: tokens[0].value };

  const output: number[] = [];
  const opStack: (Operator | '(')[] = [];

  const applyTop = (): boolean => {
    const op = opStack.pop() as Operator;
    const b = output.pop();
    const a = output.pop();
    if (a === undefined || b === undefined) return false;
    const r = applyOp(a, b, op);
    if (r === null || !Number.isFinite(r)) return false;
    output.push(r);
    return true;
  };

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token.value);
    } else if (token.type === 'op') {
      const op = token.value;
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] !== '(' &&
        (
          precedence(opStack[opStack.length - 1] as Operator) > precedence(op) ||
          (precedence(opStack[opStack.length - 1] as Operator) === precedence(op) && !isRightAssoc(op))
        )
      ) {
        if (!applyTop()) return { result: null, error: 'Invalid operation' };
      }
      opStack.push(op);
    } else if (token.type === 'bracket') {
      if (token.value === '(') {
        opStack.push('(');
      } else {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          if (!applyTop()) return { result: null, error: 'Invalid operation' };
        }
        if (opStack.length === 0) return { result: null, error: 'Mismatched brackets' };
        opStack.pop();
      }
    }
  }

  while (opStack.length > 0) {
    if (opStack[opStack.length - 1] === '(') return { result: null, error: 'Mismatched brackets' };
    if (!applyTop()) return { result: null, error: 'Invalid operation' };
  }

  if (output.length !== 1) return { result: null, error: 'Invalid expression' };
  return { result: Math.round(output[0] * 10000) / 10000 };
}

export function calculateScore(params: {
  exact: boolean;
  distance: number;
  timeLeft: number;
  totalTime: number;
  opsUsed: number;
}): number {
  const { exact, distance, timeLeft, totalTime, opsUsed } = params;
  if (exact) {
    const speedBonus = totalTime > 0 ? Math.round((timeLeft / totalTime) * 50) : 0;
    const efficiencyBonus = Math.max(0, 10 - opsUsed) * 5;
    return 100 + speedBonus + efficiencyBonus;
  }
  return Math.max(0, 100 - distance);
}

export type Operator = '+' | '-' | '×' | '÷' | '^' | 'mod' | '!';

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

export function generateDigits(count: number, allowNegative: boolean): number[] {
  const digits: number[] = [];
  for (let i = 0; i < count; i++) {
    let n = Math.floor(Math.random() * 9) + 1;
    if (allowNegative && Math.random() < 0.2) n = -n;
    digits.push(n);
  }
  return digits;
}

export function generateTarget(min = 10, max = 99): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSolvablePuzzle(
  count: number,
  target: number,
  allowNegative: boolean,
  maxAttempts = 200
): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const digits = generateDigits(count, allowNegative);
    if (canSolve(digits, target)) return digits;
  }
  return generateDigits(count, allowNegative);
}

export interface BalanceEquation {
  lhs: string;
  rhs: number;
  missingOp: Operator;
  candidates: Operator[];
  operands: [number, number];
}

export function generateBalanceEquation(digits: number[]): BalanceEquation {
  const ops: Operator[] = ['+', '-', '×', '÷'];
  const shuffled = [...digits].sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const b = shuffled[1];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const result = applyOp(a, b, op);
  const rhs = result !== null && Number.isFinite(result) ? result : a + b;
  return {
    lhs: `${a} ? ${b}`,
    rhs: Math.round(rhs * 100) / 100,
    missingOp: op,
    candidates: ops,
    operands: [a, b],
  };
}

export type ExprToken = { type: 'number'; value: number } | { type: 'op'; value: Operator };

export function evaluateTokens(tokens: ExprToken[]): { result: number | null; error?: string } {
  if (tokens.length === 0) return { result: null, error: 'Empty expression' };
  if (tokens.length === 1 && tokens[0].type === 'number') return { result: tokens[0].value };

  const nums: number[] = [];
  const ops: Operator[] = [];

  for (const t of tokens) {
    if (t.type === 'number') nums.push(t.value);
    else ops.push(t.value);
  }

  if (nums.length !== ops.length + 1) return { result: null, error: 'Invalid expression' };

  let result = nums[0];
  for (let i = 0; i < ops.length; i++) {
    const r = applyOp(result, nums[i + 1], ops[i]);
    if (r === null) return { result: null, error: 'Division by zero' };
    result = r;
  }

  return { result: Math.round(result * 10000) / 10000 };
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

export interface Tile {
  id: string;
  value: number;
  expression: string;
}

export const generatePuzzle = (digitCount: number, allowNegative: boolean, customTarget: number = 24) => {
  const digits = Array.from({ length: digitCount }, () => {
    let num = Math.floor(Math.random() * 9) + 1;
    if (allowNegative && Math.random() > 0.5) num *= -1;
    return num;
  });
  
  const tiles: Tile[] = digits.map((d, i) => ({
    id: `tile-${i}`,
    value: d,
    expression: d.toString()
  }));

  return {
    initialTiles: tiles,
    target: customTarget,
  };
};

export const evaluateOperation = (a: number, b: number, op: string): number | null => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? null : a / b;
    case '×²': return Math.pow(a, b);
    case 'mod': return b === 0 ? null : a % b;
    default: return null;
  }
};

export const calculateScore = (timeRemaining: number, distance: number = 0, isClosestWins: boolean = false) => {
  if (isClosestWins) {
    return Math.max(0, 100 - distance);
  }
  return distance === 0 ? 100 + Math.min(50, Math.floor(timeRemaining / 2)) : 0;
};

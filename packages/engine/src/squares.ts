// The 9×9 board. A square is a number 0–80: rank * 9 + file, so a1 = 0, i1 = 8, a2 = 9, i9 = 80.
// Everything here is computed once at startup, so move generation only looks things up.

export const N = 9;
export const SQUARES = N * N;

export const fileOf = (s: number): number => s % N;
export const rankOf = (s: number): number => (s / N) | 0;
export const square = (file: number, rank: number): number => rank * N + file;
export const onBoard = (file: number, rank: number): boolean => file >= 0 && file < N && rank >= 0 && rank < N;
export const onEdge = (s: number): boolean => {
  const f = fileOf(s), r = rankOf(s);
  return f === 0 || r === 0 || f === N - 1 || r === N - 1;
};
export const distance = (a: number, b: number): number =>
  Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

export const squareName = (s: number): string => 'abcdefghi'[fileOf(s)] + (rankOf(s) + 1);
export function parseSquare(name: string): number {
  const f = name.charCodeAt(0) - 97, r = Number(name.slice(1)) - 1;
  if (!onBoard(f, r) || name.length !== 2) throw new Error(`Not a square: ${name}`);
  return square(f, r);
}

// The eight directions. The order matters: it fixes the order moves are listed in.
// 0–3 are orthogonal (Fire), 4–7 diagonal (Wind); Earth and the Wizard use all eight.
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];
export const UP = 2, DOWN = 3; // Water's flow directions

// NEIGHBOR[s * 8 + d]: the square one step from s in direction d, or -1 off the board.
export const NEIGHBOR = new Int8Array(SQUARES * 8);
// RAY[(s * 8 + d) * 3 + k - 1]: the square k steps from s in direction d (k = 1..3), or -1.
export const RAY = new Int8Array(SQUARES * 8 * 3);
for (let s = 0; s < SQUARES; s++)
  for (let d = 0; d < 8; d++) {
    const [dx, dy] = DIRS[d];
    for (let k = 1; k <= 3; k++) {
      const f = fileOf(s) + dx * k, r = rankOf(s) + dy * k;
      RAY[(s * 8 + d) * 3 + k - 1] = onBoard(f, r) ? square(f, r) : -1;
    }
    NEIGHBOR[s * 8 + d] = RAY[(s * 8 + d) * 3];
  }

// Water banking around an Earth in direction d from Water's square: the directions a whose
// square also touches that Earth (GAME_SPEC §3, "bank around Earth"). Same for every square;
// off-board results are dropped when used.
export const BANK_DIRS: ReadonlyArray<readonly number[]> = DIRS.map(([ex, ey]) =>
  DIRS.map(([ax, ay], a) => (Math.max(Math.abs(ax - ex), Math.abs(ay - ey)) === 1 ? a : -1)).filter(a => a >= 0));

// Water sliding along the board edge: from an edge square to an orthogonal neighbour on the edge.
// EDGE_DIRS[s] lists those directions (empty for squares off the edge).
export const EDGE_DIRS: ReadonlyArray<readonly number[]> = Array.from({ length: SQUARES }, (_, s) =>
  onEdge(s) ? [0, 1, 2, 3].filter(d => NEIGHBOR[s * 8 + d] >= 0 && onEdge(NEIGHBOR[s * 8 + d])) : []);

// Where a Wizard may stand under the wizardZone rule (open question 14), by side * 81 + square:
// its own 3-row home zone, or the 3×3 castle in the middle of it (d1–f3 for White, d7–f9 for Black).
export const HOME_ZONE = new Uint8Array(2 * SQUARES);
export const CASTLE = new Uint8Array(2 * SQUARES);
for (let s = 0; s < SQUARES; s++) {
  const r = rankOf(s), f = fileOf(s);
  HOME_ZONE[s] = r <= 2 ? 1 : 0;
  HOME_ZONE[SQUARES + s] = r >= 6 ? 1 : 0;
  CASTLE[s] = HOME_ZONE[s] && f >= 3 && f <= 5 ? 1 : 0;
  CASTLE[SQUARES + s] = HOME_ZONE[SQUARES + s] && f >= 3 && f <= 5 ? 1 : 0;
}

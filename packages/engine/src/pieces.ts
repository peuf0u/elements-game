// Pieces (GAME_SPEC §2–§5). Inside the engine a piece is a small number, a "piece code", so the
// board is a plain array of numbers and every piece property is one table lookup.
// Outside the engine, pieces are readable objects (Piece); pieceCode / decodePiece convert.
//
// Code layout (0 = empty square):
//   bit 0      owner: 0 White, 1 Black
//   bit 1      Wizard
//   bits 2–3   first element      bits 4–5  first size (1–3)
//   bit 6      stack (has a second element)
//   bits 7–8   second element     bits 9–10 second size
// A stack keeps the moving piece's element first. That only fixes the order moves are listed in;
// the position hash (zobrist.ts) treats both orders as the same piece.

export type Side = 'white' | 'black';
export type Element = 'fire' | 'wind' | 'water' | 'earth';
export type Size = 1 | 2 | 3;
export type Unit = { element: Element; size: Size };
export type Piece =
  | { owner: Side; kind: 'wizard' }
  | { owner: Side; kind: 'element'; units: [Unit] | [Unit, Unit] };

export const ELEMENTS: readonly Element[] = ['fire', 'wind', 'water', 'earth'];
export const FIRE = 0, WIND = 1, WATER = 2, EARTH = 3;
// Ways of moving. A piece has one or two (a stack moves as either element, one per move).
export const MOVE_FIRE = 0, MOVE_WIND = 1, MOVE_WATER = 2, MOVE_EARTH = 3, MOVE_WIZARD = 4;

export const WHITE = 0, BLACK = 1;
export const sideIndex = (s: Side): number => (s === 'white' ? WHITE : BLACK);
export const sideName = (i: number): Side => (i === WHITE ? 'white' : 'black');

const CODES = 2048;
const single = (owner: number, e: number, size: number) => owner | (e << 2) | (size << 4);
export const wizardCode = (owner: number): number => owner | 2;
export const unitCode = (owner: number, e: number, size: number): number => single(owner, e, size);

// Per-code tables, filled below for every valid code.
export const VALID = new Uint8Array(CODES);
export const OWNER = new Uint8Array(CODES);
export const IS_WIZARD = new Uint8Array(CODES);
export const RANGE = new Uint8Array(CODES);
export const PLAIN_EARTH = new Uint8Array(CODES); // a lone Earth: blocks, banks Water, can't capture or be captured
export const CAPTURER = new Uint8Array(CODES);    // counts for the elimination win (§6): not the Wizard, not plain Earth
export const SINGLE = new Uint8Array(CODES);      // one element, so it can still combine
export const ELEMENT_A = new Int8Array(CODES).fill(-1);
// MOVES[code * 2], MOVES[code * 2 + 1]: its ways of moving, -1 if only one. Slides come before Water,
// so a Water + Fire stack lists its straight moves first.
export const MOVES = new Int8Array(CODES * 2).fill(-1);
export const HAS_MOVE = new Uint8Array(CODES * 5); // HAS_MOVE[code * 5 + way]

function fill(code: number, units: Array<[number, number]>, owner: number, wizard: boolean) {
  VALID[code] = 1;
  OWNER[code] = owner;
  IS_WIZARD[code] = wizard ? 1 : 0;
  RANGE[code] = wizard ? 1 : Math.max(...units.map(u => u[1]));
  PLAIN_EARTH[code] = !wizard && units.length === 1 && units[0][0] === EARTH ? 1 : 0;
  CAPTURER[code] = !wizard && units.some(u => u[0] !== EARTH) ? 1 : 0;
  SINGLE[code] = !wizard && units.length === 1 ? 1 : 0;
  if (!wizard) ELEMENT_A[code] = units[0][0];
  let ways: number[];
  if (wizard) ways = [MOVE_WIZARD];
  else {
    const es = units.map(u => u[0]);
    // Earth combined with another element moves only as that element (§5).
    ways = es.length === 2 && es.includes(EARTH) ? es.filter(e => e !== EARTH) : es.slice();
    ways.sort((a, b) => Number(a === WATER) - Number(b === WATER));
  }
  ways.forEach((w, i) => { MOVES[code * 2 + i] = w; HAS_MOVE[code * 5 + w] = 1; });
}
for (const owner of [WHITE, BLACK]) {
  fill(wizardCode(owner), [], owner, true);
  for (let e = 0; e < 4; e++) for (let s = 1; s <= 3; s++) {
    fill(single(owner, e, s), [[e, s]], owner, false);
    for (let e2 = 0; e2 < 4; e2++) for (let s2 = 1; s2 <= 3; s2++)
      if (e2 !== e) fill(single(owner, e, s) | 64 | (e2 << 7) | (s2 << 9), [[e, s], [e2, s2]], owner, false);
  }
}

// Two of your own pieces can combine if neither is the Wizard, neither is a stack, and their
// elements differ (§5). The result keeps the mover's element first.
export const canCombine = (mover: number, target: number): boolean =>
  SINGLE[mover] === 1 && SINGLE[target] === 1 && OWNER[mover] === OWNER[target] && ELEMENT_A[mover] !== ELEMENT_A[target];
export const combineCodes = (mover: number, target: number): number => mover | 64 | ((target & 0b111100) << 5);

export function pieceCode(p: Piece): number {
  const owner = sideIndex(p.owner);
  if (p.kind === 'wizard') return wizardCode(owner);
  const [a, b] = p.units;
  let code = single(owner, ELEMENTS.indexOf(a.element), a.size);
  if (b) code = combineCodes(code, single(owner, ELEMENTS.indexOf(b.element), b.size));
  if (!VALID[code]) throw new Error(`Not a valid piece: ${JSON.stringify(p)}`);
  return code;
}

export function decodePiece(code: number): Piece | null {
  if (!code) return null;
  const owner = sideName(code & 1);
  if (code & 2) return { owner, kind: 'wizard' };
  const a: Unit = { element: ELEMENTS[(code >> 2) & 3], size: ((code >> 4) & 3) as Size };
  if (!(code & 64)) return { owner, kind: 'element', units: [a] };
  return { owner, kind: 'element', units: [a, { element: ELEMENTS[(code >> 7) & 3], size: ((code >> 9) & 3) as Size }] };
}

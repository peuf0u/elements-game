// The fast core: one mutable position that moves are made on and taken back ("make/unmake").
// The bots search with it directly, because copying a position for every look-ahead step is slow.
// The app and the server use the immutable API in game.ts, which is built on this.
import { SQUARES, NEIGHBOR } from './squares.ts';
import { OWNER, IS_WIZARD, CAPTURER, PLAIN_EARTH, combineCodes } from './pieces.ts';
import { keyLo, keyHi, SIDE_LO, SIDE_HI } from './zobrist.ts';

// Variant toggles (GAME_SPEC "v1 scope"). All off by default.
export interface RulesConfig {
  exactRange: boolean;           // §3: pieces move exactly N squares
  noWaterEdge: boolean;          // §3: Water can't slide along the board edge
  waterStraightCapture: boolean; // §3: Water's capturing step must be a straight flow
}
export const DEFAULT_CONFIG: Readonly<RulesConfig> = Object.freeze({ exactRange: false, noWaterEdge: false, waterStraightCapture: false });

// A move is (from, to), packed into one number: from + to * 256. The board decides whether it
// moves, captures or combines (architecture research §2.1).
export const moveOf = (from: number, to: number): number => from | (to << 8);
export const moveFrom = (m: number): number => m & 255;
export const moveTo = (m: number): number => m >> 8;

const MAX_PLIES = 4096;
const OPPOSITE = [1, 0, 3, 2, 7, 6, 5, 4]; // the direction back, for each of squares.ts DIRS

export class Position {
  readonly board = new Int16Array(SQUARES); // piece codes (pieces.ts), 0 = empty
  side = 0;                                 // 0 White, 1 Black to move
  readonly wizard = new Int8Array([-1, -1]);
  readonly capturers = new Int8Array(2);    // capturing pieces per side, for the elimination win
  // earthAround[s]: bit d is set when the neighbour of s in direction d is a plain Earth.
  // Water's steps depend on it (movegen.ts), so it's kept up to date instead of looked up.
  readonly earthAround = new Uint8Array(SQUARES);
  hashLo = 0;
  hashHi = 0;
  readonly exact: boolean;
  readonly noEdge: boolean;
  readonly straight: boolean;
  readonly config: Readonly<RulesConfig>;
  private readonly undo = new Int32Array(MAX_PLIES * 4);
  private sp = 0;

  constructor(config: Readonly<RulesConfig> = DEFAULT_CONFIG) {
    this.config = config;
    this.exact = config.exactRange;
    this.noEdge = config.noWaterEdge;
    this.straight = config.waterStraightCapture;
  }

  static from(board: ArrayLike<number>, side: number, config?: Readonly<RulesConfig>): Position {
    const p = new Position(config);
    for (let s = 0; s < SQUARES; s++) if (board[s]) p.put(s, board[s]);
    if (side) { p.side = 1; p.hashLo ^= SIDE_LO; p.hashHi ^= SIDE_HI; }
    return p;
  }

  // Put a piece on an empty square (setting up a position).
  put(s: number, code: number): void {
    this.board[s] = code;
    this.hashLo ^= keyLo(code, s);
    this.hashHi ^= keyHi(code, s);
    if (IS_WIZARD[code]) this.wizard[OWNER[code]] = s;
    this.capturers[OWNER[code]] += CAPTURER[code];
    if (PLAIN_EARTH[code]) this.earth(s, true);
  }

  private earth(e: number, on: boolean): void {
    for (let d = 0; d < 8; d++) {
      const n = NEIGHBOR[e * 8 + d];
      if (n < 0) continue;
      if (on) this.earthAround[n] |= 1 << OPPOSITE[d]; else this.earthAround[n] &= ~(1 << OPPOSITE[d]);
    }
  }

  make(m: number): void {
    const from = m & 255, to = m >> 8, b = this.board;
    const mover = b[from], target = b[to], me = OWNER[mover];
    const placed = target && OWNER[target] === me ? combineCodes(mover, target) : mover;
    const u = this.sp++ * 4;
    this.undo[u] = m; this.undo[u + 1] = mover; this.undo[u + 2] = target;
    b[from] = 0;
    b[to] = placed;
    let lo = this.hashLo ^ keyLo(mover, from) ^ keyLo(placed, to) ^ SIDE_LO;
    let hi = this.hashHi ^ keyHi(mover, from) ^ keyHi(placed, to) ^ SIDE_HI;
    if (target) {
      lo ^= keyLo(target, to); hi ^= keyHi(target, to);
      if (OWNER[target] !== me) {
        this.capturers[me ^ 1] -= CAPTURER[target];
        if (IS_WIZARD[target]) this.wizard[me ^ 1] = -1; // only in look-ahead that ignores Wizard safety
      } else this.capturers[me] += CAPTURER[placed] - CAPTURER[mover] - CAPTURER[target];
    }
    this.hashLo = lo; this.hashHi = hi;
    if (IS_WIZARD[mover]) this.wizard[me] = to;
    // Plain Earth that moves, or stops being plain by combining.
    if (PLAIN_EARTH[mover]) { this.earth(from, false); if (!target) this.earth(to, true); }
    if (target && PLAIN_EARTH[target]) this.earth(to, false);
    this.side ^= 1;
  }

  unmake(): void {
    const u = --this.sp * 4, b = this.board;
    const m = this.undo[u], mover = this.undo[u + 1], target = this.undo[u + 2];
    const from = m & 255, to = m >> 8, placed = b[to], me = OWNER[mover];
    b[from] = mover;
    b[to] = target;
    let lo = this.hashLo ^ keyLo(mover, from) ^ keyLo(placed, to) ^ SIDE_LO;
    let hi = this.hashHi ^ keyHi(mover, from) ^ keyHi(placed, to) ^ SIDE_HI;
    if (target) {
      lo ^= keyLo(target, to); hi ^= keyHi(target, to);
      if (OWNER[target] !== me) {
        this.capturers[me ^ 1] += CAPTURER[target];
        if (IS_WIZARD[target]) this.wizard[me ^ 1] = to;
      } else this.capturers[me] -= CAPTURER[placed] - CAPTURER[mover] - CAPTURER[target];
    }
    this.hashLo = lo; this.hashHi = hi;
    if (IS_WIZARD[mover]) this.wizard[me] = from;
    if (target && PLAIN_EARTH[target]) this.earth(to, true);
    if (PLAIN_EARTH[mover]) { if (!target) this.earth(to, false); this.earth(from, true); }
    this.side ^= 1;
  }

  // Let the other side move twice: no real move, only a search trick ("null move pruning": if a
  // position is still good after giving the opponent a free move, it needn't be searched further).
  pass(): void { this.side ^= 1; this.hashLo ^= SIDE_LO; this.hashHi ^= SIDE_HI; }

  // The piece taken by the last move made, 0 if none (for search statistics and move ordering).
  lastTarget(): number { return this.sp ? this.undo[(this.sp - 1) * 4 + 2] : 0; }

  // Hash as text, the form stored in GameState.
  key(): string { return (this.hashHi >>> 0).toString(16).padStart(8, '0') + (this.hashLo >>> 0).toString(16).padStart(8, '0'); }
}

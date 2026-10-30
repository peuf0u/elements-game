// The fast core: one mutable position that moves are made on and taken back ("make/unmake").
// The bots search with it directly, because copying a position for every look-ahead step is slow.
// The app and the server use the immutable API in game.ts, which is built on this.
import { SQUARES, NEIGHBOR, HOME_ZONE, CASTLE } from './squares.ts';
import { OWNER, IS_WIZARD, CAPTURER, PLAIN_EARTH, combineCodes, unitCode, unitOf } from './pieces.ts';
import { keyLo, keyHi, SIDE_LO, SIDE_HI, RETURNED_LO, RETURNED_HI } from './zobrist.ts';

// Rule toggles (GAME_SPEC "v1 scope"). Off by default, except the v0.3 Water rule: diagonal bends
// and one way per move (§3), turning both off gives the v0.2 Water rule; and since v0.4 the castle
// return, once per visit into the own castle (§6).
export interface RulesConfig {
  exactRange: boolean;           // §3: pieces move exactly N squares
  noWaterEdge: boolean;          // §3: Water can't slide along the board edge
  waterStraightCapture: boolean; // §3: Water's capturing step must be a straight flow
  waterRiver: boolean;           // open question 10: Water banks only around an Earth right in front of or behind it
  waterStraightSteps: boolean;   // open question 10: no diagonal Water steps, also when banking
  waterDiagonalBends: boolean;   // open question 10: Water's steps around Earth must be diagonal
  waterOneWay: boolean;          // open question 10: within one move Water goes only forward or only backward
  earthBreaksEarth: boolean;     // open question 13: Earth combined with an attacker can capture plain Earth
  wizardZone: 'anywhere' | 'home' | 'castle'; // open question 14: where the Wizard may go (squares.ts)
  // §6 Castles (open question 15): a Wizard standing in the enemy castle may, instead of moving, bring back one of
  // its side's captured pieces: once per visit (it has to leave the castle and come back for another)
  // or on every turn there. It goes on an empty square of the side's own home zone or own castle.
  castleReturn: 'off' | 'oncePerVisit' | 'everyTurn';
  returnTo: 'home' | 'castle';
  quietMoveLimit: number;        // §6: moves each without a capture or combine before a draw (75); 0 = no limit
}
export const DEFAULT_CONFIG: Readonly<RulesConfig> = Object.freeze({
  exactRange: false, noWaterEdge: false, waterStraightCapture: false, waterRiver: false, waterStraightSteps: false,
  waterDiagonalBends: true, waterOneWay: true, earthBreaksEarth: false, wizardZone: 'anywhere', castleReturn: 'oncePerVisit', returnTo: 'castle', quietMoveLimit: 75,
});

// A move is (from, to), packed into one number: from + to * 256. The board decides whether it
// moves, captures or combines (architecture research §2.1). A from of 81 or more brings a captured
// piece back onto `to` (castleReturn; pieces.ts unitOf).
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
  readonly river: boolean;
  readonly straightSteps: boolean;
  readonly diagonalBends: boolean;
  readonly oneWay: boolean;
  readonly earthBreaks: boolean;
  readonly wizardKeep: Uint8Array | null; // the squares the Wizard may stand on, or null for anywhere
  readonly returnRule: number;             // castleReturn: 0 off, 1 once per visit, 2 every turn
  readonly returnKeep: Uint8Array;         // where a piece brought back may go, by side * 81 + square
  readonly returned = new Uint8Array(2);   // per side: brought a piece back on this visit
  readonly config: Readonly<RulesConfig>;
  private readonly undo = new Int32Array(MAX_PLIES * 4);
  private sp = 0;

  constructor(config: Readonly<RulesConfig> = DEFAULT_CONFIG) {
    this.config = config;
    this.exact = config.exactRange;
    this.noEdge = config.noWaterEdge;
    this.straight = config.waterStraightCapture;
    this.river = config.waterRiver;
    this.straightSteps = config.waterStraightSteps;
    this.diagonalBends = config.waterDiagonalBends;
    this.oneWay = config.waterOneWay;
    this.earthBreaks = config.earthBreaksEarth;
    this.wizardKeep = config.wizardZone === 'home' ? HOME_ZONE : config.wizardZone === 'castle' ? CASTLE : null;
    this.returnRule = config.castleReturn === 'oncePerVisit' ? 1 : config.castleReturn === 'everyTurn' ? 2 : 0;
    this.returnKeep = config.returnTo === 'castle' ? CASTLE : HOME_ZONE;
  }

  // returned: bit 0 for White, bit 1 for Black (see `returned`).
  static from(board: ArrayLike<number>, side: number, config?: Readonly<RulesConfig>, returned = 0): Position {
    const p = new Position(config);
    for (let s = 0; s < SQUARES; s++) if (board[s]) p.put(s, board[s]);
    p.setReturned(returned);
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

  // Both sides' `returned` flags as two bits, and setting them with the hash kept up to date.
  returnedBits(): number { return this.returned[0] | (this.returned[1] << 1); }
  setReturned(bits: number): void {
    for (let s = 0; s < 2; s++) {
      const v = (bits >> s) & 1;
      if (v !== this.returned[s]) { this.returned[s] = v; this.hashLo ^= RETURNED_LO[s]; this.hashHi ^= RETURNED_HI[s]; }
    }
  }

  make(m: number): void {
    const from = m & 255, to = m >> 8, b = this.board;
    if (from >= SQUARES) { this.makeReturn(m); return; }
    const mover = b[from], target = b[to], me = OWNER[mover];
    const placed = target && OWNER[target] === me ? combineCodes(mover, target) : mover;
    const u = this.sp++ * 4;
    this.undo[u] = m; this.undo[u + 1] = mover; this.undo[u + 2] = target; this.undo[u + 3] = this.returnedBits();
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
    // A Wizard leaving the enemy castle ends its visit.
    if (this.returned[me] && IS_WIZARD[mover] && !CASTLE[(me ^ 1) * SQUARES + to]) this.setReturned(this.returnedBits() & ~(1 << me));
    this.side ^= 1;
  }

  private makeReturn(m: number): void {
    const to = m >> 8, me = this.side, [e, size] = unitOf((m & 255) - SQUARES), code = unitCode(me, e, size);
    const u = this.sp++ * 4;
    this.undo[u] = m; this.undo[u + 1] = code; this.undo[u + 2] = 0; this.undo[u + 3] = this.returnedBits();
    this.board[to] = code;
    this.hashLo ^= keyLo(code, to) ^ SIDE_LO; this.hashHi ^= keyHi(code, to) ^ SIDE_HI;
    this.capturers[me] += CAPTURER[code];
    if (PLAIN_EARTH[code]) this.earth(to, true);
    if (this.returnRule === 1) this.setReturned(this.returnedBits() | (1 << me));
    this.side ^= 1;
  }

  unmake(): void {
    const u = --this.sp * 4, b = this.board;
    const m = this.undo[u], mover = this.undo[u + 1], target = this.undo[u + 2];
    this.setReturned(this.undo[u + 3]);
    if ((m & 255) >= SQUARES) {
      const to = m >> 8, me = OWNER[mover];
      b[to] = 0;
      this.hashLo ^= keyLo(mover, to) ^ SIDE_LO; this.hashHi ^= keyHi(mover, to) ^ SIDE_HI;
      this.capturers[me] -= CAPTURER[mover];
      if (PLAIN_EARTH[mover]) this.earth(to, false);
      this.side ^= 1;
      return;
    }
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

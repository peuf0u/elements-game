// Move generation (GAME_SPEC §3–§6).
// Pseudo-legal moves follow each piece's movement rules; legal moves also keep the mover's own
// Wizard out of attack. Moves are listed square by square from a1, and for each piece in a fixed
// order (slides before Water), one move per destination.
import { NEIGHBOR, RAY, BANK_DIRS, EDGE_DIRS, DIRS, UP, DOWN, fileOf, distance, SQUARES, CASTLE } from './squares.ts';
import {
  OWNER, IS_WIZARD, RANGE, PLAIN_EARTH, EARTH_STACK, MOVES, HAS_MOVE, canCombine, wizardCode, UNITS, UNIT_BITS,
  MOVE_FIRE, MOVE_WIND, MOVE_WATER, MOVE_EARTH, MOVE_WIZARD,
} from './pieces.ts';
import type { Position } from './position.ts';

// Scratch space, reused between calls. Generation never calls itself, so one set is enough.
const seen = new Int32Array(81);       // destination already listed, by call stamp
let stamp = 0;
const onPath = new Uint8Array(81);     // squares on the Water route being walked
const onPathBack = new Uint8Array(81); // the same for the reverse walk in isAttacked

// One Water step from c (§3 "Water movement rule") can flow up or down, bank around a plain Earth
// touching c, or slide along the edge. Which steps exist depends only on c and on which of its
// eight neighbours hold plain Earth, so all of them are worked out once here:
// STEPS[(((edge * 3 + shape) * 81 + c) * 256 + earthMask) * 9] = count, followed by the step
// directions, in the order the spec lists them. edge = 1 when edge slides are on. shape says which
// steps around Earth are allowed: 0 all, 1 only straight ones (waterStraightSteps), 2 only diagonal
// ones (waterDiagonalBends). The step rule is symmetric (a step from c to n is also a step from n
// to c), which lets isAttacked walk routes backwards.
const STEPS = new Int8Array(2 * 3 * 81 * 256 * 9);
for (let edge = 0; edge < 2; edge++)
  for (let shape = 0; shape < 3; shape++)
    for (let c = 0; c < 81; c++)
      for (let mask = 0; mask < 256; mask++) {
        const at = (((edge * 3 + shape) * 81 + c) * 256 + mask) * 9, c8 = c * 8;
        let seenDirs = 0, n = 0;
        const push = (a: number) => { if (!(seenDirs & (1 << a)) && NEIGHBOR[c8 + a] >= 0) { seenDirs |= 1 << a; STEPS[at + 1 + n++] = a; } };
        push(UP); push(DOWN);
        for (let d = 0; d < 8; d++) if (mask & (1 << d) && NEIGHBOR[c8 + d] >= 0) for (const a of BANK_DIRS[d]) if (shape === 0 || (shape === 1) === (a < 4)) push(a);
        if (edge) for (const a of EDGE_DIRS[c]) push(a);
        STEPS[at] = n;
      }

// Where c's Water steps start in STEPS, given the Earths it may bank around (a mask like earthAround).
const stepsAt = (pos: Position, c: number, earths: number): number =>
  ((((pos.noEdge ? 0 : 1) * 3 + (pos.straightSteps ? 1 : pos.diagonalBends ? 2 : 0)) * 81 + c) * 256 + earths) * 9;

// The river rule (waterRiver): Water banks only around an Earth right in front of it or right behind
// it in its column, or keeps going around the Earth it's already going around. `around` is that
// Earth (or Earths), as directions from c. Without the rule every Earth touching c counts.
const COLUMN = (1 << UP) | (1 << DOWN);

// One way per move (waterOneWay): the first step forward or backward sets the move's direction, and
// no later step may go against it; sideways steps are always fine. RISE[a] is direction a's step
// up the board (+1), down (-1) or neither (0). `dir` is the move's direction so far (0 = not yet).
export const RISE = DIRS.map(([, dy]) => dy);
export const against = (pos: Position, dir: number, a: number): boolean => pos.oneWay && dir !== 0 && RISE[a] === -dir;
export const bankable = (pos: Position, c: number, around: number): number =>
  pos.river ? pos.earthAround[c] & (COLUMN | around) : pos.earthAround[c];
// After a step from c to n: the Earths c could bank around that n also touches, as directions from n.
export function stillAround(pos: Position, c: number, n: number, earths: number): number {
  let out = 0;
  for (let d = 0, e = pos.earthAround[n]; e; d++, e >>= 1) {
    if (!(e & 1)) continue;
    const s = NEIGHBOR[n * 8 + d];
    for (let d2 = 0, a = earths; a; d2++, a >>= 1) if (a & 1 && NEIGHBOR[c * 8 + d2] === s) { out |= 1 << d; break; }
  }
  return out;
}

// Can the piece `mover`, moving as `way`, end its move on a square holding `target`?
// Onto an enemy: capture, if `way` isn't Earth and the target isn't plain Earth (§4), except that
// under earthBreaksEarth a stack holding Earth may take plain Earth. Onto your own piece: combine (§5).
export const landable = (pos: Position, mover: number, target: number, way: number): boolean =>
  OWNER[target] !== OWNER[mover]
    ? way !== MOVE_EARTH && (!PLAIN_EARTH[target] || (pos.earthBreaks && EARTH_STACK[mover] === 1))
    : canCombine(mover, target);

// The move being generated, shared with the Water walk below.
let gPos: Position, gOut: Int32Array | number[], gN = 0, gFrom = 0, gPiece = 0, gRange = 0, gCall = 0;

function add(to: number): void {
  if (seen[to] !== gCall) { seen[to] = gCall; gOut[gN++] = gFrom | (to << 8); }
}

function walk(c: number, k: number, around: number, dir: number): void {
  const pos = gPos, b = pos.board, earths = bankable(pos, c, around), at = stepsAt(pos, c, earths), count = STEPS[at], taken = k + 1;
  const ok = !pos.exact || taken === gRange;
  for (let i = 1; i <= count; i++) {
    const a = STEPS[at + i], nx = NEIGHBOR[c * 8 + a];
    if (onPath[nx] || against(pos, dir, a)) continue;
    const t = b[nx];
    if (!t) {
      if (ok) add(nx);
      if (taken < gRange) { onPath[nx] = 1; walk(nx, taken, pos.river ? stillAround(pos, c, nx, earths) : 0, dir || RISE[a]); onPath[nx] = 0; }
    } else if (ok && landable(pos, gPiece, t, MOVE_WATER) && (!pos.straight || OWNER[t] === OWNER[gPiece] || fileOf(nx) === fileOf(c))) add(nx);
  }
}

// Pseudo-legal moves of the piece on `from`, written to out[n..]. Returns the new count.
export function pseudoMoves(pos: Position, from: number, out: Int32Array | number[], n: number): number {
  const b = pos.board, p = b[from], range = RANGE[p], exact = pos.exact;
  gPos = pos; gOut = out; gN = n; gFrom = from; gPiece = p; gRange = range; gCall = ++stamp;
  for (let w = 0; w < 2; w++) {
    const way = MOVES[p * 2 + w];
    if (way < 0) break;
    if (way === MOVE_WATER) {
      onPath[from] = 1;
      walk(from, 0, 0, 0);
      onPath[from] = 0;
      continue;
    }
    const d0 = way === MOVE_WIND ? 4 : 0, d1 = way === MOVE_FIRE ? 4 : 8;
    const wizard = way === MOVE_WIZARD, max = wizard ? 1 : range;
    for (let d = d0; d < d1; d++) {
      const r = (from * 8 + d) * 3;
      for (let k = 1; k <= max; k++) {
        const s = RAY[r + k - 1];
        if (s < 0 || (wizard && pos.wizardKeep && !pos.wizardKeep[OWNER[p] * 81 + s])) break;
        const t = b[s], ok = !exact || k === max || wizard;
        if (!t) { if (ok) add(s); continue; }
        if (ok && landable(pos, p, t, way)) add(s);
        break;
      }
    }
  }
  return gN;
}

// Is square `target` attacked by side `by`: could one of its pieces move onto it this turn?
// Meant for the Wizard's square (check). Looks outward from the target instead of generating
// every enemy move: along the Fire and Wind lines, the eight neighbours, and Water routes walked
// backwards.
export function isAttacked(pos: Position, target: number, by: number): boolean {
  const b = pos.board, exact = pos.exact;
  for (let d = 0; d < 8; d++) {
    const way = d < 4 ? MOVE_FIRE : MOVE_WIND, r = (target * 8 + d) * 3;
    for (let k = 1; k <= 3; k++) {
      const s = RAY[r + k - 1];
      if (s < 0) break;
      const t = b[s];
      if (!t) continue;
      if (OWNER[t] === by && HAS_MOVE[t * 5 + way] && (exact ? RANGE[t] === k : RANGE[t] >= k)) return true;
      break;
    }
  }
  const wiz = wizardCode(by);
  for (let d = 0; d < 8; d++) { const s = NEIGHBOR[target * 8 + d]; if (s >= 0 && b[s] === wiz) return true; }
  // Under the river rule a step depends on the steps before it, so routes can't be walked
  // backwards: walk forward from each Water in reach instead.
  if (pos.river) {
    for (let s = 0; s < 81; s++) {
      const t = b[s];
      if (!t || OWNER[t] !== by || !HAS_MOVE[t * 5 + MOVE_WATER] || distance(s, target) > RANGE[t]) continue;
      onPathBack[s] = 1;
      const hit = waterForward(pos, s, 0, 0, 0, RANGE[t], target);
      onPathBack[s] = 0;
      if (hit) return true;
    }
    return false;
  }
  onPathBack[target] = 1;
  const hit = waterBack(pos, target, 0, 0, by, target);
  onPathBack[target] = 0;
  return hit;
}

// Can a Water on c, `k` steps into its route, reach `target` within `range` steps (river rule)?
function waterForward(pos: Position, c: number, k: number, around: number, dir: number, range: number, target: number): boolean {
  const b = pos.board, earths = bankable(pos, c, around), at = stepsAt(pos, c, earths), count = STEPS[at], taken = k + 1;
  for (let i = 1; i <= count; i++) {
    const a = STEPS[at + i], nx = NEIGHBOR[c * 8 + a];
    if (onPathBack[nx] || against(pos, dir, a)) continue;
    if (nx === target) {
      if ((!pos.exact || taken === range) && (!pos.straight || fileOf(nx) === fileOf(c))) return true;
      continue;
    }
    if (b[nx] || taken >= range) continue;
    onPathBack[nx] = 1;
    const hit = waterForward(pos, nx, taken, stillAround(pos, c, nx, earths), dir || RISE[a], range, target);
    onPathBack[nx] = 0;
    if (hit) return true;
  }
  return false;
}

// Walks Water routes backwards from `target` through empty squares, looking for a Water of `by`
// that could flow along the route onto the target. A one-way route walked backwards is one-way too.
function waterBack(pos: Position, c: number, k: number, dir: number, by: number, target: number): boolean {
  const b = pos.board, at = stepsAt(pos, c, pos.earthAround[c]), count = STEPS[at], taken = k + 1;
  for (let i = 1; i <= count; i++) {
    const a = STEPS[at + i], nx = NEIGHBOR[c * 8 + a];
    if (onPathBack[nx] || against(pos, dir, a)) continue;
    // Straight captures: the step onto the target has to be a flow along the column.
    if (k === 0 && pos.straight && fileOf(nx) !== fileOf(target)) continue;
    const t = b[nx];
    if (t) {
      if (OWNER[t] === by && HAS_MOVE[t * 5 + MOVE_WATER] && (pos.exact ? RANGE[t] === taken : RANGE[t] >= taken)) return true;
      continue;
    }
    if (taken < 3) {
      onPathBack[nx] = 1;
      const hit = waterBack(pos, nx, taken, dir || RISE[a], by, target);
      onPathBack[nx] = 0;
      if (hit) return true;
    }
  }
  return false;
}

export const inCheck = (pos: Position, side: number): boolean =>
  pos.wizard[side] >= 0 && isAttacked(pos, pos.wizard[side], side ^ 1);

// Could this move leave the mover's Wizard (on w) attacked, so it has to be tried? No piece
// reaches further than 3 squares, so if the Wizard isn't in check already, only these can:
// a Wizard move; a piece leaving a square within 3 of the Wizard (it may have blocked a line or a
// Water route); and a plain Earth stopping within 3 of it (it gives Water a new bank).
function mightExpose(pos: Position, m: number, w: number): boolean {
  const from = m & 255, to = m >> 8, p = pos.board[from];
  return IS_WIZARD[p] === 1 || distance(from, w) <= 3 || (PLAIN_EARTH[p] === 1 && !pos.board[to] && distance(to, w) <= 3);
}

// Bringing a captured piece back (castleReturn): which of the side's units are captured, if its
// Wizard stands in the enemy castle and may bring one back now; 0 otherwise. Not while in check: a
// piece placed at home can't block an attack on a Wizard in the enemy camp.
function returnable(pos: Position, checked: boolean): number {
  const side = pos.side, w = pos.wizard[side];
  if (!pos.returnRule || checked || w < 0 || !CASTLE[(side ^ 1) * SQUARES + w] || (pos.returnRule === 1 && pos.returned[side])) return 0;
  let present = 0;
  for (let s = 0; s < SQUARES; s++) { const c = pos.board[s]; if (c && OWNER[c] === side) present |= UNIT_BITS[c]; }
  return ~present & ((1 << UNITS) - 1);
}
// The return moves: each captured unit onto each empty square it may go to. A piece placed at home
// is at least 4 rows from its Wizard, so it can't expose it to an attack.
function returns(pos: Position, units: number, out: Int32Array | number[], n: number): number {
  const keep = pos.returnKeep, base = pos.side * SQUARES;
  for (let k = 0; k < UNITS; k++) {
    if (!(units >> k & 1)) continue;
    for (let s = 0; s < SQUARES; s++) if (keep[base + s] && !pos.board[s]) out[n++] = (SQUARES + k) | (s << 8);
  }
  return n;
}
const hasEmpty = (pos: Position): boolean => {
  for (let s = 0; s < SQUARES; s++) if (pos.returnKeep[pos.side * SQUARES + s] && !pos.board[s]) return true;
  return false;
};

// Legal moves for the side to move, written to out. Returns how many.
export function legalMoves(pos: Position, out: Int32Array | number[]): number {
  const b = pos.board, side = pos.side, w = pos.wizard[side];
  const checked = w >= 0 && isAttacked(pos, w, side ^ 1);
  let n = 0;
  for (let s = 0; s < 81; s++) {
    const c = b[s];
    if (!c || OWNER[c] !== side) continue;
    const start = n;
    n = pseudoMoves(pos, s, out, n);
    if (w < 0) continue;
    let k = start;
    for (let i = start; i < n; i++) {
      const m = out[i];
      if (checked || mightExpose(pos, m, w)) {
        pos.make(m);
        const ok = !inCheck(pos, side);
        pos.unmake();
        if (!ok) continue;
      }
      out[k++] = m;
    }
    n = k;
  }
  const units = returnable(pos, checked);
  return units ? returns(pos, units, out, n) : n;
}

const probe = new Int32Array(256);
export function hasLegalMove(pos: Position): boolean {
  const b = pos.board, side = pos.side, w = pos.wizard[side];
  const checked = w >= 0 && isAttacked(pos, w, side ^ 1);
  for (let s = 0; s < 81; s++) {
    const c = b[s];
    if (!c || OWNER[c] !== side) continue;
    const n = pseudoMoves(pos, s, probe, 0);
    for (let i = 0; i < n; i++) {
      if (w < 0 || !(checked || mightExpose(pos, probe[i], w))) return true;
      pos.make(probe[i]);
      const ok = !inCheck(pos, side);
      pos.unmake();
      if (ok) return true;
    }
  }
  return returnable(pos, checked) !== 0 && hasEmpty(pos);
}

export const isWizard = (code: number): boolean => IS_WIZARD[code] === 1;

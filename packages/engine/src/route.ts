// How a move travels: which way the piece moves (a stack picks one element) and the squares it
// passes, for animation and for analysing games. Not needed to play: a move is just (from, to).
// The shortest route wins; on a tie, the first way listed (slides before Water).
import { NEIGHBOR, RAY, BANK_DIRS, EDGE_DIRS, UP, DOWN, fileOf } from './squares.ts';
import { OWNER, RANGE, PLAIN_EARTH, MOVES, canCombine, MOVE_FIRE, MOVE_WIND, MOVE_WATER, MOVE_EARTH, MOVE_WIZARD } from './pieces.ts';
import type { Position } from './position.ts';

export type Way = 'fire' | 'wind' | 'water' | 'earth' | 'wizard';
const WAYS: Way[] = ['fire', 'wind', 'water', 'earth', 'wizard'];

function waterNext(pos: Position, c: number): number[] {
  const out: number[] = [];
  const push = (d: number) => { const n = NEIGHBOR[c * 8 + d]; if (n >= 0 && !out.includes(n)) out.push(n); };
  push(UP); push(DOWN);
  for (let d = 0; d < 8; d++) {
    const e = NEIGHBOR[c * 8 + d];
    if (e >= 0 && PLAIN_EARTH[pos.board[e]]) BANK_DIRS[d].forEach(push);
  }
  if (!pos.noEdge) EDGE_DIRS[c].forEach(push);
  return out;
}

const landable = (mover: number, target: number, way: number) =>
  OWNER[target] !== OWNER[mover] ? way !== MOVE_EARTH && !PLAIN_EARTH[target] : canCombine(mover, target);

// The route of the piece on `from` to `to`, or null if it can't get there (Wizard safety ignored).
export function route(pos: Position, from: number, to: number): { way: Way; path: number[] } | null {
  const b = pos.board, p = b[from], range = RANGE[p];
  let best: { way: Way; path: number[] } | null = null;
  for (let w = 0; w < 2; w++) {
    const way = MOVES[p * 2 + w];
    if (way < 0) break;
    if (way === MOVE_WATER) {
      const path = [from];
      const walk = (c: number) => {
        for (const n of waterNext(pos, c)) {
          if (path.includes(n)) continue;
          const t = b[n], ok = !pos.exact || path.length === range;
          path.push(n);
          if (n === to && ok && (!t || (landable(p, t, way) && (!pos.straight || OWNER[t] === OWNER[p] || fileOf(n) === fileOf(c)))))
            { if (!best || path.length < best.path.length) best = { way: 'water', path: path.slice() }; }
          else if (!t && path.length <= range) walk(n);
          path.pop();
        }
      };
      walk(from);
      continue;
    }
    const d0 = way === MOVE_WIND ? 4 : 0, d1 = way === MOVE_FIRE ? 4 : 8, max = way === MOVE_WIZARD ? 1 : range;
    for (let d = d0; d < d1; d++) {
      const path = [from];
      for (let k = 1; k <= max; k++) {
        const s = RAY[(from * 8 + d) * 3 + k - 1];
        if (s < 0) break;
        const t = b[s], ok = !pos.exact || k === max || way === MOVE_WIZARD;
        path.push(s);
        if (s === to && ok && (!t || landable(p, t, way))) { if (!best || path.length < best.path.length) best = { way: WAYS[way], path: path.slice() }; }
        if (t) break;
      }
    }
  }
  return best;
}

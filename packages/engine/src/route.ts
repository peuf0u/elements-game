// How a move travels: which way the piece moves (a stack picks one element) and the squares it
// passes, for animation and for analysing games. Not needed to play: a move is just (from, to).
// The shortest route wins; on a tie, the first way listed (slides before Water).
import { NEIGHBOR, RAY, BANK_DIRS, EDGE_DIRS, UP, DOWN, fileOf } from './squares.ts';
import { OWNER, RANGE, MOVES, MOVE_FIRE, MOVE_WIND, MOVE_WATER, MOVE_WIZARD } from './pieces.ts';
import type { Position } from './position.ts';
import { bankable, stillAround, landable } from './movegen.ts';
import { rankOf } from './squares.ts';

export type Way = 'fire' | 'wind' | 'water' | 'earth' | 'wizard';
const WAYS: Way[] = ['fire', 'wind', 'water', 'earth', 'wizard'];

// Water's next squares from c, in movegen's order; `earths` are the Earths it may bank around.
function waterNext(pos: Position, c: number, earths: number): number[] {
  const out: number[] = [];
  const push = (d: number) => { const n = NEIGHBOR[c * 8 + d]; if (n >= 0 && !out.includes(n)) out.push(n); };
  push(UP); push(DOWN);
  for (let d = 0; d < 8; d++) if (earths & (1 << d))
    for (const a of BANK_DIRS[d]) if (pos.straightSteps ? a < 4 : !pos.diagonalBends || a >= 4) push(a);
  if (!pos.noEdge) EDGE_DIRS[c].forEach(push);
  return out;
}

// The route of the piece on `from` to `to`, or null if it can't get there (Wizard safety ignored).
export function route(pos: Position, from: number, to: number): { way: Way; path: number[] } | null {
  const b = pos.board, p = b[from], range = RANGE[p];
  let best: { way: Way; path: number[] } | null = null;
  for (let w = 0; w < 2; w++) {
    const way = MOVES[p * 2 + w];
    if (way < 0) break;
    if (way === MOVE_WATER) {
      const path = [from];
      const walk = (c: number, around: number, dir: number) => {
        const earths = bankable(pos, c, around);
        for (const n of waterNext(pos, c, earths)) {
          const rise = Math.sign(rankOf(n) - rankOf(c));
          if (path.includes(n) || (pos.oneWay && dir !== 0 && rise === -dir)) continue;
          const t = b[n], ok = !pos.exact || path.length === range;
          path.push(n);
          if (n === to && ok && (!t || (landable(pos, p, t, way) && (!pos.straight || OWNER[t] === OWNER[p] || fileOf(n) === fileOf(c)))))
            { if (!best || path.length < best.path.length) best = { way: 'water', path: path.slice() }; }
          else if (!t && path.length <= range) walk(n, pos.river ? stillAround(pos, c, n, earths) : 0, dir || rise);
          path.pop();
        }
      };
      walk(from, 0, 0);
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
        if (s === to && ok && (!t || landable(pos, p, t, way))) { if (!best || path.length < best.path.length) best = { way: WAYS[way], path: path.slice() }; }
        if (t) break;
      }
    }
  }
  return best;
}

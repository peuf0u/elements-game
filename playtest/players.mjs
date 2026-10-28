// The computer players. Each one is { name, choose(state, legalMoves, rng) → move }.
// Random and Greedy only look at the moves on offer. The look-ahead players search on the engine's
// fast core: they make a move on one shared position, look further, and take it back.
import { positionOf } from './engine.mjs';
import { legalMoves as coreLegal, hasLegalMove, inCheck, OWNER } from '../packages/engine/src/core.ts';
import { VALUES, pieceValue, codeValues, evaluate, forward, SCORE_DEFAULTS } from './evaluate.mjs';
import { deep } from './deep.mjs';

export { VALUES, pieceValue };

// ---------- Look-ahead search ----------
const WIN = 10000;
const MAX_PLY = 32;
const MOVES = Array.from({ length: MAX_PLY }, () => new Int32Array(512));
const ORDER = Array.from({ length: MAX_PLY }, () => new Int32Array(512));
const KEYS = new Float64Array(512);
const scratch = new Int32Array(512);

// Captures first, the most valuable victim first, then combines, then the rest, each group in
// generation order. Writes the moves into `out` and returns the count.
function orderMoves(pos, moves, n, values, out) {
  const b = pos.board;
  let k = 0;
  for (let i = 0; i < n; i++) { // captures, kept stable by value (insertion sort, few of them)
    const t = b[moves[i] >> 8];
    if (!t || OWNER[t] === pos.side) continue;
    const v = values[t];
    let j = k++;
    while (j > 0 && KEYS[j - 1] < v) { KEYS[j] = KEYS[j - 1]; out[j] = out[j - 1]; j--; }
    KEYS[j] = v; out[j] = moves[i];
  }
  for (let i = 0; i < n; i++) { const t = b[moves[i] >> 8]; if (t && OWNER[t] === pos.side) out[k++] = moves[i]; }
  for (let i = 0; i < n; i++) if (!b[moves[i] >> 8]) out[k++] = moves[i];
  return k;
}

// Keeps the moves that pass `keep(side, from, to, kind)`; if none do, keeps them all.
function applyFilter(pos, moves, n, keep) {
  const b = pos.board, side = pos.side;
  let w = 0;
  for (let i = 0; i < n; i++) {
    const m = moves[i], t = b[m >> 8];
    if (keep(side, m & 255, m >> 8, !t ? 'move' : OWNER[t] === side ? 'combine' : 'capture')) scratch[w++] = m;
  }
  if (!w) return n;
  for (let i = 0; i < w; i++) moves[i] = scratch[i];
  return w;
}

// Negamax with alpha-beta pruning. Returns the score for the side to move.
// Runs the spec's win checks itself (elimination, checkmate, stalemate); repetition and the
// 50-move rule are left to the real game.
function search(pos, depth, alpha, beta, ply, ctx) {
  ctx.stats.nodes++;
  const side = pos.side, lost = -(WIN - ply);
  if (pos.capturers[side] === 0) return lost;
  if (depth === 0) {
    if (inCheck(pos, side) && !hasLegalMove(pos)) return lost;
    const v = evaluate(pos, ctx.me, ctx.opts, ctx.values);
    return side === ctx.me ? v : -v;
  }
  const moves = MOVES[ply];
  let n = coreLegal(pos, moves);
  if (!n) return inCheck(pos, side) ? lost : 0;
  if (ctx.keep && side === ctx.me) n = applyFilter(pos, moves, n, ctx.keep);
  const order = ORDER[ply];
  n = orderMoves(pos, moves, n, ctx.values, order);
  let best = -Infinity;
  for (let i = 0; i < n; i++) {
    pos.make(order[i]);
    const v = -search(pos, depth - 1, -beta, -alpha, ply + 1, ctx);
    pos.unmake();
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

const DEFAULTS = { ...SCORE_DEFAULTS, depth: 2, margin: 0.1 };

// A player that looks `depth` moves ahead (one move = one player's turn) and scores positions with `evaluate`.
// It picks at random among moves within `margin` of the best, so games between the same players differ.
// keep(side, from, to, kind), if given, limits its own moves (style players); if nothing passes, all moves count.
export function searcher(name, options = {}, keep = null) {
  const opts = { ...DEFAULTS, ...options };
  const stats = { nodes: 0, moves: 0 };
  const values = codeValues(opts.values);
  return {
    name, stats,
    choose(st, moves, rng) {
      if (keep) { const f = moves.filter(m => keep(st.turn === 'w' ? 0 : 1, m.from, m.to, m.kind)); if (f.length) moves = f; }
      if (moves.length === 1) return moves[0];
      const pos = positionOf(st), ctx = { me: pos.side, opts, values, keep, stats };
      const codes = MOVES[0], order = ORDER[0];
      moves.forEach((m, i) => { codes[i] = m.from | (m.to << 8); });
      const n = orderMoves(pos, codes, moves.length, values, order);
      const byCode = new Map(moves.map(m => [m.from | (m.to << 8), m]));
      stats.moves++;
      let best = -Infinity;
      const scored = [];
      for (let i = 0; i < n; i++) {
        // Search each root move with a window just below the best so far, so near-best moves get real scores.
        const alpha = best - opts.margin;
        pos.make(order[i]);
        const v = -search(pos, opts.depth - 1, -Infinity, -alpha, 1, ctx);
        pos.unmake();
        scored.push([v, byCode.get(order[i])]);
        if (v > best) best = v;
      }
      const good = scored.filter(([v]) => v >= best - opts.margin).map(x => x[1]);
      return good[Math.floor(rng() * good.length)];
    },
  };
}

// ---------- The players ----------
export const random = () => ({ name: 'random', choose: (st, moves, rng) => moves[Math.floor(rng() * moves.length)] });

// Takes the most valuable piece it can, otherwise moves at random.
export const greedy = () => ({
  name: 'greedy',
  choose(st, moves, rng) {
    const caps = moves.filter(m => m.kind === 'capture');
    if (!caps.length) return moves[Math.floor(rng() * moves.length)];
    const top = Math.max(...caps.map(m => pieceValue(st.board[m.to])));
    const best = caps.filter(m => pieceValue(st.board[m.to]) === top);
    return best[Math.floor(rng() * best.length)];
  },
});

export const careful = (o = {}) => searcher('careful', { depth: 2, ...o });
export const thinker = (o = {}) => searcher('thinker', { depth: 3, ...o });

// Style players: Careful with one habit.
const inOwnHalf = (side, s) => forward(side, s) <= 5; // own zone plus the middle zone
export const turtle = (o = {}) => searcher('turtle', { depth: 2, earthGuard: 0.8, ...o },
  (side, from, to) => inOwnHalf(side, to));
export const rusher = (o = {}) => searcher('rusher', { depth: 2, advance: 0.15, wizardPressure: 0.3, ...o });
export const combiner = (o = {}) => searcher('combiner', { depth: 2, stackBonus: 2, ...o });
export const neverCombiner = (o = {}) => searcher('never-combiner', { depth: 2, ...o },
  (side, from, to, kind) => kind !== 'combine');
export const hunter = (o = {}) => searcher('hunter', { depth: 2, materialWeight: 0.3, wizardPressure: 0.6, hunt: 0.8, ...o });

export { deep };

export const PLAYERS = { random, greedy, careful, thinker, turtle, rusher, combiner, neverCombiner, hunter, deep };

// Deep: a look-ahead player built with the standard techniques of chess engines (see
// docs/research/automated-playtesting.md and the Chess Programming Wiki pages linked there).
//
//   - Iterative deepening: search 1 move ahead, then 2, then 3, ... until the budget runs out,
//     and play the best move of the last search that finished.
//   - A budget of positions looked at ("nodes"), not of time, so a game replays exactly from its
//     seed and isn't affected by how busy the computer is.
//   - A transposition table: it remembers what it found in each position (keyed by the position's
//     hash), so a position reached again by a different move order isn't searched twice, and the
//     previous iteration's best move is tried first.
//   - Move ordering: that remembered move, then captures (most valuable victim first, by the
//     cheapest attacker), combines, "killer" moves that refuted a sibling, and moves that refuted
//     positions before ("history").
//   - Quiescence search: at the end of the look-ahead it keeps following captures (and every reply
//     to a check) until the position is quiet, so it doesn't stop counting in the middle of an
//     exchange.
//   - Optional pruning, off by default: principal variation search (after the first move, only
//     check that the others are no better), late move reductions (quiet moves late in the order get
//     a shallower look, and a full one if they turn out good) and null-move pruning (if the position
//     is still good after letting the opponent move twice, it's good enough to stop). Measured on
//     2026-10-28 with a 20,000-node budget, 200 games each against Deep without them: PVS 47%,
//     PVS + reductions 49%, PVS + null move 45%, all three 42%. They help chess engines that search
//     much deeper; at Deep's 3 moves they don't, and passing may simply not be safe in Elements.
//   - Check extension: a position in check is searched one move deeper.
//   - Repetition: a position that already occurred (in the game or earlier in the line being
//     searched) counts as a draw, so a side that's ahead avoids repeating and one that's behind
//     seeks it. Without this, two equal bots shuffle back and forth into threefold repetition.
//
// The search doesn't know which game it plays: everything game-specific comes from a "game
// adapter" (legal moves, captures, check, the position score). elementsGame() below is the one for
// Elements, scoring positions with the same evaluate() as Careful and Thinker; chess/players.mjs
// has one for chess, so the same search can be calibrated on chess.
import { positionOf } from './engine.mjs';
import { legalMoves, pseudoMoves, inCheck, OWNER } from '../packages/engine/src/core.ts';
import { evaluate, codeValues, SCORE_DEFAULTS } from './evaluate.mjs';

const EPS = 1e-6; // the width of a "null window": is the score above this bound or not?

const WIN = 10000, MATE_ZONE = WIN - 1000, INF = 1e9;
const MAX_PLY = 64, QUIESCE_LIMIT = 12;
const ABORT = Symbol('out of budget');

const pathLo = new Int32Array(MAX_PLY), pathHi = new Int32Array(MAX_PLY);
const MOVES = Array.from({ length: MAX_PLY }, () => new Int32Array(512));
const KEYS = Array.from({ length: MAX_PLY }, () => new Float64Array(512));

// Transposition table entry flags: the stored score is exact, a lower bound or an upper bound.
const EXACT = 1, LOWER = 2, UPPER = 3;
function table(bits) {
  const size = 1 << bits;
  return {
    mask: size - 1, lo: new Int32Array(size), hi: new Int32Array(size), depth: new Int8Array(size),
    flag: new Uint8Array(size), score: new Float64Array(size), move: new Int32Array(size),
  };
}
// Mate scores count moves from the root; stored ones count from the position itself.
const toTable = (v, ply) => (v > MATE_ZONE ? v + ply : v < -MATE_ZONE ? v - ply : v);
const fromTable = (v, ply) => (v > MATE_ZONE ? v - ply : v < -MATE_ZONE ? v + ply : v);

// The game adapter for Elements. A move is from | to << 8 (packages/engine core).
export function elementsGame(opts) {
  const values = codeValues(opts.values);
  const probe = new Int32Array(256);
  return {
    position: st => positionOf(st),
    encode: m => m.from | (m.to << 8),
    // Earlier positions of the game since the last capture or combine (hex hashes; the last one is now).
    earlier(st) {
      const h = st.game.history.slice(0, -1);
      return { lo: Int32Array.from(h, x => parseInt(x.slice(8), 16) | 0), hi: Int32Array.from(h, x => parseInt(x.slice(0, 8), 16) | 0) };
    },
    legal: legalMoves,
    // Captures for the side to move, legal ones only.
    captures(pos, out) {
      const b = pos.board, side = pos.side;
      let n = 0;
      for (let s = 0; s < 81; s++) {
        if (!b[s] || OWNER[b[s]] !== side) continue;
        const start = n;
        n = pseudoMoves(pos, s, out, n);
        let k = start;
        for (let i = start; i < n; i++) {
          const m = out[i], t = b[m >> 8];
          if (!t || OWNER[t] === side) continue;
          pos.make(m);
          const ok = !inCheck(pos, side);
          pos.unmake();
          if (ok) out[k++] = m;
        }
        n = k;
      }
      return n;
    },
    inCheck: pos => inCheck(pos, pos.side),
    lost: pos => pos.capturers[pos.side] === 0, // elimination
    canPass: pos => pos.capturers[pos.side] > 3, // see the null move in search()
    // Is m (from the transposition table, so maybe from another position with the same hash) legal here?
    isLegal(pos, m) {
      const from = m & 255, side = pos.side, p = pos.board[from];
      if (!p || OWNER[p] !== side) return false;
      const n = pseudoMoves(pos, from, probe, 0);
      let found = false;
      for (let i = 0; i < n; i++) if (probe[i] === m) { found = true; break; }
      if (!found) return false;
      pos.make(m);
      const ok = !inCheck(pos, side);
      pos.unmake();
      return ok;
    },
    // Sort key for a move that changes material: captures (most valuable victim first, cheapest
    // attacker first), then combines. 0 for a quiet move.
    tactical(pos, m) {
      if ((m & 255) >= 81) return 6e7; // bringing a piece back (castleReturn), right after captures
      const b = pos.board, t = b[m >> 8];
      if (!t) return 0;
      return OWNER[t] !== pos.side ? 1e8 + values[t] * 1000 - values[b[m & 255]] : 5e7;
    },
    slot: m => (m & 255) * 81 + (m >> 8), // for the history table: < 8192
    evaluate: (pos, me) => evaluate(pos, me, opts, values),
  };
}

export function deep(options = {}, makeGame = elementsGame) {
  const opts = {
    ...SCORE_DEFAULTS, depth: 30, nodes: 20000, margin: 0.1, tableBits: 18,
    quiesce: true, pvs: false, lmr: false, nullMove: false, checkExtension: true, repetition: true, ...options,
  };
  const game = makeGame(opts);
  const tt = table(opts.tableBits);
  const killers = new Int32Array(MAX_PLY * 2);
  const history = new Int32Array(2 * 8192);
  const stats = { nodes: 0, moves: 0, depthSum: 0 };
  let me = 0, nodes = 0, hardLimit = Infinity;
  let gameLo = new Int32Array(0), gameHi = new Int32Array(0); // earlier positions of the game since the last capture or combine

  // Has this position occurred before, in the game or earlier on the line being searched?
  // Same hash means same side to move, so only every second position on the line can match.
  function repeated(pos, ply) {
    const lo = pos.hashLo, hi = pos.hashHi;
    for (let p = ply - 2; p >= 0; p -= 2) if (pathLo[p] === lo && pathHi[p] === hi) return true;
    for (let i = 0; i < gameLo.length; i++) if (gameLo[i] === lo && gameHi[i] === hi) return true;
    return false;
  }

  const score = pos => { const v = game.evaluate(pos, me); return pos.side === me ? v : -v; };

  // Sort keys for the moves of one node; the search then picks the best remaining move each time.
  function rank(pos, moves, n, keys, ply, ttMove) {
    const side = pos.side;
    for (let i = 0; i < n; i++) {
      const m = moves[i], t = game.tactical(pos, m);
      if (m === ttMove) keys[i] = 1e9;
      else if (t) keys[i] = t;
      else if (m === killers[ply * 2]) keys[i] = 4e7;
      else if (m === killers[ply * 2 + 1]) keys[i] = 3.9e7;
      else keys[i] = history[side * 8192 + game.slot(m)];
    }
  }
  function pick(moves, keys, n, i) {
    let best = i;
    for (let j = i + 1; j < n; j++) if (keys[j] > keys[best]) best = j;
    const m = moves[best]; moves[best] = moves[i]; moves[i] = m;
    const k = keys[best]; keys[best] = keys[i]; keys[i] = k;
    return m;
  }

  function quiesce(pos, alpha, beta, ply, q) {
    if (++nodes > hardLimit) throw ABORT;
    const lost = -(WIN - ply);
    if (game.lost(pos)) return lost;
    const checked = game.inCheck(pos);
    let best = -INF;
    if (!checked) {
      best = score(pos); // "stand pat": the side to move may also just not capture
      if (best >= beta || q >= QUIESCE_LIMIT || !opts.quiesce) return best;
      if (best > alpha) alpha = best;
    }
    const moves = MOVES[ply], keys = KEYS[ply];
    const n = checked ? game.legal(pos, moves) : game.captures(pos, moves);
    if (checked && !n) return lost;
    if (checked && q >= QUIESCE_LIMIT) return score(pos);
    rank(pos, moves, n, keys, ply, 0);
    for (let i = 0; i < n; i++) {
      const m = pick(moves, keys, n, i);
      pos.make(m);
      const v = -quiesce(pos, -beta, -alpha, ply + 1, q + 1);
      pos.unmake();
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function search(pos, depth, alpha, beta, ply, allowNull) {
    const side = pos.side, lost = -(WIN - ply);
    pathLo[ply] = pos.hashLo; pathHi[ply] = pos.hashHi;
    if (opts.repetition && repeated(pos, ply)) return 0;
    const checked = game.inCheck(pos);
    if (checked && opts.checkExtension && ply < MAX_PLY - QUIESCE_LIMIT - 4) depth++;
    if (depth <= 0) return quiesce(pos, alpha, beta, ply, 0);
    if (++nodes > hardLimit) throw ABORT;
    if (game.lost(pos)) return lost;

    const slot = pos.hashLo & tt.mask;
    const known = tt.lo[slot] === pos.hashLo && tt.hi[slot] === pos.hashHi && tt.flag[slot];
    let ttMove = 0;
    if (known) {
      ttMove = tt.move[slot];
      if (tt.depth[slot] >= depth) {
        const v = fromTable(tt.score[slot], ply), f = tt.flag[slot];
        if (f === EXACT || (f === LOWER && v >= beta) || (f === UPPER && v <= alpha)) return v;
      }
    }

    // Null move: let the opponent move twice. If that still fails to bring the score below beta,
    // a real move will do at least as well. Not in check (the opponent could take the Wizard), and
    // not where the game says passing could hide a threat (in Elements: few capturing pieces left).
    if (opts.nullMove && allowNull && !checked && depth >= 3 && beta < MATE_ZONE && game.canPass(pos)) {
      pos.pass();
      const v = -search(pos, depth - 3, -beta, -beta + EPS, ply + 1, false);
      pos.pass();
      if (v >= beta) return v;
    }

    const alpha0 = alpha;
    let best = -INF, bestMove = 0, searched = 0;
    const store = () => {
      tt.lo[slot] = pos.hashLo; tt.hi[slot] = pos.hashHi; tt.depth[slot] = depth; tt.move[slot] = bestMove;
      tt.flag[slot] = best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT;
      tt.score[slot] = toTable(best, ply);
    };
    const cutoff = m => {
      if (!game.tactical(pos, m)) { // a quiet move refuted this position: remember it
        if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
        history[side * 8192 + game.slot(m)] += depth * depth;
      }
    };

    // The remembered best move first, before listing all moves: if it refutes the position, the
    // move list is never needed.
    if (ttMove && game.isLegal(pos, ttMove)) {
      pos.make(ttMove);
      const v = -search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      pos.unmake();
      searched = 1; best = v; bestMove = ttMove;
      if (v > alpha) alpha = v;
      if (alpha >= beta) { cutoff(ttMove); store(); return best; }
    } else ttMove = 0;

    const moves = MOVES[ply], keys = KEYS[ply];
    const n = game.legal(pos, moves);
    if (!n) return checked ? lost : 0;
    rank(pos, moves, n, keys, ply, ttMove);

    for (let i = 0; i < n; i++) {
      const m = pick(moves, keys, n, i);
      if (m === ttMove) continue;
      const quiet = !game.tactical(pos, m);
      pos.make(m);
      let v;
      if (!searched || !opts.pvs) v = -search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        // Late move reduction: a quiet move this far down the list is probably no good.
        let r = 0;
        if (opts.lmr && depth >= 3 && searched >= 3 && quiet && !checked && m !== killers[ply * 2] && m !== killers[ply * 2 + 1])
          r = searched >= 8 && depth >= 5 ? 2 : 1;
        v = -search(pos, depth - 1 - r, -alpha - EPS, -alpha, ply + 1, true);
        if (v > alpha && r) v = -search(pos, depth - 1, -alpha - EPS, -alpha, ply + 1, true);
        if (v > alpha && v < beta) v = -search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake();
      searched++;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) { cutoff(m); break; }
    }
    store();
    return best;
  }

  return {
    name: 'deep', stats,
    choose(st, moves, rng) {
      if (moves.length === 1) return moves[0];
      const pos = game.position(st);
      me = pos.side; nodes = 0;
      pathLo[0] = pos.hashLo; pathHi[0] = pos.hashHi;
      ({ lo: gameLo, hi: gameHi } = game.earlier(st));
      stats.moves++;
      killers.fill(0);
      for (let i = 0; i < history.length; i++) history[i] >>= 2; // older lessons count less
      const byCode = new Map(moves.map(m => [game.encode(m), m]));
      let root = moves.map(m => ({ m: game.encode(m), v: 0 }));
      let done = null, depth = 0;
      hardLimit = Infinity; // the 1-move search always finishes, so there's always a move to play
      for (let d = 1; d <= opts.depth; d++) {
        if (d > 1 && nodes >= opts.nodes * 0.4) break; // the next search would likely blow the budget
        if (d === 2) hardLimit = opts.nodes * 2;
        try {
          // Each root move gets a window just below the best so far, so near-best moves get real
          // scores and the player can choose among them (margin), like Careful and Thinker.
          let best = -INF;
          const scored = [];
          for (const r of root) {
            const alpha = best === -INF ? -INF : best - opts.margin;
            pos.make(r.m);
            const v = -search(pos, d - 1, -INF, -alpha, 1, true);
            pos.unmake();
            scored.push({ m: r.m, v });
            if (v > best) best = v;
          }
          done = scored; depth = d;
          root = scored.slice().sort((a, b) => b.v - a.v); // best first next time
          if (Math.abs(best) > MATE_ZONE) break; // a forced win or loss: no need to look further
        } catch (e) {
          if (e !== ABORT) throw e;
          break; // out of budget mid-search: keep the last search that finished
        }
      }
      stats.nodes += nodes; stats.depthSum += depth;
      const best = Math.max(...done.map(r => r.v));
      const good = done.filter(r => r.v >= best - opts.margin);
      return byCode.get(good[Math.floor(rng() * good.length)].m);
    },
  };
}

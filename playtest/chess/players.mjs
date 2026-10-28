// Chess players for the calibration: the same Deep search as for Elements (deep.mjs), with a chess
// game adapter. The position score mirrors Elements' evaluate(): material plus mobility.
import { deep } from '../deep.mjs';
import { ChessPosition, legalMoves, pseudoMoves, inCheck, PAWN, KNIGHT, BISHOP, ROOK, QUEEN } from './rules.mjs';

// Piece values: pawn, knight, bishop, rook, queen.
export const CHESS_VALUES = {
  naive: [1, 1, 1, 1, 1],        // knows nothing: every piece the same, like a first guess
  classic: [1, 3, 3, 5, 9],      // the textbook values
  // Learned by chess/tune.mjs (2026-10-28). Round 1, from 4,000 games of Deep 2k with naive values,
  // gave 1 / 1.7 / 1.92 / 3.07 / 4.8; round 2, from 4,000 games with those, gave these:
  tuned: [1, 2, 2.15, 3.48, 6.22],
};
const scratch = new Int32Array(256);

// Moves available to `side` (pseudo-legal), for the mobility term.
function mobility(p, side) {
  const s = p.side;
  p.side = side;
  const n = pseudoMoves(p, scratch);
  p.side = s;
  return n;
}

export function chessGame(opts) {
  const v = [0, ...opts.chessValues, 0, 0, 0]; // indexed by piece type 1–6 (king 0)
  const value = pc => v[pc & 7];
  const buf = new Int32Array(256);
  return {
    position: st => st.pos.clone(),
    encode: m => m,
    earlier: st => ({ lo: Int32Array.from(st.earlier, h => h[0]), hi: Int32Array.from(st.earlier, h => h[1]) }),
    legal: (pos, out) => legalMoves(pos, out),
    captures: (pos, out) => legalMoves(pos, out, true),
    inCheck: pos => inCheck(pos),
    lost: () => false, // chess has no elimination
    canPass: pos => pos.board.some(pc => pc && (pc >> 3) === pos.side && (pc & 7) > PAWN && (pc & 7) < 6), // not in pawn endings
    isLegal(pos, m) {
      const n = legalMoves(pos, buf);
      for (let i = 0; i < n; i++) if (buf[i] === m) return true;
      return false;
    },
    tactical(pos, m) {
      const b = pos.board, to = (m >> 6) & 63, promo = (m >> 12) & 7, ep = (m >> 15) & 1;
      const victim = b[to] ? value(b[to]) : ep ? v[PAWN] : 0;
      if (!b[to] && !ep && !promo) return 0;
      return 1e8 + (victim + (promo ? v[promo] : 0)) * 1000 - value(b[m & 63]);
    },
    slot: m => m & 4095,
    evaluate(pos, me) {
      let score = 0;
      for (let s = 0; s < 64; s++) { const pc = pos.board[s]; if (pc) score += ((pc >> 3) === me ? 1 : -1) * value(pc); }
      if (opts.mobility) score += opts.mobility * (mobility(pos, me) - mobility(pos, me ^ 1));
      if (inCheck(pos)) score += (pos.side === me ? -1 : 1) * 0.3;
      return score;
    },
  };
}

export function chessPlayer({ type, values = 'naive', chessValues, ...o }) {
  if (type === 'random') return { name: 'random', choose: (st, moves, rng) => moves[Math.floor(rng() * moves.length)] };
  if (type !== 'deep') throw new Error(`No chess player ${type}`);
  return deep({ mobility: 0.05, margin: 0.05, ...o, chessValues: chessValues ?? CHESS_VALUES[values] }, chessGame);
}

export { ChessPosition, KNIGHT, BISHOP, ROOK, QUEEN };

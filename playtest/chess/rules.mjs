// Chess rules, for calibrating the playtest method on a game whose answers are known (PRODUCT_BRIEF
// D13). Same shape as the Elements engine's fast core: one mutable position, make and take back
// moves, Zobrist hashing. Checked against the published perft totals (chess/perft.mjs).
//
// Board: 64 squares, a1 = 0, h1 = 7, a8 = 56. Pieces: 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen,
// 6 king; Black adds 8. A move is one number: from | to << 6 | promotion << 12 | flags << 15.
export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6, BLACK = 8;
const EP = 1, CASTLE = 2, DOUBLE = 4;
export const moveFrom = m => m & 63, moveTo = m => (m >> 6) & 63, movePromo = m => (m >> 12) & 7;
const mv = (from, to, promo = 0, flags = 0) => from | (to << 6) | (promo << 12) | (flags << 15);

const file = s => s & 7, rank = s => s >> 3;
const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const steps = deltas => Array.from({ length: 64 }, (_, s) => deltas.map(([df, dr]) => [file(s) + df, rank(s) + dr]).filter(([f, r]) => on(f, r)).map(([f, r]) => r * 8 + f));
const KNIGHT_TO = steps([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]);
const KING_TO = steps([[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]);
const ray = (df, dr) => Array.from({ length: 64 }, (_, s) => { const out = []; for (let f = file(s) + df, r = rank(s) + dr; on(f, r); f += df, r += dr) out.push(r * 8 + f); return out; });
const ORTH = [ray(1, 0), ray(-1, 0), ray(0, 1), ray(0, -1)], DIAG = [ray(1, 1), ray(1, -1), ray(-1, 1), ray(-1, -1)];

// Zobrist keys: [piece * 64 + square], castling rights, en-passant file, side.
let seed = 0x2545f491;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const KLO = Int32Array.from({ length: 16 * 64 }, rnd), KHI = Int32Array.from({ length: 16 * 64 }, rnd);
const CLO = Int32Array.from({ length: 16 }, rnd), CHI = Int32Array.from({ length: 16 }, rnd);
const ELO = Int32Array.from({ length: 8 }, rnd), EHI = Int32Array.from({ length: 8 }, rnd);
const SLO = rnd(), SHI = rnd();
// Castling rights lost when a piece moves from or to a square.
const KEEP = new Uint8Array(64).fill(15);
KEEP[0] = 15 & ~2; KEEP[7] = 15 & ~1; KEEP[4] = 15 & ~3; KEEP[56] = 15 & ~8; KEEP[63] = 15 & ~4; KEEP[60] = 15 & ~12;

export class ChessPosition {
  board = new Int8Array(64);
  side = 0;          // 0 White, 1 Black
  castling = 0;      // 1 White short, 2 White long, 4 Black short, 8 Black long
  ep = -1;           // en-passant target square
  halfmove = 0;      // moves since the last capture or pawn move
  king = [-1, -1];
  hashLo = 0; hashHi = 0;
  undo = [];

  static fromFen(fen) {
    const p = new ChessPosition(), [rows, turn, castle, ep, half] = fen.trim().split(/\s+/);
    rows.split('/').forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { f += +ch; continue; }
        const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1;
        p.put((7 - i) * 8 + f++, t + (ch === ch.toLowerCase() ? BLACK : 0));
      }
    });
    if (turn === 'b') { p.side = 1; p.hashLo ^= SLO; p.hashHi ^= SHI; }
    for (const [ch, bit] of [['K', 1], ['Q', 2], ['k', 4], ['q', 8]]) if (castle?.includes(ch)) p.castling |= bit;
    p.hashLo ^= CLO[p.castling]; p.hashHi ^= CHI[p.castling];
    if (ep && ep !== '-') { p.ep = (ep.charCodeAt(0) - 97) + (+ep[1] - 1) * 8; p.hashLo ^= ELO[file(p.ep)]; p.hashHi ^= EHI[file(p.ep)]; }
    p.halfmove = +(half ?? 0);
    return p;
  }

  put(s, pc) {
    this.board[s] = pc;
    this.hashLo ^= KLO[pc * 64 + s]; this.hashHi ^= KHI[pc * 64 + s];
    if ((pc & 7) === KING) this.king[pc >> 3] = s;
  }
  take(s) {
    const pc = this.board[s];
    this.board[s] = 0;
    this.hashLo ^= KLO[pc * 64 + s]; this.hashHi ^= KHI[pc * 64 + s];
    return pc;
  }

  make(m) {
    const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flags = m >> 15, b = this.board;
    this.undo.push([m, b[to], this.castling, this.ep, this.halfmove, this.hashLo, this.hashHi]);
    const pc = this.take(from), us = this.side, them = us ^ 1;
    let captured = b[to] ? this.take(to) : 0;
    if (flags & EP) captured = this.take(to + (us ? 8 : -8));
    this.put(to, promo ? promo + us * BLACK : pc);
    if (flags & CASTLE) { // move the rook too
      const [rf, rt] = to > from ? [to + 1, to - 1] : [to - 2, to + 1];
      this.put(rt, this.take(rf));
    }
    this.hashLo ^= CLO[this.castling]; this.hashHi ^= CHI[this.castling];
    this.castling &= KEEP[from] & KEEP[to];
    this.hashLo ^= CLO[this.castling]; this.hashHi ^= CHI[this.castling];
    if (this.ep >= 0) { this.hashLo ^= ELO[file(this.ep)]; this.hashHi ^= EHI[file(this.ep)]; }
    this.ep = flags & DOUBLE ? (from + to) >> 1 : -1;
    if (this.ep >= 0) { this.hashLo ^= ELO[file(this.ep)]; this.hashHi ^= EHI[file(this.ep)]; }
    this.halfmove = captured || (pc & 7) === PAWN ? 0 : this.halfmove + 1;
    this.side = them; this.hashLo ^= SLO; this.hashHi ^= SHI;
    return captured;
  }

  unmake() {
    const [m, captured, castling, ep, halfmove, lo, hi] = this.undo.pop();
    const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flags = m >> 15, b = this.board;
    this.side ^= 1;
    const us = this.side;
    const pc = promo ? PAWN + us * BLACK : b[to];
    b[to] = captured; b[from] = pc;
    if ((pc & 7) === KING) this.king[us] = from;
    if (flags & EP) b[to + (us ? 8 : -8)] = PAWN + (us ^ 1) * BLACK;
    if (flags & CASTLE) {
      const [rf, rt] = to > from ? [to + 1, to - 1] : [to - 2, to + 1];
      b[rf] = b[rt]; b[rt] = 0;
    }
    this.castling = castling; this.ep = ep; this.halfmove = halfmove; this.hashLo = lo; this.hashHi = hi;
  }

  clone() {
    const p = new ChessPosition();
    p.board.set(this.board);
    p.side = this.side; p.castling = this.castling; p.ep = this.ep; p.halfmove = this.halfmove;
    p.king = this.king.slice(); p.hashLo = this.hashLo; p.hashHi = this.hashHi;
    return p;
  }

  pass() { // null move, for the search's optional null-move pruning
    this.side ^= 1; this.hashLo ^= SLO; this.hashHi ^= SHI;
  }
}

export function attacked(p, s, by) {
  const b = p.board, off = by * BLACK;
  const pawnFrom = by ? [[-1, 1], [1, 1]] : [[-1, -1], [1, -1]];
  for (const [df, dr] of pawnFrom) { const f = file(s) + df, r = rank(s) + dr; if (on(f, r) && b[r * 8 + f] === PAWN + off) return true; }
  for (const t of KNIGHT_TO[s]) if (b[t] === KNIGHT + off) return true;
  for (const t of KING_TO[s]) if (b[t] === KING + off) return true;
  for (const r of ORTH) for (const t of r[s]) { const x = b[t]; if (!x) continue; if (x === ROOK + off || x === QUEEN + off) return true; break; }
  for (const r of DIAG) for (const t of r[s]) { const x = b[t]; if (!x) continue; if (x === BISHOP + off || x === QUEEN + off) return true; break; }
  return false;
}
export const inCheck = (p, side = p.side) => attacked(p, p.king[side], side ^ 1);

// Pseudo-legal moves (may leave the own king attacked). capturesOnly: captures and promotions.
export function pseudoMoves(p, out, capturesOnly = false) {
  const b = p.board, us = p.side, them = us ^ 1;
  let n = 0;
  const enemy = x => x && (x >> 3) === them;
  for (let s = 0; s < 64; s++) {
    const pc = b[s];
    if (!pc || (pc >> 3) !== us) continue;
    const t = pc & 7;
    if (t === PAWN) {
      const dir = us ? -8 : 8, start = us ? 6 : 1, last = us ? 0 : 7, one = s + dir;
      const push = (to, flags = 0) => {
        if (rank(to) === last) for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out[n++] = mv(s, to, pr, flags);
        else out[n++] = mv(s, to, 0, flags);
      };
      if (!b[one] && (!capturesOnly || rank(one) === last)) {
        push(one);
        if (!capturesOnly && rank(s) === start && !b[one + dir]) out[n++] = mv(s, one + dir, 0, DOUBLE);
      }
      for (const df of [-1, 1]) {
        const f = file(s) + df;
        if (f < 0 || f > 7) continue;
        const to = one + df;
        if (enemy(b[to])) push(to);
        else if (to === p.ep) out[n++] = mv(s, to, 0, EP);
      }
    } else if (t === KNIGHT || t === KING) {
      for (const to of (t === KNIGHT ? KNIGHT_TO : KING_TO)[s]) if (enemy(b[to]) || (!b[to] && !capturesOnly)) out[n++] = mv(s, to);
      if (t === KING && !capturesOnly) { // castling: rights, empty squares, and no attacked square on the king's way
        const home = us ? 60 : 4, rights = p.castling >> (us * 2);
        if (s === home && rights & 1 && !b[home + 1] && !b[home + 2] && !attacked(p, home, them) && !attacked(p, home + 1, them) && !attacked(p, home + 2, them))
          out[n++] = mv(home, home + 2, 0, CASTLE);
        if (s === home && rights & 2 && !b[home - 1] && !b[home - 2] && !b[home - 3] && !attacked(p, home, them) && !attacked(p, home - 1, them) && !attacked(p, home - 2, them))
          out[n++] = mv(home, home - 2, 0, CASTLE);
      }
    } else {
      const rays = t === ROOK ? ORTH : t === BISHOP ? DIAG : t === QUEEN ? ORTH.concat(DIAG) : [];
      for (const r of rays) for (const to of r[s]) {
        const x = b[to];
        if (!x) { if (!capturesOnly) out[n++] = mv(s, to); continue; }
        if (enemy(x)) out[n++] = mv(s, to);
        break;
      }
    }
  }
  return n;
}

export function legalMoves(p, out, capturesOnly = false) {
  const n = pseudoMoves(p, out, capturesOnly), us = p.side;
  let k = 0;
  for (let i = 0; i < n; i++) { p.make(out[i]); if (!inCheck(p, us)) out[k++] = out[i]; p.unmake(); }
  return k;
}

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const sqName = s => 'abcdefgh'[file(s)] + (rank(s) + 1);
export const moveText = m => sqName(m & 63) + sqName((m >> 6) & 63) + (movePromo(m) ? ' nbrq'[movePromo(m) - 1] : '');

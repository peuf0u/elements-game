// Plays one chess game and records it in the same shape as Elements games (game.mjs), so stats,
// ratings and the worker pool work unchanged.
// config: { game: 'chess', white, black: player configs, seed, maxPlies, randomOpening,
//           remove: { side: 'w' | 'b', squares: ['d1'] } takes pieces off one side (handicap; squares
//           as White sees them, mirrored for Black) }
import { ChessPosition, legalMoves, inCheck, moveText, START, PAWN, KNIGHT, BISHOP } from './rules.mjs';
import { chessPlayer } from './players.mjs';
import { rngFrom } from '../game.mjs';

const LETTER = ' PNBRQK';

// The start position without some pieces of one side, as FEN (castling rights adjusted).
function startWithout({ side, squares }) {
  const rows = START.split(' ')[0].split('/').map(r => r.replace(/\d/g, d => '.'.repeat(+d)).split(''));
  for (const name of squares) {
    const f = name.charCodeAt(0) - 97, r = +name[1] - 1;
    rows[side === 'w' ? 7 - r : r][f] = '.';
  }
  const fenRows = rows.map(r => r.join('').replace(/\.+/g, m => m.length)).join('/');
  let castle = '';
  if (rows[7][4] === 'K') { if (rows[7][7] === 'R') castle += 'K'; if (rows[7][0] === 'R') castle += 'Q'; }
  if (rows[0][4] === 'k') { if (rows[0][7] === 'r') castle += 'k'; if (rows[0][0] === 'r') castle += 'q'; }
  return `${fenRows} w ${castle || '-'} - 0 1`;
}

// No pawns, rooks or queens, and at most one knight or bishop each: nobody can mate.
function insufficient(b) {
  const minors = [0, 0];
  for (const pc of b) {
    if (!pc || (pc & 7) === 6) continue;
    if ((pc & 7) !== KNIGHT && (pc & 7) !== BISHOP) return false;
    if (++minors[pc >> 3] > 1) return false;
  }
  return true;
}

export function playChessGame(config) {
  const rng = rngFrom(config.seed ?? 1);
  const pos = ChessPosition.fromFen(config.remove ? startWithout(config.remove) : config.fen ?? START);
  const players = [chessPlayer(config.white), chessPlayer(config.black)];
  const rec = { moves: [], captures: [], combines: [], material: [] };
  let hist = [[pos.hashLo, pos.hashHi]]; // positions since the last capture or pawn move, current last
  const max = config.maxPlies ?? 600, buf = new Int32Array(256), t0 = Date.now();
  let ply = 0, result = null;
  while (!result && ply < max) {
    const n = legalMoves(pos, buf);
    if (!n) { result = inCheck(pos) ? { winner: pos.side ? 'w' : 'b', reason: 'checkmate' } : { winner: null, reason: 'stalemate' }; break; }
    const moves = Array.from(buf.subarray(0, n));
    const st = { pos, earlier: hist.slice(0, -1), ply };
    const m = ply < (config.randomOpening ?? 0) ? moves[Math.floor(rng() * n)] : players[pos.side].choose(st, moves, rng);
    const from = m & 63, to = (m >> 6) & 63, by = pos.side ? 'b' : 'w', mover = pos.board[from];
    const victim = pos.board[to] || ((m >> 15) & 1 ? PAWN : 0);
    rec.moves.push(moveText(m));
    if (victim) rec.captures.push({ ply, by, piece: LETTER[victim & 7], with: LETTER[mover & 7] });
    pos.make(m);
    ply++;
    if (pos.halfmove === 0) hist = [];
    hist.push([pos.hashLo, pos.hashHi]);
    if (hist.filter(h => h[0] === pos.hashLo && h[1] === pos.hashHi).length >= 3) result = { winner: null, reason: 'repetition' };
    else if (pos.halfmove >= 100) result = { winner: null, reason: 'fifty' };
    else if (insufficient(pos.board)) result = { winner: null, reason: 'material' };
  }
  // A side with no legal move after the last move made is handled at the top of the loop.
  rec.winner = result ? result.winner : null;
  rec.reason = result ? result.reason : 'cap';
  rec.plies = ply;
  rec.ms = Date.now() - t0;
  return rec;
}

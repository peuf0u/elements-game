// Board diagrams in the spec's notation, and replaying a recorded game.
// White pieces are upper case (F3), Black lower case (f3). A stack lists both elements at its range (FW3).
import { N, sq, name, parse, startGame, legalMoves, play, setVariant } from './engine.mjs';

const LETTER = { fire: 'F', wind: 'W', water: 'R', earth: 'E' };

function cell(p) {
  if (!p) return '·';
  let t = p.wiz ? 'Z' : p.els.map(x => LETTER[x.e]).join('') + Math.max(...p.els.map(x => x.s));
  return p.o === 'w' ? t : t.toLowerCase();
}

// rows: optional [top, bottom] rank numbers (1–9) to print only part of the board.
// marks: { square: 'x' } to draw a marker instead of the piece.
export function diagram(board, { rows = [9, 1], marks = {} } = {}) {
  const lines = [];
  for (let y = rows[0] - 1; y >= rows[1] - 1; y--) {
    let line = String(y + 1).padStart(2) + ' ';
    for (let x = 0; x < N; x++) line += ' ' + (marks[name(sq(x, y))] ?? cell(board[sq(x, y)])).padEnd(3);
    lines.push(line.trimEnd());
  }
  lines.push('    ' + 'abcdefghi'.split('').join('   '));
  return lines.join('\n');
}

// Replays a game record (from game.mjs) and returns the state after `upTo` moves (default: all).
export function replay(rec, upTo = rec.moves.length) {
  setVariant(rec.config ?? {});
  let st = startGame(rec.formations.w, rec.formations.b);
  for (const mv of rec.moves.slice(0, upTo)) {
    const from = parse(mv.slice(0, 2)), to = parse(mv.slice(3));
    st = play(st, legalMoves(st).find(m => m.from === from && m.to === to));
  }
  return st;
}

// Text forms (architecture research §3, "Notation").
// Squares: a1–i9. Moves: "c2-c5" (the board decides whether that moves, captures or combines).
// Positions on one line, like chess's FEN: ranks 9 down to 1 separated by "/", then the side to move.
//   F3 Fire size 3, W Wind, R Water, E Earth, Z Wizard; upper case White, lower case Black;
//   a digit alone = that many empty squares; a stack in brackets, mover first: (R1W3).
//   "4z4/9/9/9/9/9/9/9/4Z4 w" is two lone Wizards, White to move.
import { N, square, squareName, parseSquare } from './squares.ts';
import { type Piece, type Side, type Element, type Size, pieceCode, decodePiece } from './pieces.ts';
import { startFromPosition, type GameState, type Action } from './game.ts';
import type { RulesConfig } from './position.ts';

const LETTER: Record<Element, string> = { fire: 'F', wind: 'W', water: 'R', earth: 'E' };
const ELEMENT: Record<string, Element> = { F: 'fire', W: 'wind', R: 'water', E: 'earth' };

function pieceText(p: Piece): string {
  const t = p.kind === 'wizard' ? 'Z' : p.units.length === 1 ? LETTER[p.units[0].element] + p.units[0].size
    : '(' + p.units.map(u => LETTER[u.element] + u.size).join('') + ')';
  return p.owner === 'white' ? t : t.toLowerCase();
}

export function positionText(state: GameState): string {
  const ranks: string[] = [];
  for (let r = N - 1; r >= 0; r--) {
    let line = '', empty = 0;
    for (let f = 0; f < N; f++) {
      const p = decodePiece(state.board[square(f, r)]);
      if (!p) { empty++; continue; }
      if (empty) { line += empty; empty = 0; }
      line += pieceText(p);
    }
    ranks.push(line + (empty ? empty : ''));
  }
  return ranks.join('/') + ' ' + (state.toMove === 'white' ? 'w' : 'b');
}

export function fromPositionText(text: string, config: Partial<RulesConfig> = {}): GameState {
  const [rows, turn = 'w'] = text.trim().split(/\s+/);
  const ranks = rows.split('/');
  if (ranks.length !== N) throw new Error(`Expected ${N} ranks: ${text}`);
  const pieces: Array<[number, Piece]> = [];
  ranks.forEach((line, i) => {
    const r = N - 1 - i;
    let f = 0;
    for (const tok of line.match(/\([FWRE]\d[FWRE]\d\)|\([fwre]\d[fwre]\d\)|[Zz]|[FWREfwre]\d|\d|./g) ?? []) {
      if (/^\d$/.test(tok)) { f += Number(tok); continue; }
      if (!/^(\(.*\)|[Zz]|[FWREfwre]\d)$/.test(tok)) throw new Error(`Can't read "${tok}" in rank ${r + 1}: ${line}`);
      const white = tok === tok.toUpperCase(), owner: Side = white ? 'white' : 'black', t = tok.toUpperCase();
      let p: Piece;
      if (t === 'Z') p = { owner, kind: 'wizard' };
      else {
        const units = [...t.matchAll(/([FWRE])(\d)/g)].map(m => ({ element: ELEMENT[m[1]], size: Number(m[2]) as Size }));
        p = { owner, kind: 'element', units: units as [typeof units[0]] };
      }
      pieceCode(p); // throws if the piece isn't valid
      pieces.push([square(f++, r), p]);
    }
    if (f !== N) throw new Error(`Rank ${r + 1} has ${f} squares: ${line}`);
  });
  return startFromPosition(pieces, { toMove: turn === 'b' ? 'black' : 'white', config });
}

export const actionText = ({ from, to }: Action): string => squareName(from) + '-' + squareName(to);
export function parseAction(text: string): Action {
  const [a, b] = text.split(/[-x+]/);
  return { from: parseSquare(a), to: parseSquare(b) };
}

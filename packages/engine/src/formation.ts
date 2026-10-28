// Formations (GAME_SPEC §6): a player's starting setup inside their own three rows, written from
// White's side. Black gets the same formation from their side of the table, rotated 180°, so
// White's b3 is Black's h7.
import { SQUARES, parseSquare } from './squares.ts';
import type { Piece, Side, Unit } from './pieces.ts';
import { startFromPosition, type GameState } from './game.ts';
import type { RulesConfig } from './position.ts';

export type Formation = Record<string, Unit | 'wizard'>;

// The designer's own formation, the default preset (§6).
//  3  ·  W3 E1 ·  E3 ·  E2 W2 ·
//  2  ·  ·  R1 W1 R2 F1 R3 ·  ·
//  1  ·  ·  ·  F3 Z  F2 ·  ·  ·
const u = (element: Unit['element'], size: Unit['size']): Unit => ({ element, size });
export const DEFAULT_FORMATION: Readonly<Formation> = Object.freeze({
  b3: u('wind', 3), c3: u('earth', 1), e3: u('earth', 3), g3: u('earth', 2), h3: u('wind', 2),
  c2: u('water', 1), d2: u('wind', 1), e2: u('water', 2), f2: u('fire', 1), g2: u('water', 3),
  d1: u('fire', 3), e1: 'wizard', f1: u('fire', 2),
});

// A game from two finished formations, White to move.
export function startFromFormations(
  white: Formation, black: Formation = white, options: { config?: Partial<RulesConfig> } = {},
): GameState {
  const pieces: Array<[number, Piece]> = [];
  for (const [owner, f] of [['white', white], ['black', black]] as Array<[Side, Formation]>)
    for (const [name, v] of Object.entries(f)) {
      const s = parseSquare(name), at = owner === 'white' ? s : SQUARES - 1 - s;
      if (owner === 'white' ? at >= 27 : at < 54) throw new Error(`${name} is outside the home zone`);
      pieces.push([at, v === 'wizard' ? { owner, kind: 'wizard' } : { owner, kind: 'element', units: [v] }]);
    }
  return startFromPosition(pieces, options);
}

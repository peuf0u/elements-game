// Formations (GAME_SPEC §6): a player's starting setup inside their own three rows, written from
// White's side. Black gets the same formation from their side of the table, rotated 180°, so
// White's b3 is Black's h7.
import { SQUARES, CASTLE, parseSquare } from './squares.ts';
import type { Piece, Side, Unit } from './pieces.ts';
import { startFromPosition, type GameState } from './game.ts';
import type { RulesConfig } from './position.ts';

export type Formation = Record<string, Unit | 'wizard'>;

const u = (element: Unit['element'], size: Unit['size']): Unit => ({ element, size });

// The preset formations (§6). All but `original` come from the computer playtest's formation
// search (playtest/FORMATIONS.html, 2026-10-28), played by its strongest fast bot; the designer
// chose windHeldBack as the default and the next five as presets. fireForward came from the
// search under rules v0.3 (playtest/FINDINGS.md §15) and joined on 2026-10-29.
export const PRESETS = Object.freeze({
  // The default: the strongest formation found.
  //  3  ·  ·  ·  ·  E3 ·  E2 F1 ·
  //  2  ·  ·  R1 W1 R2 W2 R3 ·  ·
  //  1  ·  E1 W3 F3 Z  F2 ·  ·  ·
  windHeldBack: { e3: u('earth', 3), g3: u('earth', 2), h3: u('fire', 1), c2: u('water', 1), d2: u('wind', 1), e2: u('water', 2), f2: u('wind', 2), g2: u('water', 3), b1: u('earth', 1), c1: u('wind', 3), d1: u('fire', 3), e1: 'wizard', f1: u('fire', 2) },
  // Mirrored and reshaped.
  mirrored: { b3: u('fire', 2), c3: u('earth', 1), e3: u('earth', 3), g3: u('wind', 3), h3: u('earth', 2), b2: u('water', 2), d2: u('water', 3), e2: u('fire', 1), f2: u('wind', 1), g2: u('water', 1), d1: u('wind', 2), e1: 'wizard', f1: u('fire', 3) },
  // Fire in front of the Wizard.
  fireBeforeWizard: { c3: u('earth', 1), h3: u('wind', 2), i3: u('earth', 2), c2: u('water', 1), d2: u('wind', 1), e2: u('fire', 2), f2: u('earth', 3), g2: u('water', 3), h2: u('fire', 1), b1: u('wind', 3), d1: u('fire', 3), e1: 'wizard', f1: u('water', 2) },
  // Fire 1 in front.
  fireOneInFront: { e3: u('fire', 1), g3: u('earth', 2), h3: u('fire', 2), c2: u('water', 1), d2: u('wind', 1), e2: u('water', 2), f2: u('earth', 3), g2: u('water', 3), b1: u('earth', 1), c1: u('wind', 3), d1: u('fire', 3), e1: 'wizard', f1: u('wind', 2) },
  // Low Winds, Earth forward.
  lowWinds: { e3: u('earth', 1), g3: u('earth', 3), h3: u('fire', 2), d2: u('wind', 1), e2: u('water', 2), f2: u('earth', 2), g2: u('water', 3), h2: u('water', 1), b1: u('fire', 1), c1: u('wind', 3), d1: u('fire', 3), e1: 'wizard', f1: u('wind', 2) },
  // Wizard forward: the most unusual one, with the shortest games.
  wizardForward: { a3: u('earth', 1), b3: u('earth', 2), c3: u('wind', 1), d3: u('fire', 1), f3: 'wizard', g3: u('fire', 3), e2: u('earth', 3), g2: u('water', 1), h2: u('water', 3), b1: u('wind', 2), c1: u('fire', 2), d1: u('water', 2), f1: u('wind', 3) },
  // Fire forward: the designer's formation with Fire 2 on e2, Fire 1 on h2 and Wind 1 on f1.
  // As strong as the default under rules v0.3.
  //  3  ·  W3 E1 ·  E3 ·  E2 W2 ·
  //  2  ·  ·  R1 R2 F2 ·  R3 F1 ·
  //  1  ·  ·  ·  F3 Z  W1 ·  ·  ·
  fireForward: { b3: u('wind', 3), c3: u('earth', 1), e3: u('earth', 3), g3: u('earth', 2), h3: u('wind', 2), c2: u('water', 1), d2: u('water', 2), e2: u('fire', 2), g2: u('water', 3), h2: u('fire', 1), d1: u('fire', 3), e1: 'wizard', f1: u('wind', 1) },
  // The designer's own formation `[12:44]`–`[13:10]`, the first default. The playtest's baseline.
  //  3  ·  W3 E1 ·  E3 ·  E2 W2 ·
  //  2  ·  ·  R1 W1 R2 F1 R3 ·  ·
  //  1  ·  ·  ·  F3 Z  F2 ·  ·  ·
  original: { b3: u('wind', 3), c3: u('earth', 1), e3: u('earth', 3), g3: u('earth', 2), h3: u('wind', 2), c2: u('water', 1), d2: u('wind', 1), e2: u('water', 2), f2: u('fire', 1), g2: u('water', 3), d1: u('fire', 3), e1: 'wizard', f1: u('fire', 2) },
} satisfies Record<string, Formation>);

export const DEFAULT_FORMATION: Readonly<Formation> = PRESETS.windHeldBack;

// A game from two finished formations, White to move.
export function startFromFormations(
  white: Formation, black: Formation = white, options: { config?: Partial<RulesConfig> } = {},
): GameState {
  const pieces: Array<[number, Piece]> = [];
  for (const [owner, f] of [['white', white], ['black', black]] as Array<[Side, Formation]>)
    for (const [name, v] of Object.entries(f)) {
      const s = parseSquare(name), at = owner === 'white' ? s : SQUARES - 1 - s;
      if (owner === 'white' ? at >= 27 : at < 54) throw new Error(`${name} is outside the home zone`);
      if (v === 'wizard' && options.config?.wizardZone === 'castle' && !CASTLE[(owner === 'white' ? 0 : SQUARES) + at])
        throw new Error(`the Wizard on ${name} is outside the castle`);
      pieces.push([at, v === 'wizard' ? { owner, kind: 'wizard' } : { owner, kind: 'element', units: [v] }]);
    }
  return startFromPosition(pieces, options);
}

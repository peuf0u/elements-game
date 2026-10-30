// The connector between the playtest and the rules: the only file that knows where the rules come
// from. Today that's the real engine, packages/engine (PRODUCT_BRIEF D13). The spike's rules are
// still loaded by spike-rules.mjs, but only so check.mjs can compare the two.
//
// The playtest works with readable boards ({ o: 'w' | 'b', wiz } or { o, els: [{ e, s }] } per
// square) and moves ({ from, to, kind }). Players that look ahead use the engine's fast core directly.
import * as E from '../packages/engine/src/index.ts';
import { Position, pseudoMoves as corePseudo, route, pieceCode, SQUARES } from '../packages/engine/src/core.ts';

export const N = E.N;
export const sq = (x, y) => y * N + x;
export const X = s => s % N;
export const Y = s => (s / N) | 0;
export const name = E.squareName;
export const parse = E.parseSquare;
export const other = o => (o === 'w' ? 'b' : 'w');
export const isCapturer = p => !p.wiz && p.els.some(x => x.e !== 'earth');
export const wizardSq = (board, o) => board.findIndex(p => p && p.wiz && p.o === o);
export const hasCapturers = (board, o) => board.some(p => p && p.o === o && isCapturer(p));

// Variant toggles (GAME_SPEC.md "v1 scope"), applied to the games started after this call.
let config = E.DEFAULT_CONFIG;
// quietMoveLimit: moves each without a capture or combine before a draw (0 = no limit). 75 from
// 2026-10-28 to rules v0.4; games recorded before that were played with 50, the chess rule.
// repetitionLimit: the same position this many times is a draw; 3 up to rules v0.4.
// The Water switches default to the v0.2 rule here, so every earlier experiment replays exactly;
// experiments of the v0.3 game (the engine's default) pass V03 below.
export const V03 = Object.freeze({ waterDiagonalBends: true, waterOneWay: true });
// Rules v0.4 (the engine's default since 2026-10-29): v0.3 plus the castle return, once per visit, into the own castle.
export const V04 = Object.freeze({ ...V03, castleReturn: 'oncePerVisit', returnTo: 'castle' });
// Rules v0.5 (the engine's default since 2026-10-30): v0.4 with chess's automatic draws, 50 moves each and the fifth repetition.
export const V05 = Object.freeze({ ...V04, quietMoveLimit: 50, repetitionLimit: 5 });
export function setVariant({ exactRange = false, noWaterEdge = false, waterStraightCapture = false, waterRiver = false, waterStraightSteps = false, waterDiagonalBends = false, waterOneWay = false, earthBreaksEarth = false, wizardZone = 'anywhere', castleReturn = 'off', returnTo = 'home', quietMoveLimit = 75, repetitionLimit = 3 } = {}) {
  config = { exactRange, noWaterEdge, waterStraightCapture, waterRiver, waterStraightSteps, waterDiagonalBends, waterOneWay, earthBreaksEarth, wizardZone, castleReturn, returnTo, quietMoveLimit, repetitionLimit };
}

// A formation is { square: [element, size] | 'wizard' } as White sees it (rows 1–3).
// Black gets it rotated 180°. The playtest's "default" stays the designer's original formation,
// which every earlier experiment refers to; the app's new default is the engine's DEFAULT_FORMATION.
export const DEFAULT_FORMATION = Object.fromEntries(Object.entries(E.PRESETS.original)
  .map(([s, v]) => [s, v === 'wizard' ? v : [v.element, v.size]]));
// The engine's presets (the app's default "Wind 3 held back" and the others) in the same form.
export const PRESETS = Object.fromEntries(Object.entries(E.PRESETS).map(([k, f]) => [k,
  Object.fromEntries(Object.entries(f).map(([s, v]) => [s, v === 'wizard' ? v : [v.element, v.size]]))]));
// The seven presets the formation experiments played (Fire forward joined later, 2026-10-29),
// so those experiments replay exactly.
export const FIRST_PRESETS = Object.fromEntries(Object.entries(PRESETS).filter(([k]) => k !== 'fireForward'));
const toEngine = f => Object.fromEntries(Object.entries(f).map(([s, v]) => [s, v === 'wizard' ? v : { element: v[0], size: v[1] }]));

const readable = p => (!p ? null : p.kind === 'wizard' ? { o: p.owner[0], wiz: true }
  : { o: p.owner[0], els: p.units.map(u => ({ e: u.element, s: u.size })) });
const REASON = { moveLimit: 'fifty' }; // the playtest's name for the move-limit draw, kept from the 50-move days
function wrap(game) {
  return {
    game,
    board: game.board.map(c => readable(E.decodePiece(c))),
    turn: game.toMove[0],
    ply: game.ply,
    phase: game.phase,
    result: game.result && { winner: game.result.winner?.[0] ?? null, reason: REASON[game.result.reason] ?? game.result.reason },
  };
}

export const startGame = (whiteFormation, blackFormation = whiteFormation) =>
  wrap(E.startFromFormations(toEngine(whiteFormation), toEngine(blackFormation), { config }));
export const legalMoves = st => E.legalActions(st.game).map(a => ({ ...a, kind: E.moveKind(st.game, a) }));
// Plays a move and runs the spec's end checks. st.phase becomes 'over' and st.result is set when the game ends.
export const play = (st, m) => wrap(E.apply(st.game, m).state);
// The engine's fast position for a playtest state, for players that look ahead.
export const positionOf = st => E.positionOf(st.game);

// For analysing finished games: the moves of the piece on `s` (Wizard safety ignored), with the
// way it moves and the squares it passes.
const toCode = p => pieceCode(p.wiz ? { owner: p.o === 'w' ? 'white' : 'black', kind: 'wizard' }
  : { owner: p.o === 'w' ? 'white' : 'black', kind: 'element', units: p.els.map(x => ({ element: x.e, size: x.s })) });
export function pseudoMoves(board, s) {
  const pos = Position.from(Array.from({ length: SQUARES }, (_, i) => (board[i] ? toCode(board[i]) : 0)), 0, config);
  const out = [], n = corePseudo(pos, s, out, 0);
  return out.slice(0, n).map(m => { const to = m >> 8, r = route(pos, s, to); return { from: s, to, as: r.way, path: r.path }; });
}

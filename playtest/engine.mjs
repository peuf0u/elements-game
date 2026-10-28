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
export function setVariant({ exactRange = false, noWaterEdge = false, waterStraightCapture = false } = {}) {
  config = { exactRange, noWaterEdge, waterStraightCapture };
}

// A formation is { square: [element, size] | 'wizard' } as White sees it (rows 1–3).
// Black gets it rotated 180°.
export const DEFAULT_FORMATION = Object.fromEntries(Object.entries(E.DEFAULT_FORMATION)
  .map(([s, v]) => [s, v === 'wizard' ? v : [v.element, v.size]]));
const toEngine = f => Object.fromEntries(Object.entries(f).map(([s, v]) => [s, v === 'wizard' ? v : { element: v[0], size: v[1] }]));

const readable = p => (!p ? null : p.kind === 'wizard' ? { o: p.owner[0], wiz: true }
  : { o: p.owner[0], els: p.units.map(u => ({ e: u.element, s: u.size })) });
const REASON = { fiftyMove: 'fifty' };
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

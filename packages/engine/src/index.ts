// @elements/engine: the rules of Elements (GAME_SPEC.md), with no UI, storage, clock or randomness.
// See README.md for how the pieces fit together.
export * from './game.ts';
export { type Formation, DEFAULT_FORMATION, PRESETS, startFromFormations } from './formation.ts';
export { positionText, fromPositionText, actionText, parseAction } from './notation.ts';
export { type Piece, type Side, type Element, type Size, type Unit, pieceCode, decodePiece } from './pieces.ts';
export { type RulesConfig, DEFAULT_CONFIG } from './position.ts';
export { squareName, parseSquare, N, SQUARES } from './squares.ts';
export { type Way } from './route.ts';

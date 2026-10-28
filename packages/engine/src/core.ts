// The fast core, for bots and tools that look many moves ahead. Mutable: make a move, look,
// take it back. The app uses the immutable API in index.ts instead.
export { Position, moveOf, moveFrom, moveTo } from './position.ts';
export { pseudoMoves, legalMoves, hasLegalMove, isAttacked, inCheck } from './movegen.ts';
export { route } from './route.ts';
export * from './pieces.ts';
export * from './squares.ts';

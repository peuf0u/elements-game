// The engine's public API (PRODUCT_BRIEF D8): plain, immutable game states. Each function takes a
// state and returns new data; nothing is changed in place. Built on the fast core in position.ts.
//
// Covers the play phase. The formation phase (alternate placement, GAME_SPEC §6) comes next;
// until then a game starts from a finished position (startFromPosition).
import { SQUARES, parseSquare } from './squares.ts';
import { type Piece, type Side, OWNER, pieceCode, decodePiece, sideIndex, sideName, unitCode, unitOf } from './pieces.ts';
import { Position, type RulesConfig, DEFAULT_CONFIG, moveOf } from './position.ts';
import { legalMoves, hasLegalMove, inCheck } from './movegen.ts';

export const RULES_VERSION = '0.4';

// from 81 + n brings captured unit n back onto `to` (castleReturn; pieces.ts unitOf).
export type Action = { from: number; to: number };
export type MoveKind = 'move' | 'capture' | 'combine' | 'return';
export type EndReason = 'elimination' | 'checkmate' | 'stalemate' | 'repetition' | 'moveLimit';
export type Result = { winner: Side | null; reason: EndReason };

export interface GameState {
  readonly rulesVersion: string;
  readonly config: Readonly<RulesConfig>;
  readonly phase: 'play' | 'over';
  readonly toMove: Side;
  readonly board: readonly number[];   // 81 piece codes, 0 = empty. Read with pieceAt.
  readonly ply: number;                // moves played so far (one move = one player's turn)
  readonly clock: number;              // turns since the last capture or combine (for the 75-move rule)
  readonly history: readonly string[]; // position hashes since the last capture or combine, current last
  readonly returned?: number;          // castleReturn: bit per side, brought a piece back on this visit
  readonly result: Result | null;
}

export type GameEvent =
  | { type: 'moved' | 'captured' | 'combined' | 'returned'; from: number; to: number; piece: Piece; taken: Piece | null }
  | { type: 'gameOver'; result: Result };

// A game from a finished position: { square: piece }, squares as 'e1' or 0–80.
export function startFromPosition(
  pieces: Record<string, Piece> | Array<[number, Piece]>,
  { toMove = 'white', config = {} }: { toMove?: Side; config?: Partial<RulesConfig> } = {},
): GameState {
  const board = new Array<number>(SQUARES).fill(0);
  const entries = Array.isArray(pieces) ? pieces : Object.entries(pieces).map(([k, p]) => [parseSquare(k), p] as [number, Piece]);
  for (const [s, p] of entries) {
    if (board[s]) throw new Error(`Two pieces on one square: ${s}`);
    board[s] = pieceCode(p);
  }
  const cfg = Object.freeze({ ...DEFAULT_CONFIG, ...config });
  const pos = Position.from(board, sideIndex(toMove), cfg);
  return { rulesVersion: RULES_VERSION, config: cfg, phase: 'play', toMove, board, ply: 0, clock: 0, history: [pos.key()], result: null };
}

// The fast core position for a state, for bots and tools that look ahead.
export const positionOf = (state: GameState): Position => Position.from(state.board, sideIndex(state.toMove), state.config, state.returned ?? 0);

const buffer = new Int32Array(512);

export function legalActions(state: GameState): Action[] {
  if (state.phase !== 'play') return [];
  const n = legalMoves(positionOf(state), buffer);
  const out: Action[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = { from: buffer[i] & 255, to: buffer[i] >> 8 };
  return out;
}

export function moveKind(state: GameState, { from, to }: Action): MoveKind {
  if (from >= SQUARES) return 'return';
  const t = state.board[to];
  return !t ? 'move' : OWNER[t] === OWNER[state.board[from]] ? 'combine' : 'capture';
}

export const pieceAt = (state: GameState, s: number): Piece | null => decodePiece(state.board[s]);

// Play a move and run the end checks in the spec's order (§6): the mover wins (elimination,
// checkmate), then draws (stalemate, repetition, the 75-move rule). Throws on an illegal move.
export function apply(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const pos = positionOf(state);
  const m = moveOf(action.from, action.to);
  const n = state.phase === 'play' ? legalMoves(pos, buffer) : 0;
  if (!buffer.subarray(0, n).includes(m)) throw new Error(`Illegal move: ${JSON.stringify(action)}`);

  const kind = moveKind(state, action), mover = pos.side, opp = mover ^ 1;
  const piece = kind === 'return' ? decodePiece(unitCode(mover, ...unitOf(action.from - SQUARES)))! : decodePiece(state.board[action.from])!;
  const taken = decodePiece(state.board[action.to]);
  pos.make(m);
  const key = pos.key();
  const irreversible = kind !== 'move';
  const history = irreversible ? [key] : [...state.history, key];
  const clock = irreversible ? 0 : state.clock + 1;

  let result: Result | null = null;
  const win = sideName(mover);
  if (pos.capturers[opp] === 0) result = { winner: win, reason: 'elimination' };
  else if (!hasLegalMove(pos)) result = inCheck(pos, opp) ? { winner: win, reason: 'checkmate' } : { winner: null, reason: 'stalemate' };
  else if (history.filter(h => h === key).length >= 3) result = { winner: null, reason: 'repetition' };
  else if (state.config.quietMoveLimit && clock >= 2 * state.config.quietMoveLimit) result = { winner: null, reason: 'moveLimit' };

  const next: GameState = {
    ...state, board: Array.from(pos.board), toMove: sideName(opp), ply: state.ply + 1, clock, history, result, returned: pos.returnedBits(),
    phase: result ? 'over' : 'play',
  };
  const type = kind === 'move' ? 'moved' : kind === 'capture' ? 'captured' : kind === 'combine' ? 'combined' : 'returned';
  const events: GameEvent[] = [{ type, from: action.from, to: action.to, piece, taken }];
  if (result) events.push({ type: 'gameOver', result });
  return { state: next, events };
}

export function status(state: GameState): { phase: GameState['phase']; toMove: Side; inCheck: boolean; result: Result | null } {
  const pos = positionOf(state);
  return { phase: state.phase, toMove: state.toMove, inCheck: inCheck(pos, pos.side), result: state.result };
}

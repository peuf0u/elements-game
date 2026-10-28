// The computer opponent for the spike, run as a Web Worker so the board stays smooth while it thinks.
// It uses the playtest's players (D12) on the real rules engine (D13); build.mjs bundles all of it
// into dist/bot.js. The spike keeps its own rules for the board; the two list the same legal moves
// in the same order (playtest/check.mjs), so a move found here is always legal there.
//
// Message in:  { id, level, config, start: [[square, piece]], startToMove, moves: [{ from, to }], board, toMove }
//              config holds the rule switches (the Water trial); start is the board when play began,
//              in the spike's form ({ o, wiz } or { o, els }), and moves are the moves since, so the
//              engine sees the same repetitions and move count. board and toMove are the position
//              now, used when the moves no longer replay (the Water rule changed mid-game).
// Message out: { id, move: { from, to } } or { id, error }
import * as E from '../packages/engine/src/index.ts';
import { careful, deep } from '../playtest/players.mjs';
import { WEIGHTS } from '../playtest/evaluate.mjs';

// Ratings from playtest/FINDINGS.md §10 (chess Elo scale, Careful = 1000) and time per move on a Mac.
const LEVELS = {
  easy: () => careful(),                                       // 1000, 5 ms
  medium: () => deep({ ...WEIGHTS.tuned, nodes: 2000 }),       // 1690, 7 ms
  hard: () => deep({ ...WEIGHTS.tuned, nodes: 20000 }),        // 1942, 62 ms
};
const players = {};

const side = o => (o === 'w' ? 'white' : 'black');
const piece = p => (p.wiz ? { owner: side(p.o), kind: 'wizard' }
  : { owner: side(p.o), kind: 'element', units: p.els.map(x => ({ element: x.e, size: x.s })) });

const fromBoard = (pieces, toMove, config) => E.startFromPosition(pieces.map(([s, p]) => [s, piece(p)]), { toMove: side(toMove), config });

self.onmessage = ({ data: { id, level, config, start, startToMove, moves, board, toMove } }) => {
  try {
    let game;
    try {
      game = fromBoard(start, startToMove, config);
      for (const m of moves) game = E.apply(game, m).state;
    } catch (e) {
      game = fromBoard(board.flatMap((p, s) => (p ? [[s, p]] : [])), toMove, config);
    }
    const player = players[level] ??= LEVELS[level]();
    const st = { game, turn: game.toMove[0] };
    const m = player.choose(st, E.legalActions(game), Math.random);
    self.postMessage({ id, move: { from: m.from, to: m.to } });
  } catch (e) {
    self.postMessage({ id, error: String(e && e.message || e) });
  }
};

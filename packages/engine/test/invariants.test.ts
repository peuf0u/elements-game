// Properties that must hold in every position (architecture research §9, "random playouts"):
// random games under every variant, checked after each move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFromFormations, PRESETS, legalActions, apply, positionOf, type RulesConfig } from '../src/index.ts';
import { Position, legalMoves, inCheck } from '../src/core.ts';

let seed = 1;
const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };

const VARIANTS: Array<Partial<RulesConfig>> = [{}, { exactRange: true }, { noWaterEdge: true }, { waterStraightCapture: true },
  { waterRiver: true }, { waterStraightSteps: true }, { waterRiver: true, waterStraightSteps: true }];

test('make + unmake restores the position, and the running hash matches a fresh one', () => {
  const moves = new Int32Array(512);
  for (const config of VARIANTS)
    for (let g = 0; g < 10; g++) {
      let st = startFromFormations(PRESETS.original, PRESETS.original, { config });
      while (st.phase === 'play') {
        const pos = positionOf(st), board = Array.from(pos.board), key = pos.key();
        const n = legalMoves(pos, moves);
        for (let i = 0; i < n; i++) {
          pos.make(moves[i]);
          const fresh = Position.from(pos.board, pos.side, pos.config);
          assert.equal(pos.key(), fresh.key());
          assert.deepEqual(Array.from(pos.capturers), Array.from(fresh.capturers));
          assert.ok(!inCheck(pos, pos.side ^ 1), 'a legal move never leaves the mover in check');
          pos.unmake();
        }
        assert.deepEqual(Array.from(pos.board), board);
        assert.equal(pos.key(), key);
        const actions = legalActions(st);
        assert.equal(actions.length, n);
        st = apply(st, actions[Math.floor(random() * actions.length)]).state;
      }
    }
});

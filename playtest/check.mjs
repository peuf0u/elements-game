// Checks that the engine (packages/engine) plays exactly the same game as the spike's rules: on
// every move of many random games, under each variant, the same legal moves in the same order and
// the same result, including the 75-move rule.
// Run: node check.mjs
import { Spike, setSpikeVariant } from './spike-rules.mjs';
import * as E from '../packages/engine/src/index.ts';
import { randomFormation, DEFAULT_FORMATION } from './formations.mjs';
import { rngFrom } from './game.mjs';

const VARIANTS = [{}, { exactRange: true }, { noWaterEdge: true }, { waterStraightCapture: true },
  { exactRange: true, noWaterEdge: true, waterStraightCapture: true }];
const toPiece = (owner, v) => (v === 'wizard' ? { owner, kind: 'wizard' } : { owner, kind: 'element', units: [{ element: v[0], size: v[1] }] });
const result = r => (r ? `${r.winner ?? 'draw'} ${r.reason}` : '');

let positions = 0, bad = 0;
for (const v of VARIANTS) {
  setSpikeVariant(v);
  for (let g = 0; g < 40; g++) {
    const rng = rngFrom(7000 + g);
    const wf = g % 2 ? randomFormation(rng) : DEFAULT_FORMATION, bf = g % 2 ? randomFormation(rng) : DEFAULT_FORMATION;
    const board = Array(81).fill(null), pieces = [];
    for (const [o, f] of [['w', wf], ['b', bf]])
      for (const [t, val] of Object.entries(f)) {
        const s = o === 'w' ? Spike.parse(t) : 80 - Spike.parse(t);
        board[s] = val === 'wizard' ? { o, wiz: true } : { o, els: [{ e: val[0], s: val[1] }] };
        pieces.push([s, toPiece(o === 'w' ? 'white' : 'black', val)]);
      }
    let a = Spike.fromPosition(board, 'w'), b = E.startFromPosition(pieces, { config: v });
    while (a.phase === 'play') {
      positions++;
      const ma = Spike.legalMoves(a), mb = E.legalActions(b);
      const la = ma.map(m => m.from + '-' + m.to).join(' '), lb = mb.map(m => m.from + '-' + m.to).join(' ');
      if (la !== lb) { bad++; if (bad < 5) console.log('MOVES DIFFER', JSON.stringify(v), 'game', g, 'move', a.ply, '\n spike: ', la, '\n engine:', lb); break; }
      const m = ma[Math.floor(rng() * ma.length)];
      a = Spike.makeMove(a, m);
      b = E.apply(b, { from: m.from, to: m.to }).state;
      const ra = result(a.result), rb = result(b.result && { winner: b.result.winner?.[0], reason: b.result.reason === 'moveLimit' ? 'fifty' : b.result.reason });
      if (ra !== rb) { bad++; if (bad < 5) console.log('RESULT DIFFERS', JSON.stringify(v), 'game', g, { spike: ra, engine: rb }); break; }
    }
  }
}
console.log(`${positions} positions compared, ${bad} differences`);
console.log(bad ? 'SOME FAILED' : 'ALL PASS');
process.exit(bad ? 1 : 0);

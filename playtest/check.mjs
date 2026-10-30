// Checks that the engine (packages/engine) plays exactly the same game as the spike's rules: on
// every move of many random games, under each variant, the same legal moves in the same order and
// the same result, including the move limit and repetition.
// Run: node check.mjs
import { Spike, setSpikeVariant } from './spike-rules.mjs';
import * as E from '../packages/engine/src/index.ts';
import { randomFormation, DEFAULT_FORMATION } from './formations.mjs';
import { rngFrom } from './game.mjs';

const VARIANTS = [{}, { exactRange: true }, { noWaterEdge: true }, { waterStraightCapture: true },
  { exactRange: true, noWaterEdge: true, waterStraightCapture: true },
  { waterRiver: true }, { waterStraightSteps: true }, { waterRiver: true, waterStraightSteps: true },
  { waterRiver: true, waterStraightSteps: true, exactRange: true, waterStraightCapture: true }, { waterRiver: true, noWaterEdge: true },
  { waterDiagonalBends: true }, { waterRiver: true, waterDiagonalBends: true },
  { waterOneWay: true }, { waterDiagonalBends: true, waterOneWay: true }, { waterRiver: true, waterDiagonalBends: true, waterOneWay: true },
  { waterStraightSteps: true, waterOneWay: true, exactRange: true }];
const toPiece = (owner, v) => (v === 'wizard' ? { owner, kind: 'wizard' } : { owner, kind: 'element', units: [{ element: v[0], size: v[1] }] });
const result = r => (r ? `${r.winner ?? 'draw'} ${r.reason}` : '');

let positions = 0, bad = 0, returns = 0;
// Each variant is written against the v0.2 Water rule; the engine's own default is v0.3. Each runs
// without castle return, and the v0.3 Water rule also with it (the v0.4 rules).
const CASTLE = { castleReturn: 'oncePerVisit', returnTo: 'castle' };
const V03 = { waterDiagonalBends: true, waterOneWay: true };
for (const v0 of [...VARIANTS.map(v => ({ castleReturn: 'off', ...v })), { ...V03, ...CASTLE }, { ...V03, ...CASTLE, exactRange: true }, CASTLE]) {
  const v = { waterDiagonalBends: false, waterOneWay: false, ...v0 };
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
      // a Wizard in the enemy castle brings a piece back half the time, so returns get tested
      const back = ma.filter(m => m.kind === 'return'), m = back.length && rng() < 0.5 ? back[Math.floor(rng() * back.length)] : ma[Math.floor(rng() * ma.length)];
      if (m.kind === 'return') returns++;
      a = Spike.makeMove(a, m);
      b = E.apply(b, { from: m.from, to: m.to }).state;
      const ra = result(a.result), rb = result(b.result && { winner: b.result.winner?.[0], reason: b.result.reason === 'moveLimit' ? 'fifty' : b.result.reason });
      if (ra !== rb) { bad++; if (bad < 5) console.log('RESULT DIFFERS', JSON.stringify(v), 'game', g, { spike: ra, engine: rb }); break; }
    }
  }
}
console.log(`${positions} positions compared, ${returns} pieces brought back, ${bad} differences`);
console.log(bad ? 'SOME FAILED' : 'ALL PASS');
process.exit(bad ? 1 : 0);

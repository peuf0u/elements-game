// Checks chess/rules.mjs against the standard perft totals (Chess Programming Wiki, "Perft Results":
// https://www.chessprogramming.org/Perft_Results). Run: node chess/perft.mjs
import { ChessPosition, legalMoves, START } from './rules.mjs';

const CASES = [
  ['start position', START, [20, 400, 8902, 197281]],
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
const bufs = Array.from({ length: 8 }, () => new Int32Array(256));
function perft(p, d) {
  if (d === 0) return 1;
  const n = legalMoves(p, bufs[d]);
  if (d === 1) return n;
  let t = 0;
  for (let i = 0; i < n; i++) { p.make(bufs[d][i]); t += perft(p, d - 1); p.unmake(); }
  return t;
}
let bad = 0;
for (const [name, fen, totals] of CASES) {
  const p = ChessPosition.fromFen(fen), got = totals.map((_, i) => perft(p, i + 1));
  const ok = got.join() === totals.join();
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', name, got.join(', '), ok ? '' : `expected ${totals.join(', ')}`);
}
console.log(bad ? 'SOME FAILED' : 'ALL PASS');
process.exit(bad ? 1 : 0);

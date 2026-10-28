// Learns chess piece values from finished games with the same method as tune.mjs for Elements, to
// check that the method finds the known answer (pawn 1, knight and bishop about 3, rook 5, queen 9).
// Run: node chess/tune.mjs <experiment> [tag regex]   (reads results/<experiment>.json)
import fs from 'node:fs';
import { fit } from '../tune.mjs';
import { rngFrom } from '../game.mjs';
import { ChessPosition, legalMoves, pseudoMoves, inCheck, moveText, START } from './rules.mjs';

export const FEATURES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'mobility'];
const buf = new Int32Array(256);
const mobility = (p, side) => { const s = p.side; p.side = side; const n = pseudoMoves(p, buf); p.side = s; return n; };

function features(p) {
  const f = new Float64Array(6);
  for (const pc of p.board) if (pc && (pc & 7) < 6) f[(pc & 7) - 1] += (pc >> 3) ? -1 : 1;
  f[5] = mobility(p, 0) - mobility(p, 1);
  return f;
}

// Positions from every game from move 5 on, skipping checks and positions right after a capture.
export function positions(records) {
  return records.map(rec => {
    const p = ChessPosition.fromFen(rec.config.fen ?? START), rows = [];
    // Handicap games start from another position; this tool expects full sets.
    rec.moves.forEach((text, i) => {
      const n = legalMoves(p, buf);
      let m = -1;
      for (let k = 0; k < n; k++) if (moveText(buf[k]) === text) { m = buf[k]; break; }
      const captured = p.make(m);
      if (i >= 8 && !captured && !inCheck(p)) rows.push(features(p));
    });
    return { rows, result: rec.winner === 'w' ? 1 : rec.winner === 'b' ? 0 : 0.5 };
  });
}

export function tune(records, samples = 30) {
  const games = positions(records.filter(r => !r.config.remove));
  const w = fit(games), rng = rngFrom(3);
  const boot = Array.from({ length: samples }, () => fit(games.map(() => games[Math.floor(rng() * games.length)])));
  const out = {};
  FEATURES.forEach((name, i) => {
    const d = boot.map(b => b[i] / b[0]).sort((x, y) => x - y);
    out[name] = { value: +(w[i] / w[0]).toFixed(2), range: [+d[Math.floor(samples * 0.05)].toFixed(2), +d[Math.floor(samples * 0.95)].toFixed(2)] };
  });
  return { games: games.length, positions: games.reduce((s, g) => s + g.rows.length, 0), weights: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [exp, tag] = process.argv.slice(2);
  let records = JSON.parse(fs.readFileSync(new URL(`../results/${exp}.json`, import.meta.url)));
  if (tag) records = records.filter(r => new RegExp(tag).test(r.config.tag));
  const t = tune(records);
  console.log(`${t.games} games, ${t.positions} positions. Weights in pawns (90% range):`);
  for (const [k, v] of Object.entries(t.weights)) console.log(`  ${k.padEnd(9)} ${String(v.value).padStart(6)}   ${v.range.join(' – ')}`);
}

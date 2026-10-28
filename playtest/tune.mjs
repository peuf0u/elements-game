// Learns piece values from game results ("Texel tuning", after the chess engine that made it popular):
// take positions from finished games, describe each by a few numbers (how many of each piece each
// side has, how mobile it is, ...), and find the weights that best predict who went on to win.
// The weights are a measured answer to "what is a Fire 3 worth compared to a Water 1?".
//
// Run: node tune.mjs <experiment> [tag regex]   (reads results/<experiment>.json)
// Positions are taken from every game from move 5 on, skipping positions where the side to move
// is in check or a capture was just made (the score of those depends on the next move).
// Games are resampled (bootstrap) for the uncertainty ranges, because positions from one game
// aren't independent.
import fs from 'node:fs';
import { DEFAULT_FORMATION } from './formations.mjs';
import { setVariant, startGame, positionOf } from './engine.mjs';
import { parseSquare } from '../packages/engine/src/index.ts';
import { pseudoMoves, inCheck, OWNER, IS_WIZARD, CAPTURER, N, fileOf, rankOf } from '../packages/engine/src/core.ts';
import { rngFrom } from './game.mjs';

const ELEMENTS = ['fire', 'wind', 'water', 'earth'];
// Features, each as White's count minus Black's.
export const FEATURES = [
  ...ELEMENTS.flatMap(e => [1, 2, 3].map(s => `${e}${s}`)), // pieces; a stack counts both of its units
  'mobility',        // moves available
  'wizard pressure', // capturing pieces within 3 squares of the enemy Wizard
  'stacks',          // combined pieces
];
const scratch = new Int32Array(512);
const dist = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

function features(pos) {
  const f = new Float64Array(FEATURES.length), b = pos.board;
  for (let s = 0; s < 81; s++) {
    const p = b[s];
    if (!p) continue;
    const sign = OWNER[p] === 0 ? 1 : -1;
    f[12] += sign * pseudoMoves(pos, s, scratch, 0);
    if (IS_WIZARD[p]) continue;
    f[((p >> 2) & 3) * 3 + ((p >> 4) & 3) - 1] += sign;
    if (p & 64) { f[((p >> 7) & 3) * 3 + ((p >> 9) & 3) - 1] += sign; f[14] += sign; }
    const ew = pos.wizard[OWNER[p] ^ 1];
    if (CAPTURER[p] && ew >= 0 && dist(s, ew) <= 3) f[13] += sign;
  }
  return f;
}

// Positions (features + White's result) from game records, grouped by game.
export function positions(records) {
  const games = [];
  for (const rec of records) {
    setVariant(rec.config);
    const result = rec.winner === 'w' ? 1 : rec.winner === 'b' ? 0 : 0.5;
    const pos = positionOf(startGame(rec.formations.w, rec.formations.b));
    const rows = [];
    rec.moves.forEach((mv, i) => {
      pos.make(parseSquare(mv.slice(0, 2)) | (parseSquare(mv.slice(3)) << 8));
      if (i < 8 || mv[2] === 'x' || inCheck(pos, pos.side)) return;
      rows.push(features(pos));
    });
    games.push({ rows, result });
  }
  return games;
}

// Logistic regression: P(White wins) = 1 / (1 + e^-(w · f)), a draw counting as half a win.
// Newton's method; a little ridge penalty keeps weights for rare pieces from running off.
export function fit(games) {
  const k = games.find(g => g.rows.length).rows[0].length, w = new Float64Array(k);
  for (let it = 0; it < 25; it++) {
    const g = new Float64Array(k), H = Array.from({ length: k }, () => new Float64Array(k));
    for (const { rows, result } of games)
      for (const f of rows) {
        let z = 0;
        for (let i = 0; i < k; i++) z += w[i] * f[i];
        const p = 1 / (1 + Math.exp(-z)), q = p * (1 - p);
        for (let i = 0; i < k; i++) {
          g[i] += (result - p) * f[i];
          for (let j = 0; j < k; j++) H[i][j] += q * f[i] * f[j];
        }
      }
    for (let i = 0; i < k; i++) { g[i] -= 1e-2 * w[i]; H[i][i] += 1e-2; }
    const step = solve(H, g);
    let size = 0;
    for (let i = 0; i < k; i++) { w[i] += step[i]; size = Math.max(size, Math.abs(step[i])); }
    if (size < 1e-6) break;
  }
  return w;
}

function solve(A, b) { // Gaussian elimination with partial pivoting
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
  }
  return x;
}

// Weights relative to the average attacking piece (Fire, Wind and Water, all sizes) = 1, with
// bootstrap ranges. raw keeps the fitted scale, for use as a bot's evaluation.
export function tune(records, { samples = 30 } = {}) {
  const games = positions(records);
  const unit = w => { const avg = w.slice(0, 9).reduce((a, b) => a + b, 0) / 9; return Array.from(w, x => x / avg); };
  const best = unit(fit(games));
  const rng = rngFrom(2);
  const boot = Array.from({ length: samples }, () => unit(fit(games.map(() => games[Math.floor(rng() * games.length)]))));
  const out = {};
  FEATURES.forEach((name, i) => {
    const d = boot.map(b => b[i]).sort((x, y) => x - y);
    out[name] = { value: +best[i].toFixed(2), range: [+d[Math.floor(samples * 0.05)].toFixed(2), +d[Math.floor(samples * 0.95)].toFixed(2)] };
  });
  return { positions: games.reduce((s, g) => s + g.rows.length, 0), games: games.length, weights: out, raw: Array.from(fit(games)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [exp, tag] = process.argv.slice(2);
  let records = JSON.parse(fs.readFileSync(new URL(`./results/${exp}.json`, import.meta.url)));
  if (tag) records = records.filter(r => new RegExp(tag).test(r.config.tag));
  const t = tune(records);
  console.log(`${t.games} games, ${t.positions} positions. Weights, average attacking piece = 1 (90% range):`);
  for (const [k, v] of Object.entries(t.weights)) console.log(`  ${k.padEnd(16)} ${String(v.value).padStart(6)}   ${v.range.join(' – ')}`);
}

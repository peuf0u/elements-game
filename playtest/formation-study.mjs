// What makes a formation strong? Many varied formations each play a fixed panel of opponents (the
// seven presets), then a fit finds which features of a formation predict its score.
// Run: node formation-study.mjs collect [scale]   (writes results/formation-study.json, ~25 min)
//      node formation-study.mjs fit               (prints the features that matter)
//
// The formation search (search.mjs) only saved its best formations, which all look alike, so it
// can't say what separates good from bad. This plays a spread on purpose: the presets, variations
// of them with 1 to 6 pieces moved, and fully random formations.
import fs from 'node:fs';
import { runGames } from './pool.mjs';
import { FIRST_PRESETS as PRESETS, randomFormation, mutate } from './formations.mjs';
import { rngFrom } from './game.mjs';
import { startGame, legalMoves } from './engine.mjs';

const BOT = { type: 'deep', nodes: 2000, weights: 'tuned' };
const FILE = new URL('./results/formation-study.json', import.meta.url);
const PANEL = Object.entries(PRESETS);
const ZONE = [];
for (const f of 'abcdefghi') for (const r of [1, 2, 3]) ZONE.push(f + r);
export const key = f => ZONE.map(s => (f[s] ? (f[s] === 'wizard' ? 'Z' : f[s][0][0] + f[s][1]) : '.')).join('');

// Plays each formation in list against the seven presets, n games per preset (half as White), and
// adds the results to it: games, points, draws, plies, and points against each preset (vs).
export async function playPanel(list, n, firstSeed, label = '') {
  let seed = firstSeed;
  const configs = list.flatMap((c, i) => PANEL.flatMap(([opp, of]) => Array.from({ length: n }, (_, g) => {
    const asWhite = g % 2 === 0;
    return { tag: `${i}`, opp, a: asWhite ? 'w' : 'b', seed: seed++, white: BOT, black: BOT, randomOpening: 2, maxPlies: 1000,
      whiteFormation: asWhite ? c.formation : of, blackFormation: asWhite ? of : c.formation };
  })));
  const t0 = Date.now();
  const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 1000 === 0 || d === t) console.log(`${label}${d}/${t} games, ${Math.round((Date.now() - t0) / 1000)}s`); } });
  for (const c of list) { c.games ??= 0; c.points ??= 0; c.draws ??= 0; c.plies ??= 0; c.vs ??= {}; }
  for (const r of recs) {
    const c = list[Number(r.config.tag)], p = r.winner === r.config.a ? 1 : r.winner ? 0 : 0.5;
    c.games++; c.points += p; c.plies += r.plies; if (!r.winner) c.draws++;
    c.vs[r.config.opp] = (c.vs[r.config.opp] ?? 0) + p;
  }
  return recs.length;
}

async function collect(scale) {
  const rng = rngFrom(20261030);
  const list = [], seen = new Set();
  const add = (source, formation) => { const k = key(formation); if (!seen.has(k)) { seen.add(k); list.push({ source, formation }); } };
  for (const [name, f] of PANEL) add(name, f);
  for (const [name, f] of PANEL) for (let i = 0; i < 50 * scale; i++) add(`${name}, ${1 + (i % 6)} moved`, mutate(f, 1 + (i % 6), rng));
  for (let i = 0; i < 200 * scale; i++) add('random', randomFormation(rng));

  await playPanel(list, 4, 3000000);
  fs.writeFileSync(FILE, JSON.stringify({ bot: BOT, panel: PANEL.map(([n]) => n), gamesEach: 4, formations: list }, null, 1));
  console.log(`${list.length} formations, ${list.length * PANEL.length * 4} games`);
}

// Features of a formation, all from White's side: row 1 is the back row, row 3 the front.
const at = s => ({ file: 'abcdefghi'.indexOf(s[0]), row: Number(s[1]) });
const centre = s => Math.abs(at(s).file - 4); // 0 on the e-file, 4 on the a- or i-file
const touching = (a, b) => a !== b && Math.abs(at(a).file - at(b).file) <= 1 && Math.abs(at(a).row - at(b).row) <= 1;
const mean = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
export function features(f) {
  const pieces = Object.entries(f).map(([s, v]) => ({ s, wiz: v === 'wizard', e: v === 'wizard' ? null : v[0], size: v === 'wizard' ? 0 : v[1] }));
  const wiz = pieces.find(p => p.wiz).s, of = e => pieces.filter(p => p.e === e);
  const one = (e, size) => pieces.find(p => p.e === e && p.size === size).s;
  const attackers = pieces.filter(p => p.e && p.e !== 'earth');
  const colour = s => (at(s).file + at(s).row) % 2;
  const windColours = of('wind').map(p => colour(p.s));
  const st = startGame(f, PRESETS.original), moves = legalMoves(st);
  return {
    'Wizard: row': at(wiz).row,
    'Wizard: files from centre': centre(wiz),
    'Wizard: own pieces touching': pieces.filter(p => touching(p.s, wiz)).length,
    'Wizard: Earth touching': of('earth').filter(p => touching(p.s, wiz)).length,
    'Wizard: Earth right in front': of('earth').filter(p => at(p.s).file === at(wiz).file && at(p.s).row === at(wiz).row + 1).length,
    'Fire: average row': mean(of('fire').map(p => at(p.s).row)),
    'Wind: average row': mean(of('wind').map(p => at(p.s).row)),
    'Water: average row': mean(of('water').map(p => at(p.s).row)),
    'Earth: average row': mean(of('earth').map(p => at(p.s).row)),
    'Fire: files from centre': mean(of('fire').map(p => centre(p.s))),
    'Wind: files from centre': mean(of('wind').map(p => centre(p.s))),
    'Water: files from centre': mean(of('water').map(p => centre(p.s))),
    'Earth: files from centre': mean(of('earth').map(p => centre(p.s))),
    'Fire 3: row': at(one('fire', 3)).row,
    'Wind 3: row': at(one('wind', 3)).row,
    'Water 3: row': at(one('water', 3)).row,
    'Earth 3: row': at(one('earth', 3)).row,
    'Winds on one colour': Math.max(...[0, 1].map(c => windColours.filter(x => x === c).length)),
    'Attackers on the front row': attackers.filter(p => at(p.s).row === 3).length,
    'Pieces on the flanks (a, b, h, i)': pieces.filter(p => centre(p.s) >= 3).length,
    'Water touching own Earth': of('water').filter(p => of('earth').some(q => touching(p.s, q.s))).length,
    'Moves at the start': moves.filter(m => m.kind === 'move').length,
    'Combines at the start': moves.filter(m => m.kind === 'combine').length,
  };
}

// Ridge regression on standardised features: how many score points one typical step of a feature
// is worth when the others stay the same. Five-fold cross-validation picks the strength of the
// ridge and says how much of the spread in scores the features explain.
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function ridge(X, y, lambda) {
  const d = X[0].length, A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? lambda : 0))), b = new Array(d).fill(0);
  for (let n = 0; n < X.length; n++) for (let i = 0; i < d; i++) { b[i] += X[n][i] * y[n]; for (let j = 0; j < d; j++) A[i][j] += X[n][i] * X[n][j]; }
  return solve(A, b);
}
function fitSet(rows, names) {
  const mu = names.map(n => mean(rows.map(r => r.x[n]))), sd = names.map((n, i) => Math.sqrt(mean(rows.map(r => (r.x[n] - mu[i]) ** 2))) || 1);
  const X = rows.map(r => names.map((n, i) => (r.x[n] - mu[i]) / sd[i])), y0 = mean(rows.map(r => r.y)), y = rows.map(r => r.y - y0);
  const r2 = lambda => { // out-of-sample share of variance explained
    let se = 0, st = 0;
    for (let k = 0; k < 5; k++) {
      const tr = X.map((x, i) => i).filter(i => i % 5 !== k), te = X.map((x, i) => i).filter(i => i % 5 === k);
      const ym = mean(tr.map(i => y[i])), w = ridge(tr.map(i => X[i]), tr.map(i => y[i] - ym), lambda);
      for (const i of te) { se += (y[i] - ym - X[i].reduce((s, v, j) => s + v * w[j], 0)) ** 2; st += (y[i] - ym) ** 2; }
    }
    return 1 - se / st;
  };
  const lambdas = [1, 3, 10, 30, 100, 300], best = lambdas.reduce((a, l) => (r2(l) > r2(a) ? l : a));
  const w = ridge(X, y, best);
  // The share of the spread that is just luck from playing only 28 games each.
  const noise = mean(rows.map(r => r.y * (1 - r.y) / r.games)), spread = mean(y.map(v => v * v));
  return { n: rows.length, mean: y0, sd: Math.sqrt(spread), lambda: best, r2: r2(best), ceiling: 1 - noise / spread,
    weights: names.map((n, i) => ({ feature: n, perStep: w[i], step: sd[i], average: mu[i] })).sort((a, b) => Math.abs(b.perStep) - Math.abs(a.perStep)) };
}

function fit() {
  const data = JSON.parse(fs.readFileSync(FILE));
  const rows = data.formations.map(c => ({ ...c, y: c.points / c.games, x: features(c.formation) }));
  const names = Object.keys(rows[0].x);
  const pct = v => `${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
  for (const [label, set] of [['All formations', rows], ['Near the presets (1–6 pieces moved)', rows.filter(r => r.source !== 'random')], ['Random formations', rows.filter(r => r.source === 'random')]]) {
    const m = fitSet(set, names);
    console.log(`\n${label}: ${m.n} formations, average score ${Math.round(100 * m.mean)}%, spread ±${Math.round(100 * m.sd)}`);
    console.log(`  explained out of sample: ${Math.round(100 * m.r2)}% (at most ${Math.round(100 * m.ceiling)}% is not luck)`);
    for (const w of m.weights) console.log(`  ${w.feature.padEnd(36)} ${pct(w.perStep).padStart(6)} points per ${w.step.toFixed(2)} (average ${w.average.toFixed(2)})`);
  }
  // Plain averages by value, for the features that matter most, among the formations near the presets.
  const near = rows.filter(r => r.source !== 'random');
  console.log('\nAverage score by value (near the presets):');
  for (const n of names) {
    const groups = {};
    for (const r of near) { const v = Math.round(r.x[n]); (groups[v] ??= []).push(r.y); }
    console.log(`  ${n.padEnd(36)} ` + Object.entries(groups).sort((a, b) => a[0] - b[0]).map(([v, ys]) => `${v}: ${Math.round(100 * mean(ys))}% (${ys.length})`).join('   '));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd = 'fit', scale = '1'] = process.argv.slice(2);
  if (cmd === 'collect') await collect(Number(scale)); else fit();
}

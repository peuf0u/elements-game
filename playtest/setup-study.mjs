// The setup phase: does seeing the other side's formation help you choose your own? If the best
// formation is the same whatever the opponent shows, placing pieces one at a time in the open
// (GAME_SPEC §6) adds turns but no decisions. If formations counter each other, it matters.
// Run: node setup-study.mjs matrix          (from games already played; prints and saves in seconds)
//      node setup-study.mjs counter [scale] [target] (new games, rules v0.3: about 1½ hours on 14 cores, 30 min for one target)
// Both write their part of results/setup-study.summary.json.
//
// matrix: in the presets' round robins and the formation study, is a formation's score against each
// opponent just its overall strength (plus luck), or does it depend on the opponent? A model with
// one strength per formation is fitted; what it leaves unexplained, beyond what luck gives, is the
// part that depends on the opponent ("counter spread").
// counter: the most a player could gain by seeing everything. Start from Wind 3 held back, the
// default, and let a search move up to three pieces to beat one target formation, keeping each
// step's best. Then fresh games measure, against the target and against the other presets, the
// default and each step's counter. A real counter gains against its target and not against the rest.
import fs from 'node:fs';
import { runGames } from './pool.mjs';
import { PRESETS, FIRST_PRESETS } from './formations.mjs';
import { key } from './formation-study.mjs';
import { V03 } from './engine.mjs';
import { interval } from './stats.mjs';

const FILE = new URL('./results/setup-study.summary.json', import.meta.url);
const load = name => JSON.parse(fs.readFileSync(new URL(`./results/${name}.json`, import.meta.url)));
const save = part => {
  const all = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {};
  Object.assign(all, part);
  fs.writeFileSync(FILE, JSON.stringify(all, null, 1));
};
const ZONE = [];
for (const f of 'abcdefghi') for (const r of [1, 2, 3]) ZONE.push(f + r);
const pts = (r, side) => (r.winner === side ? 1 : r.winner ? 0 : 0.5);
const r1 = x => Math.round(10 * x) / 10;

// cells[i][j] = { points, games, draws } for row formation i against opponent j, from i's side.
// Fits score ≈ strength[i] − weakness[j] (on the logistic scale, as ratings do), then compares the
// leftover differences with the spread luck alone would give in cells of that many games.
function counterSpread(cells, rows, cols) {
  const lg = p => Math.log(p / (1 - p)), ex = x => 1 / (1 + Math.exp(-x));
  const a = Array(rows).fill(0), b = Array(cols).fill(0);
  for (let it = 0; it < 2000; it++) { // fit by gradient steps on the squared error of the scores
    const ga = Array(rows).fill(0), gb = Array(cols).fill(0);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const c = cells[i][j]; if (!c?.games) continue;
      const p = ex(a[i] - b[j]), e = (c.points / c.games - p) * p * (1 - p) * c.games;
      ga[i] += e; gb[j] -= e;
    }
    for (let i = 0; i < rows; i++) a[i] += 0.05 * ga[i] / cols;
    for (let j = 0; j < cols; j++) b[j] += 0.05 * gb[j] / rows;
  }
  let resid = 0, noise = 0, n = 0;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const c = cells[i][j]; if (!c?.games) continue;
    const q = ex(a[i] - b[j]), d = c.points / c.games - q, dr = c.draws / c.games;
    resid += d * d;
    noise += (q - dr / 4 - q * q) / c.games; // luck: a game scores 1, ½ or 0, so its spread is q − draws/4 − q²
    n++;
  }
  const params = rows + cols - 1, leftover = resid / n, luck = noise / n * (n - params) / n;
  return {
    cells: n, gamesPerCell: r1(cells.flat().filter(c => c?.games).reduce((s, c) => s + c.games, 0) / n),
    leftoverSpread: r1(100 * Math.sqrt(leftover)), luckSpread: r1(100 * Math.sqrt(luck)),
    // the part that depends on the opponent: points by which a formation's score against one
    // opponent typically differs from what its overall strength predicts
    counterSpread: r1(100 * Math.sqrt(Math.max(0, leftover - luck))),
    strengthSpread: r1(100 * sd(a.map(x => ex(x - mean(b))))),
  };
}
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))); };

function presetCells(records) {
  const names = Object.keys(FIRST_PRESETS), ix = Object.fromEntries(names.map((n, i) => [n, i]));
  const cells = names.map(() => names.map(() => null));
  for (const r of records) {
    const { w, b } = r.config.labels, pw = pts(r, 'w');
    for (const [me, opp, p] of [[w, b, pw], [b, w, 1 - pw]]) {
      const c = (cells[ix[me]][ix[opp]] ??= { points: 0, games: 0, draws: 0 });
      c.points += p; c.games++; if (!r.winner) c.draws++;
    }
  }
  return { cells, names };
}

function matrix() {
  const out = {};
  for (const [name, rules] of [['presetsV03', 'v0.3, Deep 2k'], ['presets2k', 'v0.2, Deep 2k'], ['presets20k', 'v0.2, Deep 20k']]) {
    const { cells, names } = presetCells(load(name));
    out[name] = { rules, ...counterSpread(cells, names.length, names.length) };
  }
  // The formation study: 554 formations × the seven presets, 4 games each (v0.2, Deep 2k). Only the
  // totals per cell were saved, so each cell's draws are taken from the formation's overall draw rate.
  const fs554 = load('formation-study').formations, opps = Object.keys(FIRST_PRESETS);
  const cells = fs554.map(f => opps.map(o => ({ points: f.vs[o] ?? 0, games: 4, draws: 4 * f.draws / f.games })));
  out.formationStudy = { rules: 'v0.2, Deep 2k', ...counterSpread(cells, fs554.length, opps.length) };
  save({ matrix: out });
  console.log(JSON.stringify(out, null, 1));
}

// ── counter ──
const BOT = { type: 'deep', nodes: 2000, weights: 'tuned' };
const RO = { randomOpening: 2, maxPlies: 1000, ...V03 };
const S = Number(process.argv[3] ?? 1); // below 1: a quick try with one target, one step and fewer games
const ALL_TARGETS = ['windHeldBack', 'fireForward', 'wizardForward'];
const TARGETS = process.argv[4] ? [process.argv[4]] : ALL_TARGETS.slice(0, S < 1 ? 1 : 3); // or just the one named
const BASE = PRESETS.windHeldBack;
const n = x => Math.max(2, 2 * Math.round(x * S / 2));
const SCREEN = n(16), REFINE = n(48), TOP = 8, STEPS = S < 1 ? 1 : 3, FRESH = n(400), PANEL = n(60);
let seed;

// Every formation one move away: a piece to another square of the zone, swapping if it's taken.
function neighbours(f) {
  const seen = new Set([key(f)]), out = [];
  for (const from of Object.keys(f)) for (const to of ZONE) {
    if (to === from) continue;
    const g = { ...f }, moving = g[from];
    if (g[to]) g[from] = g[to]; else delete g[from];
    g[to] = moving;
    const k = key(g);
    if (!seen.has(k)) { seen.add(k); out.push(g); }
  }
  return out;
}

// n games of each formation against opp, alternating colours; returns points per formation.
async function play(list, opp, n, label) {
  const configs = list.flatMap((f, i) => Array.from({ length: n }, (_, g) => {
    const asWhite = g % 2 === 0;
    return { tag: String(i), a: asWhite ? 'w' : 'b', seed: seed++, white: BOT, black: BOT,
      whiteFormation: asWhite ? f : opp, blackFormation: asWhite ? opp : f, ...RO };
  }));
  const t0 = Date.now();
  const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 2000 === 0 || d === t) console.log(`  ${label}: ${d}/${t}, ${Math.round((Date.now() - t0) / 1000)}s`); } });
  const res = list.map(() => ({ points: 0, games: 0, draws: 0 }));
  for (const r of recs) { const c = res[Number(r.config.tag)]; c.points += pts(r, r.config.a); c.games++; if (!r.winner) c.draws++; }
  return res;
}
const pct = c => Math.round(100 * c.points / c.games);
const moved = (a, b) => ZONE.filter(s => JSON.stringify(a[s]) !== JSON.stringify(b[s])).map(s => `${s}:${b[s] ? (b[s] === 'wizard' ? 'Z' : b[s][0][0].toUpperCase() + b[s][1]) : '·'}`);

async function counter() {
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)).counter : null;
  const out = { ...old, bot: BOT, rules: 'v0.3', base: 'windHeldBack', targets: { ...old?.targets } };
  for (const t of TARGETS) {
    seed = 5000000 + 1000000 * ALL_TARGETS.indexOf(t); // each target its own seeds, so one can be rerun alone
    const target = PRESETS[t], steps = [];
    if (!target) throw new Error(`no preset called ${t}`);
    let current = BASE;
    for (let step = 1; step <= STEPS; step++) {
      const cands = neighbours(current);
      const first = await play(cands, target, SCREEN, `${t}, step ${step}, ${cands.length} candidates`);
      const top = cands.map((f, i) => ({ f, ...first[i] })).sort((x, y) => y.points - x.points).slice(0, TOP);
      const more = await play(top.map(c => c.f), target, REFINE, `${t}, step ${step}, top ${TOP}`);
      top.forEach((c, i) => { c.points += more[i].points; c.games += more[i].games; });
      top.sort((x, y) => y.points / y.games - x.points / x.games);
      current = top[0].f;
      steps.push({ formation: current, searchScore: pct(top[0]) });
      console.log(`${t}, step ${step}: ${pct(top[0])}% in the search`);
    }
    // Fresh games: against the target, and against the other six presets.
    const list = [BASE, ...steps.map(s => s.formation)];
    const vsTarget = await play(list, target, FRESH, `${t}, fresh v target`);
    const others = Object.entries(FIRST_PRESETS).filter(([n]) => n !== t);
    const vsOthers = list.map(() => ({ points: 0, games: 0, draws: 0 }));
    for (const [n, f] of others) (await play(list, f, PANEL, `${t}, fresh v ${n}`)).forEach((c, i) => {
      vsOthers[i].points += c.points; vsOthers[i].games += c.games; vsOthers[i].draws += c.draws;
    });
    out.targets[t] = list.map((f, i) => ({
      piecesMoved: i, moves: moved(BASE, f), formation: f, searchScore: i ? steps[i - 1].searchScore : null,
      vsTarget: pct(vsTarget[i]), vsTargetRange: interval(vsTarget[i].points / vsTarget[i].games, vsTarget[i].games), vsTargetDraws: Math.round(100 * vsTarget[i].draws / vsTarget[i].games),
      vsOthers: pct(vsOthers[i]), vsOthersRange: interval(vsOthers[i].points / vsOthers[i].games, vsOthers[i].games),
    }));
    save({ counter: out });
    console.log(t, JSON.stringify(out.targets[t].map(({ formation, ...x }) => x)));
  }
}

const cmd = process.argv[2];
if (cmd === 'matrix') matrix();
else if (cmd === 'counter') await counter();
else console.log('node setup-study.mjs matrix | counter');

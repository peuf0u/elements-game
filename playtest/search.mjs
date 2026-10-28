// Searches for good starting formations: try many against the default formation, keep the best,
// make small changes to them, repeat; then play the finalists against each other.
// Run: node search.mjs [scale]   (writes results/formation-search.json). Games stop at 300 moves each and count as a draw.
import fs from 'node:fs';
import { runGames } from './pool.mjs';
import { DEFAULT_FORMATION, randomFormation } from './formations.mjs';
import { rngFrom } from './game.mjs';

const scale = Number(process.argv[2] ?? 1);
const GAMES = Math.round(30 * scale);        // games per candidate per round
const FINAL_GAMES = Math.round(150 * scale); // total games for each finalist
const RR_GAMES = Math.round(40 * scale);     // games per pair in the round robin
const ROUNDS = 3, KEEP = 8, FINALISTS = 10, SET = 6;
const rng = rngFrom(20261028);
let seed = 500000;

const ZONE = [];
for (const f of 'abcdefghi') for (const r of [1, 2, 3]) ZONE.push(f + r);
const key = f => ZONE.map(s => (f[s] === 'wizard' ? 'Z' : f[s] ? f[s][0][0] + f[s][1] : '.')).join('');
const pick = xs => xs[Math.floor(rng() * xs.length)];

// One small change: move a piece to another square of the zone, swapping if that square is taken.
function mutate(f, changes = 1 + Math.floor(rng() * 2)) {
  const g = { ...f };
  for (let i = 0; i < changes; i++) {
    const from = pick(Object.keys(g)), to = pick(ZONE.filter(s => s !== from));
    const moving = g[from];
    if (g[to]) g[from] = g[to]; else delete g[from];
    g[to] = moving;
  }
  return g;
}

// Hand-made starting points: the default formation's pieces with Fire moved to the front row.
const F = (e, s) => [e, s];
const HAND = {
  'fire front, earth back': { b3: F('wind', 3), c3: F('fire', 3), e3: F('earth', 3), g3: F('fire', 2), h3: F('wind', 2), c2: F('water', 1), d2: F('wind', 1), e2: F('water', 2), f2: F('fire', 1), g2: F('water', 3), d1: F('earth', 1), e1: 'wizard', f1: F('earth', 2) },
  'fire front, centre waters': { b3: F('fire', 3), c3: F('wind', 3), d3: F('water', 2), e3: F('earth', 3), f3: F('water', 3), g3: F('wind', 2), h3: F('fire', 2), d2: F('wind', 1), e2: F('water', 1), f2: F('fire', 1), d1: F('earth', 1), e1: 'wizard', f1: F('earth', 2) },
  'fire on the flanks': { a3: F('fire', 3), i3: F('fire', 2), b3: F('wind', 3), h3: F('wind', 2), c3: F('earth', 1), g3: F('earth', 2), e3: F('earth', 3), c2: F('water', 1), d2: F('wind', 1), e2: F('water', 2), f2: F('fire', 1), g2: F('water', 3), e1: 'wizard' },
};

const cands = new Map(); // key → { name, formation, games, points, fireCaps, rounds }
function add(name, formation) {
  const k = key(formation);
  if (!cands.has(k)) cands.set(k, { name, formation, games: 0, points: 0, fireCaps: 0, waterCaps: 0, key: k });
}
const score = c => (c.games ? c.points / c.games : 0);

// Play n more games of each candidate against the default formation (alternating colours) and add them up.
// n is a number, or a function of the candidate.
async function evaluate(list, n, label) {
  const configs = list.flatMap(c => Array.from({ length: typeof n === 'function' ? n(c) : n }, (_, i) => {
    const aWhite = i % 2 === 0;
    return {
      tag: c.key, a: aWhite ? 'w' : 'b', seed: seed++, white: { type: 'careful' }, black: { type: 'careful' }, maxPlies: 600,
      whiteFormation: aWhite ? c.formation : DEFAULT_FORMATION, blackFormation: aWhite ? DEFAULT_FORMATION : c.formation,
    };
  }));
  const t0 = Date.now();
  const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 200 === 0 || d === t) console.log(`  ${label}: ${d}/${t} games, ${Math.round((Date.now() - t0) / 1000)}s`); } });
  for (const r of recs) {
    const c = cands.get(r.config.tag);
    c.games++;
    c.points += r.winner === r.config.a ? 1 : r.winner ? 0 : 0.5;
    for (const cap of r.captures) if (cap.by === r.config.a) {
      if (cap.with.includes('fire')) c.fireCaps++;
      if (cap.with.includes('water')) c.waterCaps++;
    }
  }
}

const out = { scale, rounds: [], finalists: [], roundRobin: null };
const save = () => fs.writeFileSync(new URL('./results/formation-search.json', import.meta.url), JSON.stringify(out, null, 1));
const brief = c => ({ name: c.name, score: Math.round(100 * score(c)), games: c.games, fireCapturesPerGame: +(c.fireCaps / c.games).toFixed(2), waterCapturesPerGame: +(c.waterCaps / c.games).toFixed(2), formation: c.formation });

// Round 0: variations of the default, random formations, and the hand-made ones (plus variations).
for (let i = 0; i < 12; i++) add('default, varied', mutate(DEFAULT_FORMATION));
for (let i = 0; i < 15; i++) add('random', randomFormation(rng));
for (const [name, f] of Object.entries(HAND)) { add(name, f); add(name + ', varied', mutate(f)); add(name + ', varied', mutate(f)); }

for (let round = 0; round < ROUNDS; round++) {
  const fresh = [...cands.values()].filter(c => c.games === 0);
  const parents = [...cands.values()].filter(c => c.games > 0);
  console.log(`Round ${round + 1}: ${fresh.length} new formations, ${parents.length} kept from before`);
  await evaluate([...fresh, ...parents], GAMES, `round ${round + 1}`);
  const ranked = [...cands.values()].sort((a, b) => score(b) - score(a));
  out.rounds.push(ranked.slice(0, 15).map(brief));
  save();
  // Keep the best, drop the rest, and breed variations of the best for the next round.
  const keep = ranked.slice(0, KEEP);
  for (const c of ranked.slice(KEEP)) cands.delete(c.key);
  if (round < ROUNDS - 1) for (const c of keep) for (let j = 0; j < 4; j++) add(c.name.replace(/(, varied)+$/, '') + ', varied', mutate(c.formation, 1));
}

// Finalists: top by score so far, topped up to FINAL_GAMES games each.
const finalists = [...cands.values()].sort((a, b) => score(b) - score(a)).slice(0, FINALISTS);
await evaluate(finalists, c => Math.max(0, FINAL_GAMES - c.games), 'finalists');
finalists.sort((a, b) => score(b) - score(a));
out.finalists = finalists.map(brief);
save();

// Round robin among the best SET finalists plus the default formation.
const set = [{ name: 'default', formation: DEFAULT_FORMATION, key: 'default' }, ...finalists.slice(0, SET)];
const configs = [];
for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++)
  for (let g = 0; g < RR_GAMES; g++) {
    const iWhite = g % 2 === 0, A = set[i], B = set[j];
    configs.push({ tag: `${i}:${j}`, a: iWhite ? 'w' : 'b', seed: seed++, white: { type: 'careful' }, black: { type: 'careful' }, maxPlies: 600,
      whiteFormation: iWhite ? A.formation : B.formation, blackFormation: iWhite ? B.formation : A.formation });
  }
const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 200 === 0 || d === t) console.log(`  round robin: ${d}/${t}`); } });
const table = set.map(() => set.map(() => ({ points: 0, games: 0 })));
for (const r of recs) {
  const [i, j] = r.config.tag.split(':').map(Number);
  const p = r.winner === r.config.a ? 1 : r.winner ? 0 : 0.5;
  table[i][j].points += p; table[i][j].games++;
  table[j][i].points += 1 - p; table[j][i].games++;
}
out.roundRobin = {
  names: set.map((c, i) => (i === 0 ? 'default' : `#${i} ${c.name}`)),
  formations: set.map(c => c.formation),
  // score of the row formation against the column formation, in %
  table: table.map(row => row.map(c => (c.games ? Math.round(100 * c.points / c.games) : null))),
  overall: table.map(row => Math.round(100 * row.reduce((s, c) => s + c.points, 0) / Math.max(1, row.reduce((s, c) => s + c.games, 0)))),
};
save();
console.log(JSON.stringify({ finalists: out.finalists.map(({ formation, ...x }) => x), roundRobin: { names: out.roundRobin.names, overall: out.roundRobin.overall, table: out.roundRobin.table } }, null, 1));

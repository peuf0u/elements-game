// Searches for a set of good starting formations. Many formations play many games; the best are
// kept, varied a little, and tried again for a few rounds; then the finalists play each other.
// Run: node search.mjs [scale]       (writes results/formation-search-deep.json)
//      node search.mjs [scale] v03   (rules v0.3: writes results/formation-search-v03.json)
//
// Second version (2026-10-28), after the first found nothing better than the default with weak bots:
//   - Played by Deep 2k with learned values, under the 75-move rule.
//   - A league instead of one opponent: each round, every candidate plays the default formation and
//     the two best formations of the previous round, so a formation that only counters the default
//     doesn't rise.
//   - Diversity: the formations kept, and the finalists, differ from each other by at least
//     MIN_APART pieces, so the result is a list of real choices, not ten copies of one idea.
// The first version's results are in results/formation-search.json.
//
// v03 (2026-10-28): the same search under rules v0.3 (Water bends diagonally, one way per move).
// The app's default, Wind 3 held back, takes the place of the designer's original formation, and
// the presets and variations of them join the starting points.
import fs from 'node:fs';
import { runGames } from './pool.mjs';
import { DEFAULT_FORMATION as ORIGINAL, FIRST_PRESETS as PRESETS, randomFormation, FIRE_FORWARD, FIRE_FORWARD_2 } from './formations.mjs';
import { V03 } from './engine.mjs';
import { rngFrom } from './game.mjs';

const scale = Number(process.argv[2] ?? 1);
const v03 = process.argv[3] === 'v03', RULES = v03 ? V03 : {};
const DEFAULT_FORMATION = v03 ? PRESETS.windHeldBack : ORIGINAL; // the league's fixed member
const BOT = { type: 'deep', nodes: 2000, weights: 'tuned' };
const GAMES = Math.round(40 * scale);        // games per candidate per round
const FINAL_GAMES = Math.round(200 * scale); // total games for each finalist
const RR_GAMES = Math.round(60 * scale);     // games per pair in the round robin
const ROUNDS = 5, KEEP = 10, FINALISTS = 12, SET = 8, MIN_APART = 3;
const rng = rngFrom(20261029);
let seed = 900000;

const ZONE = [];
for (const f of 'abcdefghi') for (const r of [1, 2, 3]) ZONE.push(f + r);
const id = v => (v === 'wizard' ? 'Z' : v[0][0] + v[1]);
const key = f => ZONE.map(s => (f[s] ? id(f[s]) : '.')).join('');
const pick = xs => xs[Math.floor(rng() * xs.length)];
// How many of the 13 pieces stand on a different square in b than in a.
function apart(a, b) {
  const at = f => Object.fromEntries(Object.entries(f).map(([s, v]) => [id(v), s]));
  const pa = at(a), pb = at(b);
  return Object.keys(pa).filter(k => pa[k] !== pb[k]).length;
}

// Small changes: move a piece to another square of the zone, swapping if that square is taken.
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
const mirrorFiles = f => Object.fromEntries(Object.entries(f).map(([s, v]) => ['abcdefghi'['abcdefghi'.length - 1 - 'abcdefghi'.indexOf(s[0])] + s[1], v]));

// Hand-made starting points from the first search: the default formation's pieces with Fire moved forward.
const F = (e, s) => [e, s];
const HAND = {
  'fire front, centre waters': { b3: F('fire', 3), c3: F('wind', 3), d3: F('water', 2), e3: F('earth', 3), f3: F('water', 3), g3: F('wind', 2), h3: F('fire', 2), d2: F('wind', 1), e2: F('water', 1), f2: F('fire', 1), d1: F('earth', 1), e1: 'wizard', f1: F('earth', 2) },
  'fire on the flanks': { a3: F('fire', 3), i3: F('fire', 2), b3: F('wind', 3), h3: F('wind', 2), c3: F('earth', 1), g3: F('earth', 2), e3: F('earth', 3), c2: F('water', 1), d2: F('wind', 1), e2: F('water', 2), f2: F('fire', 1), g2: F('water', 3), e1: 'wizard' },
};

const cands = new Map(); // key → { name, formation, games, points, ... }
function add(name, formation) {
  const k = key(formation);
  if (k !== key(DEFAULT_FORMATION) && !cands.has(k))
    cands.set(k, { name, formation, games: 0, points: 0, fireCaps: 0, waterCaps: 0, plies: 0, key: k });
}
const score = c => (c.games ? c.points / c.games : 0);

// Plays n more games of each candidate, spread evenly over the opponents, alternating colours.
async function evaluate(list, n, opponents, label) {
  const configs = list.flatMap(c => {
    const opps = opponents.filter(o => o.key !== c.key); // a league member doesn't play itself
    return Array.from({ length: typeof n === 'function' ? n(c) : n }, (_, i) => {
    const aWhite = i % 2 === 0, opp = opps[Math.floor(i / 2) % opps.length]; // both colours against each opponent in turn
    return {
      tag: c.key, a: aWhite ? 'w' : 'b', seed: seed++, white: BOT, black: BOT, randomOpening: 2, maxPlies: 1000,
      whiteFormation: aWhite ? c.formation : opp.formation, blackFormation: aWhite ? opp.formation : c.formation, ...RULES,
    };
    });
  });
  const t0 = Date.now();
  const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 500 === 0 || d === t) console.log(`  ${label}: ${d}/${t} games, ${Math.round((Date.now() - t0) / 1000)}s`); } });
  for (const r of recs) {
    const c = cands.get(r.config.tag);
    c.games++; c.plies += r.plies;
    c.points += r.winner === r.config.a ? 1 : r.winner ? 0 : 0.5;
    for (const cap of r.captures) if (cap.by === r.config.a) {
      if (cap.with.includes('fire')) c.fireCaps++;
      if (cap.with.includes('water')) c.waterCaps++;
    }
  }
}

// The best of a ranked list that are at least MIN_APART pieces apart from each other.
function diverse(ranked, n) {
  const out = [];
  for (const c of ranked) {
    if (out.length >= n) break;
    if (out.every(o => apart(o.formation, c.formation) >= MIN_APART)) out.push(c);
  }
  return out;
}

const out = { scale, bot: BOT, rules: v03 ? 'v0.3' : 'v0.2', rounds: [], finalists: [], roundRobin: null };
const file = new URL(v03 ? './results/formation-search-v03.json' : './results/formation-search-deep.json', import.meta.url);
const save = () => fs.writeFileSync(file, JSON.stringify(out, null, 1));
const brief = c => ({
  name: c.name, score: Math.round(100 * score(c)), games: c.games, apartFromDefault: apart(DEFAULT_FORMATION, c.formation),
  movesPerGame: Math.round(c.plies / c.games / 2), fireCapturesPerGame: +(c.fireCaps / c.games).toFixed(2), waterCapturesPerGame: +(c.waterCaps / c.games).toFixed(2),
  formation: c.formation,
});

// Round 1 starting points.
for (let i = 0; i < 20; i++) add('default, varied', mutate(DEFAULT_FORMATION, 1 + (i % 4))); // 1 to 4 changes
add('default, mirrored', mirrorFiles(DEFAULT_FORMATION));
for (let i = 0; i < 3; i++) add('default, mirrored, varied', mutate(mirrorFiles(DEFAULT_FORMATION), 2));
for (let i = 0; i < 16; i++) add('random', randomFormation(rng));
for (const [name, f] of Object.entries(HAND)) { add(name, f); add(name + ', varied', mutate(f, 2)); }
add('fire forward (first search)', FIRE_FORWARD);
add('fire forward 2 (first search)', FIRE_FORWARD_2);
if (v03) for (const [name, f] of Object.entries(PRESETS)) { add(name, f); for (let i = 0; i < 3; i++) add(name + ', varied', mutate(f, 1 + i)); }

const DEFAULT = { key: key(DEFAULT_FORMATION), formation: DEFAULT_FORMATION };
let league = v03 ? [DEFAULT, ...['mirrored', 'fireBeforeWizard'].map(n => ({ key: key(PRESETS[n]), formation: PRESETS[n] }))]
  : [DEFAULT, { key: key(FIRE_FORWARD), formation: FIRE_FORWARD }, { key: key(FIRE_FORWARD_2), formation: FIRE_FORWARD_2 }];
for (let round = 0; round < ROUNDS; round++) {
  const all = [...cands.values()];
  console.log(`Round ${round + 1}: ${all.filter(c => !c.games).length} new formations, ${all.filter(c => c.games).length} kept`);
  await evaluate(all, GAMES, league, `round ${round + 1}`);
  const ranked = [...cands.values()].sort((a, b) => score(b) - score(a));
  out.rounds.push(ranked.slice(0, 15).map(brief));
  save();
  // Keep a diverse set of the best, drop the rest, and breed variations of the kept ones.
  const keep = diverse(ranked, KEEP);
  for (const c of ranked) if (!keep.includes(c)) cands.delete(c.key);
  league = [DEFAULT, ...keep.slice(0, 2)];
  if (round < ROUNDS - 1) for (const c of keep) for (let j = 0; j < 4; j++) add(c.name.replace(/(, varied)+$/, '') + ', varied', mutate(c.formation));
}

// Finalists: a diverse set of the best, topped up to FINAL_GAMES games each against the league.
const finalists = diverse([...cands.values()].sort((a, b) => score(b) - score(a)), FINALISTS);
await evaluate(finalists, c => Math.max(0, FINAL_GAMES - c.games), league, 'finalists');
finalists.sort((a, b) => score(b) - score(a));
out.finalists = finalists.map(brief);
save();

// Round robin among the best SET finalists plus the default formation.
const set = [{ name: 'default', formation: DEFAULT_FORMATION, key: 'default' }, ...finalists.slice(0, SET)];
const configs = [];
for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++)
  for (let g = 0; g < RR_GAMES; g++) {
    const iWhite = g % 2 === 0, A = set[i], B = set[j];
    configs.push({ tag: `${i}:${j}`, a: iWhite ? 'w' : 'b', seed: seed++, white: BOT, black: BOT, randomOpening: 2, maxPlies: 1000,
      whiteFormation: iWhite ? A.formation : B.formation, blackFormation: iWhite ? B.formation : A.formation, ...RULES });
  }
const recs = await runGames(configs, { onProgress: (d, t) => { if (d % 500 === 0 || d === t) console.log(`  round robin: ${d}/${t}`); } });
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
  games: table.map(row => row.reduce((s, c) => s + c.games, 0)),
};
save();
console.log(JSON.stringify({ finalists: out.finalists.map(({ formation, ...x }) => x), roundRobin: { names: out.roundRobin.names, overall: out.roundRobin.overall } }, null, 1));

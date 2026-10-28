// A catalogue of strong formations in different styles: a quality-diversity search ("MAP-Elites").
// Every formation falls into one style cell by two traits. The search keeps the strongest
// formation found in each cell and breeds new candidates from the cells' best, so it ends with
// one strong formation per style instead of many copies of the single best.
// Run: node catalogue.mjs [scale]   (writes results/catalogue.json, about an hour)
//
// Scores are against the seven presets, as in formation-study.mjs, whose 554 scored formations
// fill the cells to start with. A newcomer that beats a cell's best on its first 28 games plays
// 28 more before it may take the cell, and at the end each cell's best plays 140 fresh games, so
// the scores reported aren't inflated by lucky streaks.
import fs from 'node:fs';
import { playPanel, key } from './formation-study.mjs';
import { mutate } from './formations.mjs';
import { rngFrom } from './game.mjs';

const scale = Number(process.argv[2] ?? 1);
const BATCHES = Math.round(20 * scale), CHILDREN = 56, FIRST = 4, CHECK = 4, FINAL = 20; // games per preset
const rng = rngFrom(20261031);
const FILE = new URL('./results/catalogue.json', import.meta.url);

// The two traits, from White's side: row 1 is the back row.
const at = s => ({ file: 'abcdefghi'.indexOf(s[0]), row: Number(s[1]) });
export const TRAITS = {
  attack: { name: 'How far forward the attackers stand', values: ['held back', 'low', 'middle', 'forward'],
    of(f) { // average row of the nine Fire, Wind and Water pieces
      const rows = Object.entries(f).filter(([, v]) => v !== 'wizard' && v[0] !== 'earth').map(([s]) => at(s).row);
      const m = rows.reduce((a, b) => a + b, 0) / rows.length;
      return m < 1.67 ? 'held back' : m < 2 ? 'low' : m < 2.34 ? 'middle' : 'forward';
    } },
  wizard: { name: 'Where the Wizard stands', values: ['back, centre', 'back, wing', 'middle row', 'front row'],
    of(f) {
      const w = at(Object.keys(f).find(s => f[s] === 'wizard'));
      return w.row === 3 ? 'front row' : w.row === 2 ? 'middle row' : Math.abs(w.file - 4) >= 3 ? 'back, wing' : 'back, centre';
    } },
};
const cellOf = f => `${TRAITS.attack.of(f)} / ${TRAITS.wizard.of(f)}`;
const score = c => c.points / c.games;

const archive = new Map(); // cell → its best formation so far
const seen = new Set();
const study = JSON.parse(fs.readFileSync(new URL('./results/formation-study.json', import.meta.url)));
for (const c of study.formations) {
  seen.add(key(c.formation));
  const cell = cellOf(c.formation), best = archive.get(cell);
  if (!best || score(c) > score(best)) archive.set(cell, { ...c, from: 'study' });
}
console.log(`${archive.size} of 16 cells filled from the study`);

const out = { scale, traits: Object.fromEntries(Object.entries(TRAITS).map(([k, t]) => [k, { name: t.name, values: t.values }])), batches: [], cells: null };
const save = () => fs.writeFileSync(FILE, JSON.stringify(out, null, 1));
let seed = 4000000;
for (let b = 0; b < BATCHES; b++) {
  const parents = [...archive.values()], children = [];
  for (let tries = 0; children.length < CHILDREN && tries < 10 * CHILDREN; tries++) {
    const p = parents[Math.floor(rng() * parents.length)];
    const f = mutate(p.formation, 1 + Math.floor(rng() * 2), rng), k = key(f);
    if (!seen.has(k)) { seen.add(k); children.push({ source: `from ${p.source}`, formation: f }); }
  }
  await playPanel(children, FIRST, seed, `batch ${b + 1}: `); seed += children.length * 7 * FIRST;
  const challengers = children.filter(c => { const best = archive.get(cellOf(c.formation)); return !best || score(c) > score(best); });
  await playPanel(challengers, CHECK, seed, `batch ${b + 1} check: `); seed += challengers.length * 7 * CHECK;
  let taken = 0;
  for (const c of challengers) {
    const cell = cellOf(c.formation), best = archive.get(cell);
    if (!best || score(c) > score(best)) { archive.set(cell, c); taken++; }
  }
  out.batches.push({ children: children.length, challengers: challengers.length, taken, filled: archive.size });
  console.log(`batch ${b + 1}: ${challengers.length} challengers, ${taken} took a cell, ${archive.size} cells filled`);
  save();
}

// Each cell's best plays 140 fresh games; only those count in the catalogue's scores.
const finals = [...archive.entries()].map(([cell, c]) => ({ cell, source: c.source, formation: c.formation, searchScore: Math.round(100 * score(c)), searchGames: c.games }));
await playPanel(finals, FINAL, seed, 'final: ');
out.cells = finals.map(c => ({ ...c, score: Math.round(100 * c.points / c.games), draws: Math.round(100 * c.draws / c.games), movesEach: Math.round(c.plies / c.games / 2) }))
  .sort((a, b) => b.score - a.score);
save();
for (const c of out.cells) console.log(`${c.cell.padEnd(28)} ${c.score}% (search said ${c.searchScore}%), draws ${c.draws}%, ${c.movesEach} moves each`);

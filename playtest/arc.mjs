// How games unfold, from recorded games: does an early lead snowball, how often the side behind comes
// back, what Earth's comeback move (§5) does, and how draws come about. "Ahead by N" counts elements
// (a stack is two), measured after the other side's reply, so an even trade doesn't count as a lead.
// Run: node arc.mjs  (reads the v0.3 games of presetsV03, v03recheck, v03strong and v03topTwo)
import fs from 'node:fs';

const load = name => JSON.parse(fs.readFileSync(new URL(`./results/${name}.json`, import.meta.url)));
const units = label => label.split('+').length;
const other = s => (s === 'w' ? 'b' : 'w');
const isEarthCombine = c => c.piece.split('+').some(x => x.startsWith('earth'));

// White's lead in elements after each ply (index t = after t plies), and that lead once the other side
// has replied: the smaller of the lead now and one ply later, 0 if they differ in sign.
function leads(rec) {
  const lead = Array(rec.plies + 1).fill(0);
  for (const c of rec.captures) lead[c.ply + 1] += (c.by === 'w' ? 1 : -1) * units(c.piece);
  for (let t = 1; t <= rec.plies; t++) lead[t] += lead[t - 1];
  return lead.map((x, t) => {
    const y = lead[Math.min(t + 1, rec.plies)];
    return x * y <= 0 ? 0 : Math.sign(x) * Math.min(Math.abs(x), Math.abs(y));
  });
}
const forSide = (l, s) => (s === 'w' ? l : -l);
const score = (rec, s) => (rec.winner === s ? 1 : rec.winner ? 0 : 0.5);
const pct = (a, b) => (b ? Math.round(100 * a / b) : null);

export function arc(records) {
  const out = { games: records.length };

  // Snowball: the first time a side is N elements ahead, how does that side do?
  out.firstAhead = {};
  for (const N of [1, 2, 3, 4]) {
    let n = 0, win = 0, draw = 0, plies = 0;
    for (const r of records) {
      const l = leads(r), t = l.findIndex(x => Math.abs(x) >= N);
      if (t < 0) continue;
      const s = l[t] > 0 ? 'w' : 'b';
      n++; plies += t;
      if (r.winner === s) win++; else if (!r.winner) draw++;
    }
    out.firstAhead[N] = { games: pct(n, records.length), wins: pct(win, n), draws: pct(draw, n), losses: pct(n - win - draw, n), atMove: Math.round(plies / n / 2) };
  }

  // Comebacks: decisive games where the winner was N elements behind at some point.
  const decisive = records.filter(r => r.winner);
  const worst = r => Math.max(0, ...leads(r).map(x => -forSide(x, r.winner)));
  const best = r => Math.max(0, ...leads(r).map(x => forSide(x, r.winner)));
  out.decisive = decisive.length;
  out.winnerWasBehindBy = Object.fromEntries([1, 2, 3].map(N => [N, pct(decisive.filter(r => worst(r) >= N).length, decisive.length)]));
  out.winnerNeverAhead = pct(decisive.filter(r => best(r) === 0).length, decisive.length);

  // Earth's comeback move: combining Earth with an attacker, by how the combining side stood then.
  const ec = { behind: [0, 0], even: [0, 0], ahead: [0, 0] };
  let gamesWith = 0, total = 0;
  for (const r of records) {
    const l = leads(r), seen = new Set();
    for (const c of r.combines.filter(isEarthCombine)) {
      total++;
      if (seen.has(c.by)) continue; // a side's first Earth combine in the game
      seen.add(c.by);
      const x = forSide(l[c.ply], c.by), k = x < 0 ? 'behind' : x > 0 ? 'ahead' : 'even';
      ec[k][0]++; ec[k][1] += score(r, c.by);
    }
    if (seen.size) gamesWith++;
  }
  out.earthCombines = {
    perGame: Math.round(100 * total / records.length) / 100, gamesWithOne: pct(gamesWith, records.length),
    ...Object.fromEntries(Object.entries(ec).map(([k, [n, s]]) => [k, { sides: n, score: pct(s, n) }])),
  };
  // Sides that fell behind: did those that combined Earth afterwards do better than those that didn't?
  const fell = { combined: [0, 0], not: [0, 0] };
  for (const r of records) {
    const l = leads(r);
    for (const s of ['w', 'b']) {
      const t = l.findIndex(x => forSide(x, s) < 0);
      if (t < 0) continue;
      const k = r.combines.some(c => c.by === s && c.ply >= t && isEarthCombine(c)) ? 'combined' : 'not';
      fell[k][0]++; fell[k][1] += score(r, s);
    }
  }
  out.afterFallingBehind = Object.fromEntries(Object.entries(fell).map(([k, [n, s]]) => [k, { sides: n, score: pct(s, n) }]));

  // Draws: how they ended, and the lead at the end.
  const draws = records.filter(r => !r.winner);
  out.draws = pct(draws.length, records.length);
  out.drawReasons = {};
  for (const r of draws) out.drawReasons[r.reason] = (out.drawReasons[r.reason] || 0) + 1;
  const endLead = r => Math.abs(leads(r).at(-1));
  out.drawLeadAtEnd = { even: draws.filter(r => endLead(r) === 0).length, by1: draws.filter(r => endLead(r) === 1).length, by2plus: draws.filter(r => endLead(r) >= 2).length };
  const attackers = (r, o) => r.final.filter(p => p.o === o && p.piece !== 'wizard' && !/^earth\d$/.test(p.piece))
    .reduce((n, p) => n + units(p.piece), 0);
  const left = draws.map(r => attackers(r, 'w') + attackers(r, 'b')).sort((a, b) => a - b);
  out.drawAttackersLeft = { median: left[left.length >> 1], fewest: left[0], most: left.at(-1) };
  out.decisiveReasons = {};
  for (const r of decisive) out.decisiveReasons[r.reason] = (out.decisiveReasons[r.reason] || 0) + 1;
  out.medianMovesEach = { decisive: median(decisive.map(r => r.plies / 2)), draws: median(draws.map(r => r.plies / 2)) };
  return out;
}
const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const v03 = r => r.config.waterDiagonalBends && r.config.waterOneWay;
  const equal = r => !/handicap|without|v0\.2/.test(r.config.tag ?? '');
  const games = ['presetsV03', 'v03recheck', 'v03strong', 'v03topTwo'].flatMap(load).filter(r => v03(r) && equal(r));
  const nodes = r => r.config.white.nodes;
  const groups = { 'Deep 2k': games.filter(r => nodes(r) === 2000), 'Deep 20k': games.filter(r => nodes(r) === 20000) };
  const result = Object.fromEntries(Object.entries(groups).map(([k, rs]) => [k, arc(rs)]));
  console.log(JSON.stringify(result, null, 1));
  fs.writeFileSync(new URL('./results/arc.summary.json', import.meta.url), JSON.stringify(result, null, 1));
}

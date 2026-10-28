// Ratings for players from their games, on the chess Elo scale: a 200-point gap means the
// stronger player scores about 76%, 400 points about 91%. Fitted to all games at once
// (Bradley–Terry: each player gets the rating that best explains every result, a draw counting
// as half a win), so players that never met directly still get comparable ratings.
// The range comes from refitting on games drawn at random from the same set (a bootstrap).
import { rngFrom } from './game.mjs';

const expected = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));

// games: [{ a, b, score }] with score 1 / 0.5 / 0 for player a.
function fit(names, games, anchor, anchorRating) {
  const r = Object.fromEntries(names.map(n => [n, anchorRating]));
  for (let it = 0; it < 200; it++) {
    const grad = Object.fromEntries(names.map(n => [n, 0])), curv = Object.fromEntries(names.map(n => [n, 0]));
    for (const g of games) {
      const e = expected(r[g.a], r[g.b]);
      grad[g.a] += g.score - e; grad[g.b] -= g.score - e;
      curv[g.a] += e * (1 - e); curv[g.b] += e * (1 - e);
    }
    let moved = 0;
    for (const n of names) {
      // Newton step, capped so a player who won (or lost) everything doesn't run off to infinity.
      const step = Math.max(-100, Math.min(100, (400 / Math.LN10) * grad[n] / Math.max(curv[n], 1e-9)));
      r[n] += step; moved = Math.max(moved, Math.abs(step));
    }
    const shift = anchorRating - r[anchor];
    for (const n of names) r[n] += shift;
    if (moved < 0.01) break;
  }
  return r;
}

// records: game records whose config has labels: { w, b } naming the two players.
export function ratings(records, { anchor, anchorRating = 1000, samples = 200 } = {}) {
  const games = records.filter(r => r.config.labels).map(r => ({
    a: r.config.labels.w, b: r.config.labels.b, score: r.winner === 'w' ? 1 : r.winner === 'b' ? 0 : 0.5,
  }));
  const names = [...new Set(games.flatMap(g => [g.a, g.b]))];
  anchor ??= names[0];
  const best = fit(names, games, anchor, anchorRating);
  const rng = rngFrom(1);
  const draws = Object.fromEntries(names.map(n => [n, []]));
  for (let k = 0; k < samples; k++) {
    const sample = games.map(() => games[Math.floor(rng() * games.length)]);
    const r = fit(names, sample, anchor, anchorRating);
    for (const n of names) draws[n].push(r[n]);
  }
  const out = {};
  for (const n of names.sort((x, y) => best[y] - best[x])) {
    const d = draws[n].sort((x, y) => x - y);
    out[n] = { rating: Math.round(best[n]), range: [Math.round(d[Math.floor(samples * 0.025)]), Math.round(d[Math.floor(samples * 0.975)])] };
  }
  return out;
}

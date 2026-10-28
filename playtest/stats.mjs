// Turning game records into the numbers in FINDINGS.md.

// 95% range for a win rate measured from n games (Wilson interval), as percentages.
export function interval(p, n) {
  if (!n) return [0, 100];
  const z = 1.96, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.round(100 * (c - w) / d), Math.round(100 * (c + w) / d)];
}

const pct = (k, n) => (n ? Math.round(100 * k / n) : 0);

// Each record's config has `tag` (which matchup) and `a` (the colour side A played).
// Score = wins + half the draws, from side A's point of view.
export function summarize(records) {
  const groups = {};
  for (const r of records) (groups[r.config.tag] ??= []).push(r);
  const out = {};
  for (const [tag, rs] of Object.entries(groups)) {
    const n = rs.length;
    const count = f => rs.filter(f).length;
    const aWins = count(r => r.winner && r.winner === r.config.a);
    const bWins = count(r => r.winner && r.winner !== r.config.a);
    const draws = n - aWins - bWins;
    const reasons = {};
    for (const r of rs) {
      const k = r.winner ? r.reason : 'draw:' + r.reason;
      reasons[k] = (reasons[k] || 0) + 1;
    }
    const moves = rs.map(r => r.plies / 2).sort((x, y) => x - y);
    const aScore = (aWins + draws / 2) / n;
    out[tag] = {
      games: n,
      aScore: Math.round(100 * aScore), aScoreRange: interval(aScore, n),
      aWins: pct(aWins, n), bWins: pct(bWins, n), draws: pct(draws, n),
      whiteWins: pct(count(r => r.winner === 'w'), n), blackWins: pct(count(r => r.winner === 'b'), n),
      // White's share of the games that had a winner.
      whiteOfDecisive: pct(count(r => r.winner === 'w'), aWins + bWins),
      whiteOfDecisiveRange: interval(count(r => r.winner === 'w') / Math.max(1, aWins + bWins), aWins + bWins),
      endings: Object.fromEntries(Object.entries(reasons).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, pct(v, n)])),
      movesPerPlayer: { median: moves[n >> 1], shortest: moves[0], longest: moves[n - 1] },
      combinesPerGame: Math.round(10 * rs.reduce((s, r) => s + r.combines.length, 0) / n) / 10,
      capturesPerGame: Math.round(10 * rs.reduce((s, r) => s + r.captures.length, 0) / n) / 10,
    };
  }
  return out;
}

// Which pieces get captured and which pieces do the capturing, across all records.
export function pieceActivity(records) {
  const taken = {}, taker = {};
  for (const r of records) for (const c of r.captures) {
    taken[c.piece] = (taken[c.piece] || 0) + 1;
    taker[c.with] = (taker[c.with] || 0) + 1;
  }
  const per = o => Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, Math.round(100 * v / records.length) / 100]));
  return { takenPerGame: per(taken), capturesMadePerGame: per(taker) };
}

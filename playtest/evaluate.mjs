// Scoring a position: how good it looks for one side, without looking ahead. Shared by every
// look-ahead player, so differences between them come from how they search, not how they score.
import { pseudoMoves, inCheck, OWNER, IS_WIZARD, CAPTURER, PLAIN_EARTH, VALID, N, fileOf, rankOf, CASTLE, UNIT_BITS, UNITS, unitCode, unitOf } from '../packages/engine/src/core.ts';

// Piece values are a guess, so there are two tables; experiments can run with both.
export const VALUES = {
  // Elements differ: Fire and Water strongest, Wind locked to one colour, Earth a blocker.
  standard: { element: { fire: 3, wind: 2.5, water: 3, earth: 1 }, size: { 1: 1, 2: 1.6, 3: 2.1 } },
  // Every capturing element worth the same; only size matters.
  flat: { element: { fire: 3, wind: 3, water: 3, earth: 1 }, size: { 1: 1, 2: 1.5, 3: 2 } },
  // Learned from 4,000 games of Deep 2k against itself (tune.mjs selfplay, 2026-10-28), one value per
  // element and size, scaled so the average attacking piece is worth what it is in `standard`.
  // Earth's value can't really be measured (it's never captured on its own): the negative numbers
  // only say that a stack holding Earth is worth less than a stack of two attackers.
  tuned: { unit: {
    fire1: 1.654, fire2: 2.824, fire3: 5.09, wind1: 0.929, wind2: 1.817, wind3: 6.182,
    water1: 3.22, water2: 6.421, water3: 11.813, earth1: -2.949, earth2: -3.617, earth3: -2.941,
  } },
};

// Whole sets of evaluate weights. `tuned` is the rest of the tune.mjs result that goes with VALUES.tuned.
export const WEIGHTS = {
  tuned: { values: VALUES.tuned, mobility: 0.278, wizardPressure: 0.408, stackBonus: 4.29 },
};
// For "Earth breaks Earth" (GAME_SPEC open question 13), where plain Earth can be captured: the learned
// Earth values are negative, so a bot would be glad to lose its Earth. Here every Earth counts +2
// (about a Fire 1 or Wind 2), alone or in a stack, so combining Earth is worth exactly what it is
// with `tuned` and only losing or taking an Earth changes. Both sides of a comparison use it.
WEIGHTS.earthWall = { ...WEIGHTS.tuned, values: { unit: { ...VALUES.tuned.unit, earth1: 2, earth2: 2, earth3: 2 } } };
// For the castle return (GAME_SPEC open question 15): walking the Wizard to the enemy castle takes
// more moves than the search sees, so the score pulls it there once the opponent is down to a few
// attackers (see castleWalk in evaluate). Both sides of a comparison use it; it does nothing when
// the rule is off.
WEIGHTS.castleWalk = { ...WEIGHTS.tuned, castleWalk: 0.5 };

// For readable pieces ({ o, wiz } or { o, els }), as game.mjs and Greedy use them.
export function pieceValue(p, table = VALUES.standard) {
  if (!p || p.wiz) return 0;
  return p.els.reduce((v, x) => v + (table.unit ? table.unit[x.e + x.s] : table.element[x.e] * table.size[x.s]), 0);
}

// The same per piece code, for the search: one table lookup instead of a sum.
const ELEMENTS = ['fire', 'wind', 'water', 'earth'];
const codeTables = new WeakMap();
export function codeValues(table) {
  let v = codeTables.get(table);
  if (v) return v;
  v = new Float64Array(2048);
  for (let c = 0; c < 2048; c++) {
    if (!VALID[c] || IS_WIZARD[c]) continue;
    const units = [[(c >> 2) & 3, (c >> 4) & 3]];
    if (c & 64) units.push([(c >> 7) & 3, (c >> 9) & 3]);
    v[c] = units.reduce((s, [e, size]) => s + (table.unit ? table.unit[ELEMENTS[e] + size] : table.element[ELEMENTS[e]] * table.size[size]), 0);
  }
  codeTables.set(table, v);
  return v;
}

export const forward = (side, s) => (side === 0 ? rankOf(s) : N - 1 - rankOf(s)); // 0 = own back row, 8 = opponent's
const dist = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
const scratch = new Int32Array(512);

// The weights for evaluate. Style players change some of them.
export const SCORE_DEFAULTS = {
  values: VALUES.standard, materialWeight: 1, wizardPressure: 0.1, advance: 0, stackBonus: 0,
  earthGuard: 0, mobility: 0.02, hunt: 0, castleWalk: 0,
};

// The castle return (castleReturn): a share of the best piece side o could bring back, larger the
// closer its Wizard is to the enemy castle. Only once the opponent is down to 4 attacking pieces or
// fewer (before that, a Wizard walking into the enemy camp gets caught), and growing as it has fewer.
// A Wizard that has used up its visit counts as one step further out, so it steps out and back in.
function castleWalk(pos, o, enemyCapturers, weight, values) {
  const w = pos.wizard[o];
  if (w < 0 || enemyCapturers > 4) return 0;
  let present = 0;
  for (let s = 0; s < 81; s++) { const c = pos.board[s]; if (c && OWNER[c] === o) present |= UNIT_BITS[c]; }
  let best = 0;
  for (let k = 0; k < UNITS; k++) if (!(present >> k & 1)) best = Math.max(best, values[unitCode(o, ...unitOf(k))]);
  if (!best) return 0;
  let d = 9;
  for (let s = 0; s < 81; s++) if (CASTLE[(o ^ 1) * 81 + s]) d = Math.min(d, dist(w, s));
  if (d === 0 && pos.returnRule === 1 && pos.returned[o]) d = 2;
  return weight * best * (5 - enemyCapturers) / 4 * (8 - d) / 8;
}

// Score from the point of view of `me` (0 White, 1 Black). Positive = good for me.
export function evaluate(pos, me, opts, values) {
  const b = pos.board, wiz = pos.wizard;
  let score = 0;
  const capturers = [0, 0];
  for (let s = 0; s < 81; s++) {
    const p = b[s];
    if (!p) continue;
    const o = OWNER[p], sign = o === me ? 1 : -1;
    if (IS_WIZARD[p]) continue;
    score += sign * values[p] * opts.materialWeight;
    if (CAPTURER[p]) {
      capturers[o]++;
      // Pressure on the enemy Wizard: capturing pieces within 3 squares of it.
      const ew = wiz[o ^ 1];
      if (ew >= 0 && dist(s, ew) <= 3) score += sign * opts.wizardPressure;
      score += sign * opts.advance * forward(o, s);
      if (p & 64) score += sign * opts.stackBonus;
    }
    if (opts.earthGuard && PLAIN_EARTH[p]) {
      const w = wiz[o];
      if (w >= 0 && dist(s, w) === 1) score += sign * opts.earthGuard;
    }
  }
  // Elimination danger: the last few capturing pieces are worth extra.
  for (const o of [0, 1]) if (capturers[o] <= 3) score += (o === me ? -1 : 1) * (4 - capturers[o]) * 2;
  if (opts.castleWalk && pos.returnRule) for (const o of [0, 1]) score += (o === me ? 1 : -1) * castleWalk(pos, o, capturers[o ^ 1], opts.castleWalk, values);
  if (opts.mobility) {
    let m = 0;
    for (let s = 0; s < 81; s++) if (b[s]) m += (OWNER[b[s]] === me ? 1 : -1) * pseudoMoves(pos, s, scratch, 0);
    score += m * opts.mobility;
  }
  if (opts.hunt) {
    // Wizard hunter: fewer escape squares for the enemy Wizard is better.
    const ew = wiz[me ^ 1];
    if (ew >= 0) score += (8 - pseudoMoves(pos, ew, scratch, 0)) * opts.hunt;
  }
  if (inCheck(pos, pos.side)) score += (pos.side === me ? -1 : 1) * 0.3;
  return score;
}

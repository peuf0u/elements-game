// "Nobody can win anymore" (GAME_SPEC open question 16): chess's dead position. A position is dead
// when no sequence of legal moves at all, with both sides helping, ends in a win for either side.
// This looks for such a sequence (a "helpmate") and reports the positions where none was found.
//   node dead.mjs games    the drawn games of results/v05draws.json, every 10th position and the last
//   node dead.mjs endings  small endings with random squares: one or two attackers a side, some Earth
import fs from 'node:fs';
import { setVariant, startGame, legalMoves, play, positionOf, name, V05, PRESETS } from './engine.mjs';
import { rngFrom } from './game.mjs';
import { decodePiece } from '../packages/engine/src/index.ts';
import { Position, legalMoves as coreMoves, hasLegalMove, inCheck, OWNER, IS_WIZARD, CAPTURER, PLAIN_EARTH, unitCode, combineCodes, wizardCode, distance, SQUARES } from '../packages/engine/src/core.ts';

// The search: best-first, always expanding the position closest to a win. Close means the attackers
// of one side stand near every attacker of the other (each must be taken for the elimination win).
// Each move made counts like one square of distance (step = 1), which finds short sequences; with a
// step below 0 it goes deeper first instead, finding long ones fast where the short search gives up.
// A found sequence proves the position isn't dead; not finding one within the budget only flags it.
function closeness(pos) {
  const b = pos.board;
  let best = Infinity;
  for (const x of [0, 1]) {
    const hunters = [], prey = [];
    for (let s = 0; s < SQUARES; s++) {
      const c = b[s];
      if (!c) continue;
      if (OWNER[c] === x && (CAPTURER[c] || IS_WIZARD[c])) hunters.push(s);
      else if (OWNER[c] !== x && CAPTURER[c]) prey.push(s);
    }
    let h = prey.length * 2;
    for (const t of prey) h += Math.min(...hunters.map(a => distance(a, t)));
    best = Math.min(best, h);
  }
  return best;
}

const buffer = new Int32Array(512);
export function helpmate(start, budget = 200000, step = 1) {
  const cfg = start.config, key = p => p.hashLo + ',' + p.hashHi;
  const seen = new Set([key(start)]);
  // A tiny binary heap of [priority, board, side, returned, plies].
  const heap = [];
  const push = n => { heap.push(n); let i = heap.length - 1; while (i && heap[(i - 1) >> 1][0] > n[0]) { heap[i] = heap[(i - 1) >> 1]; i = (i - 1) >> 1; } heap[i] = n; };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[i] = heap[c]; i = c; } heap[i] = last; }
    return top;
  };
  push([closeness(start), Int16Array.from(start.board), start.side, start.returnedBits(), 0]);
  let nodes = 0;
  while (heap.length && nodes < budget) {
    const [, board, side, returned, plies] = pop();
    const pos = Position.from(board, side, cfg, returned);
    const n = coreMoves(pos, buffer), moves = buffer.slice(0, n);
    for (const m of moves) {
      nodes++;
      pos.make(m);
      const opp = pos.side;
      if (pos.capturers[opp] === 0 || (inCheck(pos, opp) && !hasLegalMove(pos))) return { plies: plies + 1, nodes, how: pos.capturers[opp] === 0 ? 'elimination' : 'checkmate', winner: opp ^ 1 };
      const k = key(pos);
      if (!seen.has(k) && hasLegalMove(pos)) { seen.add(k); push([closeness(pos) + (plies + 1) * step, Int16Array.from(pos.board), pos.side, pos.returnedBits(), plies + 1]); }
      pos.unmake();
    }
  }
  return null;
}

const show = pos => Array.from(pos.board, (c, s) => {
  if (!c) return '';
  const p = decodePiece(c);
  return p.owner[0] + ':' + (p.kind === 'wizard' ? 'wizard' : p.units.map(u => u.element + u.size).join('+')) + '@' + name(s);
}).filter(Boolean).join(' ') + (pos.side ? ', Black to move' : ', White to move');

// Replays a recorded game, giving every position along the way.
function* replay(rec) {
  setVariant(rec.config);
  let st = startGame(rec.formations.w, rec.formations.b);
  yield st;
  for (const mv of rec.moves) {
    const m = legalMoves(st).find(a => (a.kind === 'return' ? unitName(a.from - 81) + '@' + name(a.to) : name(a.from) + (a.kind === 'capture' ? 'x' : a.kind === 'combine' ? '+' : '-') + name(a.to)) === mv);
    if (!m) throw new Error('move not legal on replay: ' + mv);
    st = play(st, m);
    yield st;
  }
}
const unitName = k => ['fire', 'wind', 'water', 'earth'][(k / 3) | 0] + ((k % 3) + 1);

// What the searches found: how many positions, how long the winning sequences were, and the
// positions where none was found.
function tally(found) {
  const plies = found.filter(f => f.r).map(f => f.r.plies).sort((a, b) => a - b), failed = found.filter(f => !f.r);
  const longest = found.filter(f => f.r).sort((a, b) => b.r.plies - a.r.plies)[0];
  return {
    positions: found.length, noWinFound: failed.length,
    medianPlies: plies[plies.length >> 1], within100Plies: plies.filter(p => p <= 100).length,
    byCheckmate: found.filter(f => f.r?.how === 'checkmate').length,
    longest: longest && { ...longest.r, ...longest.at },
    failed: failed.slice(0, 20).map(f => f.at),
  };
}
const search = pos => helpmate(pos) ?? helpmate(pos, 200000, -0.001);

function games() {
  const recs = JSON.parse(fs.readFileSync(new URL('./results/v05draws.json', import.meta.url))).filter(r => r.winner === null);
  const found = [];
  for (const rec of recs) {
    const states = [...replay(rec)];
    for (const st of new Set(states.filter((_, i) => i % 10 === 0 && i > 0).concat(states.at(-1)))) {
      const pos = positionOf(st);
      if (!hasLegalMove(pos)) continue; // stalemate, already a draw
      found.push({ r: search(pos), at: { tag: rec.config.tag, ply: st.ply, last: st === states.at(-1), board: show(pos) } });
    }
  }
  const last = found.filter(f => f.at.last);
  console.log(JSON.stringify({ drawnGames: recs.length, everyTenthPosition: tally(found), lastPositions: tally(last) }, null, 1));
}

// Small endings: each side a Wizard, one or two attackers (single pieces, or one stack) and 0–3
// plain Earths, on random squares (Wizards apart, the side not to move not in check).
function endings(samples = 40) {
  const rng = rngFrom(4000000);
  const single = [];
  for (const e of [0, 1, 2]) for (const s of [1, 2, 3]) single.push([e, s]);
  const sets = [];
  for (const a of single) for (const b of single) sets.push([[a], [b]]);
  for (const a of single) for (const a2 of single) if (a2[0] > a[0]) for (const b of single) sets.push([[a, a2], [b]], [[b], [a, a2]]);
  // Stacks: Fire+Wind, and Earth with each attacker (§5), against each single attacker.
  const stacks = [[[0, 3], [1, 2]], [[3, 2], [0, 3]], [[3, 2], [1, 3]], [[3, 2], [2, 3]]];
  for (const st of stacks) for (const b of single) sets.push([[st], [b]], [[b], [st]]);
  const out = {};
  for (const [label, rules] of [['v0.5', V05], ['v0.5 without the castle return', { ...V05, castleReturn: 'off' }]]) {
    setVariant(rules);
    const cfg = positionOf(startGame(PRESETS.windHeldBack)).config; // the engine's config for these rules
    const found = [];
    for (const [wa, ba] of sets) for (let i = 0; i < samples; i++) {
      const pos = randomEnding(rng, cfg, wa, ba);
      if (pos && hasLegalMove(pos)) found.push({ r: search(pos), at: { board: show(pos) } });
    }
    out[label] = tally(found);
  }
  console.log(JSON.stringify(out, null, 1));
}
function randomEnding(rng, cfg, wa, ba) {
  for (let tries = 0; tries < 100; tries++) {
    const board = new Int16Array(SQUARES), free = () => { for (;;) { const s = Math.floor(rng() * SQUARES); if (!board[s]) return s; } };
    const wz = free(); board[wz] = wizardCode(0);
    const bz = free(); board[bz] = wizardCode(1);
    if (distance(wz, bz) < 2) continue;
    for (const [o, units] of [[0, wa], [1, ba]]) {
      for (const u of units) board[free()] = typeof u[0] === 'number' ? unitCode(o, ...u) : combineCodes(unitCode(o, ...u[0]), unitCode(o, ...u[1]));
      const earths = Math.floor(rng() * 4);
      for (let k = 0; k < earths; k++) board[free()] = unitCode(o, 3, k + 1);
    }
    const side = rng() < 0.5 ? 0 : 1;
    const pos = Position.from(board, side, cfg, 0);
    if (inCheck(pos, side ^ 1)) continue;
    return pos;
  }
  return null;
}

const what = process.argv[2];
if (what === 'games') games();
else if (what === 'endings') endings(Number(process.argv[3] ?? 40));
else console.log('node dead.mjs games | endings [samples]');

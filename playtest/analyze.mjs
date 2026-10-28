// Looks inside recorded games: who gives checkmate and how, comebacks, and what decides games.
// Run: node analyze.mjs <experiment> [matchup tag]
import fs from 'node:fs';
import { X, Y, N, other, pseudoMoves, wizardSq, name } from './engine.mjs';
import { replay, diagram } from './board.mjs';

const label = p => (p.wiz ? 'wizard' : p.els.map(x => x.e + x.s).join('+'));

const touches = (a, b) => Math.max(Math.abs(X(a) - X(b)), Math.abs(Y(a) - Y(b))) === 1;
const plainEarth = p => p && !p.wiz && p.els.length === 1 && p.els[0].e === 'earth';

// How a Water route travels: 'straight', 'edge' (slid along the border), or around Earth:
// 'defender earth' (the mated side's own Earth) or 'attacker earth' (the attacker's Earth used as a ramp).
function routeKind(board, path, attacker) {
  const kinds = new Set();
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (X(a) === X(b)) continue; // a flow step
    const earths = board.filter((p, s) => plainEarth(p) && touches(s, a) && touches(s, b));
    if (!earths.length) kinds.add('edge');
    else kinds.add(earths.some(p => p.o !== attacker) ? 'defender earth' : 'attacker earth');
  }
  for (const k of ['defender earth', 'attacker earth', 'edge']) if (kinds.has(k)) return k;
  return 'straight';
}

// The pieces attacking the mated Wizard in the final position, with the route they use.
export function mateAttackers(rec) {
  const st = replay(rec), loser = other(rec.winner), w = wizardSq(st.board, loser);
  const out = [];
  st.board.forEach((p, s) => {
    if (!p || p.o !== rec.winner) return;
    const m = pseudoMoves(st.board, s).find(m => m.to === w);
    if (m) out.push({ piece: label(p), as: m.as, route: m.as === 'water' ? routeKind(st.board, m.path, rec.winner) : 'straight', from: name(s) });
  });
  return { loserIsA: loser === rec.config.a, wizardOn: name(w), backRow: loser === 'w' ? Y(w) === 0 : Y(w) === N - 1, attackers: out, board: st.board };
}

// The largest material deficit the eventual winner recovered from.
const worstDeficit = rec => Math.max(0, ...rec.material.map(b => (rec.winner === 'w' ? -b : b)));

// One entry per mate: Water (by route) if any Water gives the check, otherwise the first attacker.
const mateKind = m => { const w = m.attackers.find(a => a.as === 'water'); return w ? 'water, ' + w.route : m.attackers[0].as; };

// Captures per game by the capturing element, counting only captures that pass keep(record, capture).
function capturesByElement(records, keep) {
  const o = {};
  for (const r of records) for (const c of r.captures) if (keep(r, c)) {
    const es = c.with.replace(/\d/g, '').split('+');
    for (const e of es) o[e] = (o[e] || 0) + 1 / es.length; // a stack's capture is split between its elements
  }
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(100 * v / records.length) / 100]));
}

export function analyze(records) {
  const decisive = records.filter(r => r.winner);
  const mates = decisive.filter(r => r.reason === 'checkmate').map(mateAttackers);
  const count = (xs, f) => xs.reduce((o, x) => { for (const k of [].concat(f(x))) o[k] = (o[k] || 0) + 1; return o; }, {});
  return {
    games: records.length,
    checkmates: mates.length,
    matedOnBackRow: mates.filter(m => m.backRow).length,
    matedBy: count(mates, mateKind),
    // The same, only for mates of side A (in a formation test, the formation under test).
    aMatedBy: count(mates.filter(m => m.loserIsA), mateKind),
    capturesPerGameByElement: capturesByElement(records, () => true),
    // Captures of side A's pieces only, by the capturing element.
    aLostPerGameByElement: capturesByElement(records, (r, c) => c.by !== r.config.a),
    shortestWinsMovesEach: decisive.map(r => r.plies / 2).sort((a, b) => a - b).slice(0, 5),
    comebacks: {
      // Winner was behind by at least this much material at some point.
      behindBy3: decisive.filter(r => worstDeficit(r) >= 3).length,
      behindBy6: decisive.filter(r => worstDeficit(r) >= 6).length,
      ofDecisive: decisive.length,
    },
    // Material balance at the moment the game ended, from the winner's side.
    winnerMaterialLeadAtEnd: (() => {
      const xs = decisive.map(r => (rec => (rec.winner === 'w' ? 1 : -1) * rec.material.at(-1))(r)).sort((a, b) => a - b);
      return { median: xs[xs.length >> 1], behind: xs.filter(x => x < 0).length };
    })(),
    combinedPiecesLostPerGame: Math.round(100 * records.reduce((s, r) => s + r.captures.filter(c => c.piece.includes('+')).length, 0) / records.length) / 100,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [exp, tag] = process.argv.slice(2);
  let records = JSON.parse(fs.readFileSync(new URL(`./results/${exp}.json`, import.meta.url)));
  if (tag) records = records.filter(r => r.config.tag === tag);
  const groups = {};
  for (const r of records) (groups[r.config.tag] ??= []).push(r);
  for (const [t, rs] of Object.entries(groups)) console.log(t, JSON.stringify(analyze(rs), null, 1));
  // One example of the shortest checkmate.
  const quick = records.filter(r => r.reason === 'checkmate').sort((a, b) => a.plies - b.plies)[0];
  if (quick) {
    const m = mateAttackers(quick);
    console.log(`\nShortest checkmate: ${quick.config.tag}, ${quick.plies / 2} moves each, ${quick.winner} wins\n` + quick.moves.join(' ') + '\n' + diagram(m.board) + '\n' + JSON.stringify(m.attackers));
  }
}

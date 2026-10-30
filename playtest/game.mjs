// Plays one game between two players and records what happened.
import { setVariant, startGame, legalMoves, play, name } from './engine.mjs';
import { PLAYERS, VALUES, pieceValue } from './players.mjs';
import { WEIGHTS } from './evaluate.mjs';
import { FORMATIONS, randomFormation, without } from './formations.mjs';

export function rngFrom(seed) { // mulberry32: small, seedable, good enough for games
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const label = p => (p.wiz ? 'wizard' : p.els.map(x => x.e + x.s).join('+'));
const unitLabel = k => ['fire', 'wind', 'water', 'earth'][(k / 3) | 0] + ((k % 3) + 1); // a returned piece (engine pieces.ts unitOf)
const formation = (f, rng) => (f === 'random' || f === 'randomCastle' ? randomFormation(rng, f === 'randomCastle') : typeof f === 'string' ? FORMATIONS[f] : f);
// A player config: { type, ...options }. values names a table in VALUES, weights a set in WEIGHTS.
// avoid: { element, moves } keeps the player from moving any piece holding that element during its
// first `moves` moves, unless nothing else is legal (restricted play: "what if you neglect Water?").
// noEarthCombine: true keeps the player from ever combining Earth with another element (§5's comeback
// move), unless nothing else is legal.
const plainEarth = p => p && !p.wiz && p.els.length === 1 && p.els[0].e === 'earth';
const makePlayer = ({ type, values, weights, avoid, noEarthCombine, ...o }) => {
  const p = PLAYERS[type]({ ...(weights ? WEIGHTS[weights] : {}), ...o, ...(values ? { values: VALUES[values] } : {}) });
  if (noEarthCombine) return { ...p, choose(st, moves, rng) {
    const f = moves.filter(m => m.kind !== 'combine' || !(plainEarth(st.board[m.from]) || plainEarth(st.board[m.to])));
    return p.choose(st, f.length ? f : moves, rng);
  } };
  if (!avoid) return p;
  return { ...p, choose(st, moves, rng) {
    if (st.ply < 2 * avoid.moves) {
      const f = moves.filter(m => !st.board[m.from].els?.some(x => x.e === avoid.element));
      if (f.length) moves = f;
    }
    return p.choose(st, moves, rng);
  } };
};

// config: { white: {type, ...options}, black: {...}, whiteFormation, blackFormation, seed, maxPlies,
//           and the variant toggles from engine.mjs setVariant: exactRange, noWaterEdge, waterStraightCapture }
// A formation is a name from FORMATIONS, 'random', or a formation object; blackFormation 'same' copies White's.
// remove: { side: 'w' | 'b', piece: [element, size] } takes that piece out of one side's formation (handicap test).
// randomOpening: n plays the first n moves at random, so players that always pick the same move still get varied games.
export function playGame(config) {
  const rng = rngFrom(config.seed ?? 1);
  setVariant(config);
  let wf = formation(config.whiteFormation ?? 'default', rng);
  let bf = config.blackFormation === 'same' ? wf : formation(config.blackFormation ?? 'default', rng);
  if (config.remove) {
    const { side, piece: [e, s] } = config.remove;
    const f = side === 'w' ? wf : bf;
    const square = Object.keys(f).find(k => f[k][0] === e && f[k][1] === s);
    const cut = without(f, square);
    if (side === 'w') wf = cut; else bf = cut;
  }
  const players = { w: makePlayer(config.white), b: makePlayer(config.black) };
  let st = startGame(wf, bf);
  const rec = { moves: [], captures: [], combines: [], returns: [], material: [], formations: { w: wf, b: bf } };
  const max = config.maxPlies ?? 1500;
  const t0 = Date.now();
  while (st.phase === 'play' && st.ply < max) {
    const moves = legalMoves(st);
    const m = st.ply < (config.randomOpening ?? 0) ? moves[Math.floor(rng() * moves.length)] : players[st.turn].choose(st, moves, rng);
    const by = st.turn, target = st.board[m.to], mover = st.board[m.from];
    if (m.kind === 'return') {
      rec.moves.push(unitLabel(m.from - 81) + '@' + name(m.to));
      rec.returns.push({ ply: st.ply, by, piece: unitLabel(m.from - 81) });
    } else rec.moves.push(name(m.from) + (m.kind === 'capture' ? 'x' : m.kind === 'combine' ? '+' : '-') + name(m.to));
    if (m.kind === 'capture') rec.captures.push({ ply: st.ply, by, piece: label(target), with: label(mover) });
    if (m.kind === 'combine') rec.combines.push({ ply: st.ply, by, piece: label(mover) + '+' + label(target) });
    st = play(st, m);
    let bal = 0;
    for (const p of st.board) if (p) bal += (p.o === 'w' ? 1 : -1) * pieceValue(p);
    rec.material.push(Math.round(bal * 10) / 10);
  }
  rec.winner = st.result ? st.result.winner : null;
  rec.reason = st.result ? st.result.reason : 'cap';
  rec.plies = st.ply;
  rec.ms = Date.now() - t0;
  rec.final = st.board.map((p, s) => (p ? { sq: name(s), o: p.o, piece: label(p) } : null)).filter(Boolean);
  return rec;
}

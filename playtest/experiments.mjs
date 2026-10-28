// The experiments from the plan. Each one is a list of games to play; run.mjs plays them.
import { DEFAULT_FORMATION, without } from './formations.mjs';

let seed = 1;
// n games of A against B, alternating colours: A is White in even games, Black in odd ones.
// A and B are player configs like { type: 'careful' }; fa/fb are their formations.
function both(tag, A, B, n, { fa = 'default', fb = 'default', ...extra } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const aWhite = i % 2 === 0;
    return {
      tag, a: aWhite ? 'w' : 'b', seed: seed++, ...extra,
      white: aWhite ? A : B, black: aWhite ? B : A,
      whiteFormation: aWhite ? fa : fb, blackFormation: aWhite ? fb : fa,
    };
  });
}
// n games of the same player against itself; side A is always White.
const mirror = (tag, P, n, extra = {}) =>
  Array.from({ length: n }, () => ({ tag, a: 'w', seed: seed++, white: P, black: P, whiteFormation: 'default', blackFormation: 'default', ...extra }));

// Every pair of players meets n times, half with each colour. The first move of each side is
// random, so players that pick the same move every time still get varied games. labels names the
// players for the ratings (rating.mjs).
function roundRobin(tag, players, n, extra = {}) {
  const names = Object.keys(players), out = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      for (let k = 0; k < n; k++) {
        const [w, b] = k % 2 ? [names[j], names[i]] : [names[i], names[j]];
        out.push({ tag: `${tag}: ${names[i]} v ${names[j]}`, a: k % 2 ? 'b' : 'w', seed: seed++, randomOpening: 2,
          white: players[w], black: players[b], whiteFormation: 'default', blackFormation: 'default', labels: { w, b }, ...extra });
      }
  return out;
}

const random = { type: 'random' }, greedy = { type: 'greedy' }, careful = { type: 'careful' }, thinker = { type: 'thinker' };

// The 12 element pieces of the default formation, by square.
const DEFAULT_PIECES = Object.entries(DEFAULT_FORMATION).filter(([, v]) => v !== 'wizard');

export const EXPERIMENTS = {
  // 1. Do games end, and how?
  ends: s => [
    ...mirror('random v random', random, 1000 * s),
    ...mirror('greedy v greedy', greedy, 1000 * s),
    ...mirror('random v random, random formations', random, 1000 * s, { whiteFormation: 'random', blackFormation: 'random' }),
  ],
  // 2. Does skill matter? Each player against the next one up.
  ladder: s => [
    ...both('greedy v random', greedy, random, 400 * s),
    ...both('careful v greedy', careful, greedy, 200 * s),
    ...both('thinker v careful', thinker, careful, 100 * s),
    ...both('careful(flat values) v careful', { type: 'careful', values: 'flat' }, careful, 200 * s),
  ],
  // 3. White against Black between equal players.
  colours: s => [
    ...mirror('careful v careful', careful, 400 * s),
    ...mirror('careful v careful, flat values', { type: 'careful', values: 'flat' }, 200 * s),
    ...mirror('thinker v thinker', thinker, 100 * s),
    // Same random formation for both sides, so only the first move differs.
    ...Array.from({ length: 300 * s }, () => ({ tag: 'careful v careful, same random formation', a: 'w', seed: seed++, white: careful, black: careful, whiteFormation: 'random', blackFormation: 'same' })),
  ],
  // 4. Piece strength: the default formation minus one piece, against the full default formation.
  handicap: s => DEFAULT_PIECES.flatMap(([square, [e, size]]) =>
    both(`without ${e}${size} (${square})`, careful, careful, 80 * s, { fa: without(DEFAULT_FORMATION, square) })),
  // 4b. Piece strength apart from position: both sides share a fresh random formation each game,
  // and side A is missing one piece.
  handicapRandom: s => ['fire', 'wind', 'water', 'earth'].flatMap(e => [3, 2, 1].flatMap(size =>
    Array.from({ length: 100 * s }, (_, i) => {
      const a = i % 2 === 0 ? 'w' : 'b';
      return {
        tag: `without ${e}${size}`, a, seed: seed++, white: careful, black: careful,
        whiteFormation: 'random', blackFormation: 'same', remove: { side: a, piece: [e, size] },
      };
    }))),
  // 5. Cheat hunt: style players against Careful (and the Turtle against Thinker).
  styles: s => [
    ...both('turtle v careful', { type: 'turtle' }, careful, 100 * s),
    ...both('turtle v thinker', { type: 'turtle' }, thinker, 40 * s),
    ...both('rusher v careful', { type: 'rusher' }, careful, 100 * s),
    ...both('combiner v careful', { type: 'combiner' }, careful, 100 * s),
    ...both('never-combiner v careful', { type: 'neverCombiner' }, careful, 100 * s),
    ...both('hunter v careful', { type: 'hunter' }, careful, 100 * s),
  ],
  // 6. Exact range: the ladder and colour tests again with the variant on.
  exact: s => [
    ...both('careful v greedy', careful, greedy, 200 * s, { exactRange: true }),
    ...both('thinker v careful', thinker, careful, 100 * s, { exactRange: true }),
    ...mirror('careful v careful', careful, 400 * s, { exactRange: true }),
    ...mirror('thinker v thinker', thinker, 100 * s, { exactRange: true }),
  ],
  // 6b. Water variants (GAME_SPEC open question 6): the colour, ladder and key-piece handicap tests again.
  water: s => [['no edge slide', { noWaterEdge: true }], ['straight captures', { waterStraightCapture: true }],
    ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) => [
    ...mirror(`${name}: careful v careful`, careful, 300 * s, v),
    ...mirror(`${name}: thinker v thinker`, thinker, 50 * s, v),
    ...both(`${name}: thinker v careful`, thinker, careful, 50 * s, v),
    ...[['g2', 'water3'], ['d1', 'fire3'], ['b3', 'wind3']].flatMap(([square, piece]) =>
      both(`${name}: without ${piece} (${square})`, careful, careful, 80 * s, { fa: without(DEFAULT_FORMATION, square), ...v })),
  ]),
  // 6c. Thinker against itself again, with the first two moves random: under straight captures it played
  // the same opening in every game, so those games weren't independent.
  waterThinker: s => [['normal rules', {}], ['straight captures', { waterStraightCapture: true }],
    ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) =>
    mirror(`${name}: thinker v thinker, random opening`, thinker, 60 * s, { ...v, randomOpening: 2 })),
  // 6d. More of the above for straight captures, where White looked weak. Fresh seeds, so no game repeats.
  straightThinker: s => { seed = 100000; return mirror('straight captures: thinker v thinker, random opening', thinker, 200 * s, { waterStraightCapture: true, randomOpening: 2 }); },
  // 8. Rating ladder: the old and new look-ahead players, every pair against each other.
  // Deep 80k was dropped after the first ladder (2026-10-28): no stronger than 20k (44% head to head).
  rating: s => roundRobin('rating', {
    careful, thinker,
    'deep 2k': { type: 'deep', nodes: 2000 }, 'deep 5k': { type: 'deep', nodes: 5000 }, 'deep 20k': { type: 'deep', nodes: 20000 },
    'deep 2k tuned': { type: 'deep', nodes: 2000, weights: 'tuned' }, 'deep 5k tuned': { type: 'deep', nodes: 5000, weights: 'tuned' },
    'deep 20k tuned': { type: 'deep', nodes: 20000, weights: 'tuned' },
  }, 100 * s),
  // 9. Material for tune.mjs: Deep against itself, half from the default formation and half from
  // a random formation shared by both sides, so every piece shows up in many situations.
  selfplay: s => Array.from({ length: 4000 * s }, (_, i) => ({
    tag: i % 2 ? 'deep 2k, same random formation' : 'deep 2k, default formation', a: 'w', seed: 200000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000 }, black: { type: 'deep', nodes: 2000 },
    whiteFormation: i % 2 ? 'random' : 'default', blackFormation: i % 2 ? 'same' : 'default',
  })),
  // 9b. The same with the tuned values, for a second round of tuning.
  selfplayTuned: s => Array.from({ length: 4000 * s }, (_, i) => ({
    tag: i % 2 ? 'deep 2k tuned, same random formation' : 'deep 2k tuned, default formation', a: 'w', seed: 300000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, weights: 'tuned' }, black: { type: 'deep', nodes: 2000, weights: 'tuned' },
    whiteFormation: i % 2 ? 'random' : 'default', blackFormation: i % 2 ? 'same' : 'default',
  })),
  // 10. The key experiments again with the strongest fast player, Deep 2k with tuned values
  // (2026-10-28): colours (1), the handicap tests (4, 4b) and the Water variants (6b). Every game
  // starts with one random move per side, because Deep repeats itself more than Careful.
  recheck: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' }, ro = { randomOpening: 2 };
    seed = 400000;
    // Both sides get the same random formation; with `piece`, side A is missing that piece.
    const sameRandom = (tag, n, piece = null) => Array.from({ length: n }, (_, i) => ({
      tag, a: i % 2 ? 'b' : 'w', seed: seed++, white: bot, black: bot, whiteFormation: 'random', blackFormation: 'same', ...ro,
      ...(piece ? { remove: { side: i % 2 ? 'b' : 'w', piece } } : {}),
    }));
    return [
      ...mirror('colours: default formation', bot, 400 * s, ro),
      ...sameRandom('colours: same random formation', 400 * s),
      ...DEFAULT_PIECES.flatMap(([square, [e, size]]) =>
        both(`handicap: without ${e}${size} (${square})`, bot, bot, 100 * s, { fa: without(DEFAULT_FORMATION, square), ...ro })),
      ...['fire', 'wind', 'water', 'earth'].flatMap(e => [3, 2, 1].flatMap(size =>
        sameRandom(`handicap random: without ${e}${size}`, 100 * s, [e, size]))),
      ...[['normal rules', {}], ['no edge slide', { noWaterEdge: true }], ['straight captures', { waterStraightCapture: true }],
        ['both', { noWaterEdge: true, waterStraightCapture: true }]].flatMap(([name, v]) => [
        ...mirror(`water, ${name}: equal`, bot, 400 * s, { ...v, ...ro }),
        ...[['g2', 'water3'], ['d1', 'fire3'], ['b3', 'wind3']].flatMap(([square, piece]) =>
          both(`water, ${name}: without ${piece} (${square})`, bot, bot, 100 * s, { fa: without(DEFAULT_FORMATION, square), ...v, ...ro })),
      ]),
    ];
  },
  // 10b. The 50-move rule (GAME_SPEC open question 2): most strong-bot draws come from it. Does a
  // longer limit turn them into wins, or only make games longer? 0 = no limit (capped at 500 moves each).
  drawLimit: s => {
    const bot = { type: 'deep', nodes: 2000, weights: 'tuned' };
    seed = 800000;
    return [50, 75, 100, 0].flatMap(limit => {
      const name = limit ? `limit ${limit}` : 'no limit';
      return [
        ...mirror(`${name}: default formation`, bot, 400 * s, { quietMoveLimit: limit, randomOpening: 2, maxPlies: 1000 }),
        ...Array.from({ length: 400 * s }, () => ({
          tag: `${name}: same random formation`, a: 'w', seed: seed++, white: bot, black: bot, whiteFormation: 'random', blackFormation: 'same',
          quietMoveLimit: limit, randomOpening: 2, maxPlies: 1000,
        })),
      ];
    });
  },
  // 11. Chess calibration (chess/): the same pipeline on a game with known answers.
  // a. Deep 2k with naive values (every piece worth 1) against itself, to learn values from.
  chessSelfplay: s => Array.from({ length: 4000 * s }, (_, i) => ({
    game: 'chess', tag: 'chess: deep 2k naive', a: 'w', seed: 500000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, values: 'naive' }, black: { type: 'deep', nodes: 2000, values: 'naive' },
  })),
  // a2. The same with the round-1 learned values, for a second round of learning.
  chessSelfplayTuned: s => Array.from({ length: 4000 * s }, (_, i) => ({
    game: 'chess', tag: 'chess: deep 2k tuned', a: 'w', seed: 700000 + i, randomOpening: 2,
    white: { type: 'deep', nodes: 2000, values: 'tuned' }, black: { type: 'deep', nodes: 2000, values: 'tuned' },
  })),
  // b. The key tests on chess with the learned values: White against Black, and the handicap test
  // (one side without its queen, a rook, a bishop, a knight or a pawn), like Elements in recheck.
  chessRecheck: s => {
    const bot = { type: 'deep', nodes: 2000, values: 'tuned' }, chess = { game: 'chess', randomOpening: 2 };
    seed = 600000;
    return [
      ...mirror('chess: colours', bot, 400 * s, chess),
      ...[['queen', 'd1'], ['rook', 'a1'], ['bishop', 'c1'], ['knight', 'b1'], ['pawn', 'f2']].flatMap(([piece, square]) =>
        Array.from({ length: 200 * s }, (_, i) => {
          const a = i % 2 ? 'b' : 'w';
          return { tag: `chess: without ${piece} (${square})`, a, seed: seed++, white: bot, black: bot, remove: { side: a, squares: [square] }, ...chess };
        })),
    ];
  },
  // c. How much learned values help in chess, compared with Elements (§10 of FINDINGS).
  chessRating: s => roundRobin('chess rating', {
    'deep 2k naive': { type: 'deep', nodes: 2000, values: 'naive' }, 'deep 2k classic': { type: 'deep', nodes: 2000, values: 'classic' },
    'deep 2k tuned': { type: 'deep', nodes: 2000, values: 'tuned' }, 'deep 20k tuned': { type: 'deep', nodes: 20000, values: 'tuned' },
  }, 100 * s, { game: 'chess' }),
  // 7. Formations against the default one.
  formations: s => [
    ...both('random formation v default', careful, careful, 200 * s, { fa: 'random' }),
    ...both('fortress v default', careful, careful, 100 * s, { fa: 'fortress' }),
    ...both('bunker v default', careful, careful, 100 * s, { fa: 'bunker' }),
    ...both('turtle in fortress v careful', { type: 'turtle' }, careful, 100 * s, { fa: 'fortress' }),
  ],
  // 7b. Do the searched and hand-made formations hold off the default formation's Water?
  // analyze.mjs shows how side A (the formation under test) was mated.
  formationWater: s => ['default', 'fireForward', 'fireForward2', 'earthShield'].flatMap(f =>
    both(`${f} v default`, careful, careful, 150 * s, { fa: f })),
};

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

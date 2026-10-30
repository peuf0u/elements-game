# @elements/engine: the rules of Elements

This package is the rules of the game and nothing else. It has no screen, storage, clock or randomness. You hand it a game and a move, and it tells you the new game: what's legal, what was captured, whether someone won. [GAME_SPEC.md](../../GAME_SPEC.md) is what it implements. The app, the bots, the playtest and later the server all use this one package, so the rules exist in exactly one place (decisions D7, D8 and D13 in [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md)).

It is written in TypeScript. Node 24 runs the `.ts` files directly, so there's no build step. `npm run typecheck` checks the types.

## Two ways in

```
  app, server ──▶ index.ts  (the safe way)            bots, playtest ──▶ core.ts  (the fast way)
                  every move returns a new game                         one board, make a move,
                  state; nothing changes in place                       look, take it back
                        │                                                      │
                        └──────────────────────┬───────────────────────────────┘
                                               ▼
                    the same move generator (movegen.ts) and board (position.ts)
```

- **`index.ts` is the immutable API** that the app uses: `startFromFormations`, `legalActions`, `apply`, `status`. A game state is plain data that you can save, send or replay.
- **`core.ts` is the fast core**, for code that looks thousands of moves ahead. Copying the board for every look-ahead step would be slow, so a bot makes a move on one shared board, looks further, and takes the move back. The safe API is built on top of this same core, so the two can't disagree.

## Files

| File | What it is |
|---|---|
| `squares.ts` | The 9×9 board: square numbers, names like `e1`, and the directions, worked out once at startup. |
| `pieces.ts` | Pieces as small numbers ("piece codes"), with a lookup table for each property: owner, range, how it moves, whether it's plain Earth. |
| `position.ts` | The fast board: make and take back moves, plus the rule toggles (`RulesConfig`). Since rules v0.3 two of them are on by default: Water bends diagonally and goes one way per move (`waterDiagonalBends`, `waterOneWay`). Turning both off gives the v0.2 Water for comparison. Since v0.4 the castle return is on too (`castleReturn`, `returnTo`): a move with a from of 81 or more brings a captured piece back, and the position remembers whether each Wizard has used its current visit (`returned`, part of the hash). |
| `movegen.ts` | Which moves are possible (GAME_SPEC §3–§6), including Water's routes around Earth and along the edge, and whether a Wizard is attacked. |
| `zobrist.ts` | A 64-bit fingerprint of each position, updated cheaply on every move. Used for the repetition draw, and later for the bots' memory. |
| `game.ts` | The immutable API and the end-of-game checks, in the spec's order. Since rules v0.5 both draws are automatic, as in chess: the same position a fifth time (`repetitionLimit`), or 50 moves each without a capture, a combine or a piece brought back (`quietMoveLimit`). |
| `formation.ts` | Starting formations: the default ("Wind 3 held back"), six more presets and your original one, all named in `PRESETS`. |
| `notation.ts` | Text forms: squares (`e1`), moves (`c2-c5`) and whole positions on one line, like chess's FEN. |
| `route.ts` | The squares a move passes through, for animation and for analysing games. |

Not done yet: the formation phase (placing pieces one at a time), draw by agreement and resignation. Until then a game starts from a finished formation.

## How it's checked

```sh
npm test          # from the repo root or from this folder
```

- **`test/rules.test.ts`**: one test per rule, using the spec's own examples where it has them, such as Water 3 on b2 bending around the Earth on c3.
- **`test/perft.test.ts`**: "perft" is the standard test for move generators in chess engines. It counts every possible sequence of moves to a fixed depth from a set of positions. The totals were computed with the spike's rules. If a count ever changes, the move rules changed.
- **`test/invariants.test.ts`**: random games under every variant. After each move it checks that taking a move back restores the board exactly, and that the running fingerprint matches one computed from scratch.

There's also a cross-check, `node playtest/check.mjs`. It plays thousands of random games with both this engine and the spike's rules, and checks that both list the same legal moves in the same order and reach the same result.

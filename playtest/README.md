# Playtest: the computer plays Elements

Computer players play thousands of games against each other to answer: is the game balanced, do games end, and are there cheats (dominant strategies, unbreakable defences, useless pieces)? Decision D12 in [PRODUCT_BRIEF.md](../PRODUCT_BRIEF.md). What we found is in [FINDINGS.md](FINDINGS.md).

## How it fits together

```
experiments.mjs ──▶ run.mjs ──▶ pool.mjs ──▶ game.mjs ──▶ players.mjs ──▶ engine.mjs ──▶ packages/engine
 which games         plays        one game     one game     Random, Greedy,    the only file     the rules of
 to play             them and     per core     at a time    Careful, Thinker,  that knows        the real app
                     sums up                                style players      where the rules
                                                            (look-ahead uses   come from
                                                            the engine's fast core)

check.mjs ──▶ spike-rules.mjs ──▶ spike/index.html    the spike's rules, kept only to compare against
```

| File | What it is |
|---|---|
| `engine.mjs` | The **connector** to the rules, `packages/engine`. It turns the engine's game states into the readable boards and moves the rest of the playtest uses. |
| `players.mjs` | The **computer players**. Each one gets a position and its legal moves and picks one. Careful and Thinker look ahead a fixed 2 or 3 moves on the engine's fast core. Style players are Careful with one habit (Turtle, Rusher, Combiner, Never-combiner, Hunter). |
| `deep.mjs` | **Deep**, the stronger player, built from chess-engine techniques: it looks one move deeper at a time until its budget of positions runs out, remembers positions, tries promising moves first, follows captures and checks to the end, and treats repeated positions as draws. The file's header lists what was measured to help and what didn't. |
| `evaluate.mjs` | **Scoring a position** without looking ahead: piece values, mobility, pressure on the enemy Wizard. Shared by all look-ahead players. Three value tables: `standard` and `flat` (guesses), and `tuned` (learned by `tune.mjs`). |
| `rating.mjs` | **Ratings** on the chess Elo scale from a round robin, with uncertainty ranges. |
| `tune.mjs` | **Learns piece values** from finished games: which values best predict who went on to win ("Texel tuning"). |
| `chess/` | **Chess, for calibration**: chess rules (`rules.mjs`, checked by `perft.mjs` against the published totals), the chess adapter for Deep (`players.mjs`), a game loop (`game.mjs`) and value learning (`tune.mjs`). The same tests on a game whose answers are known show how far the Elements results can be trusted (FINDINGS §12). |
| `formations.mjs` | **Starting setups**: your default formation, the engine's presets, mirror images, small random changes (`mutate`), random ones, two Earth fortresses, two good ones from the formation search (Fire forward), the Earth shield, and "minus one piece" for the handicap test. |
| `game.mjs` | Plays **one game** and records every move, capture and combine. It can also play the first few moves at random, so the deeper players don't replay the same game. |
| `pool.mjs` | Spreads games over all processor cores. |
| `experiments.mjs` | The **experiments from the plan**, each a list of games. |
| `search.mjs` | The **formation search**: tries many formations against the default, keeps the best, varies them for a few rounds, then plays the finalists against each other. Second version: a league played by Deep 2k, keeping formations that differ from each other. Writes `results/formation-search-deep.json` (the first version's results are in `formation-search.json`). |
| `formation-study.mjs` | **What makes a formation strong**: plays about 550 varied formations against the seven presets, then fits which features of a formation go with a higher score (FINDINGS §14). Writes `results/formation-study.json`. |
| `run.mjs` | Runs one experiment and writes `results/<name>.summary.json` (kept) and `results/<name>.json` (every game, not committed). |
| `stats.mjs` | Win rates with their uncertainty, endings, game length, piece activity. |
| `board.mjs` | Board diagrams for FINDINGS.md and replaying a recorded game. |
| `check.mjs` | Plays 200 random games with both the engine and the spike's rules, under each variant, and checks that both offer the same legal moves in the same order and reach the same result. |
| `spike-rules.mjs` | Loads the spike's rules (without copying them), only for `check.mjs`. |
| `analyze.mjs` | Looks inside recorded games: who gives checkmate and by which route, captures by element, comebacks, quickest wins. |

## Rules versions

The engine plays rules v0.3 by default: Water bends diagonally and goes one way per move (GAME_SPEC §3). The playtest keeps the v0.2 Water as its own default, so every earlier experiment replays exactly. Experiments of the v0.3 game pass `V03` from `engine.mjs` (FINDINGS §15).

## Running it

Needs only Node (no installs).

```sh
cd playtest
node check.mjs              # the engine still plays exactly the spike's game
node run.mjs                # lists the experiments
node run.mjs ladder 0.1     # one experiment at a tenth of its size, for a quick try
node run.mjs ladder         # full size; Thinker games take a while
node analyze.mjs colours    # how the games in an experiment were won
node run.mjs rating         # the rating ladder of all look-ahead players
node tune.mjs selfplay      # learn piece values from the self-play games
node chess/perft.mjs        # the chess rules match the published perft totals
node run.mjs chessRecheck   # the key tests on chess, for calibration
node search.mjs             # the formation search (about 8 minutes on 14 cores)
node formation-study.mjs collect   # what makes a formation strong: the games (about 25 minutes)
node formation-study.mjs fit       # ...and the features that predict a formation's score
node run.mjs mirrorCheck    # are the presets' mirror images as strong?
node run.mjs presets20k     # the presets' round robin with the strongest bot (about 20 minutes)
node run.mjs waterRules     # Water movement rules compared (also waterBends, waterOneWay; WATER-RULES.html)
node run.mjs v03strong      # rules v0.3 against v0.2 with Deep 20k (also v03recheck, v03styles, presetsV03)
node search.mjs 1 v03       # the formation search under rules v0.3
```

The players don't play the placement phase: games start from finished formations.

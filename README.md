# Elements

A digital version of **Elements**, a two-player abstract strategy game I designed. Fire, Wind, Earth and Water pieces and a Wizard on a 9×9 board, with no dice and nothing hidden. The goal is to play it with friends on iPad and iPhone first, then on Android and the web.

You can already play the prototype against the computer: https://elements-game-kappa.vercel.app

![The prototype at the start of a game: both sides in formation, White to move](docs/images/prototype.png)

The game itself isn't licensed for reuse. All rights reserved.

## How it plays

Each player has 13 pieces: a Wizard, plus Fire, Wind, Earth and Water in sizes 1, 2 and 3. A piece's size is how far it can move, and nothing jumps over other pieces.

- **Fire** moves along rows and columns.
- **Wind** moves diagonally.
- **Earth** moves in any direction, but it can't capture and can't be captured. Its job is to block lines of attack.
- **Water** flows straight forward or back along its column. Next to an Earth piece (yours or your opponent's) it can bend diagonally around it, and it can slide along the edge of the board.
- **The Wizard** moves one square in any direction, like a king in chess.

You capture by landing on an enemy piece. Size doesn't matter in a fight, so a Water 1 can take a Fire 3.

You can also move a piece onto one of your own to **combine** them. A stack moves as either element (one kind of move per turn) with the larger of the two ranges, but if it's captured you lose both. Earth in a stack loses its protection and fights as the other element, which gives you a way back into a game after you've lost your attackers.

![Mid-game: White's Wind 3 + Water 1 stack on c4 is selected. It can take Black's stack on f7 diagonally as Wind, or flow up to c6 as Water and bend around Black's Earth on c7 to take the Fire on b7](docs/images/midgame.png)

*White's Wind + Water stack on c4 is selected. As Wind it can take Black's stack on f7. As Water it can flow up the c-file and bend around Black's Earth on c7 to take the Fire on b7.*

Before the game, each player builds a formation in the three rows nearest them. The app comes with preset formations, so you can start right away. You win by checkmating the other Wizard or by capturing all of their attacking pieces (everything except plain Earth).

The middle 3×3 of each home zone is a **castle**. If your Wizard gets into the enemy castle, it can bring back one of your captured pieces into your own castle instead of moving. This rule came out of playtesting, as a fix for endgames that stalled into draws.

![Late game: White's Wizard stands in Black's castle on f7 and has brought back its Wind 3 onto e3, which checks Black's Wizard on c5](docs/images/castle-return.png)

*White's Wizard has walked into Black's castle (f7) and brought back its captured Wind 3 onto e3, which puts Black in check.*

![Checkmate: White's Earth steps to e5, and the Water + Fire stack on e6 bends around it onto Black's Wizard on f5](docs/images/checkmate.png)

*Checkmate. White's Earth steps from f4 to e5, and the Water + Fire stack on e6 can now bend around it onto Black's Wizard.*

The full rules, with the reasons behind each decision, are in [GAME_SPEC.md](GAME_SPEC.md).

## Playtesting with computer players

Before asking people to test every rule change, I had the computer play. [playtest/](playtest/) has bots ranging from random moves up to Deep, a search player built from chess-engine techniques with piece values learned from 8,000 games. In about 216,000 games they answered:

- **Is it fair?** White's first-move edge is small, close to what it is in chess.
- **Does skill matter?** Each bot that looked further ahead beat the one below it 92–99% of the time, and the weaker one never won.
- **Is there a cheap way to win?** No. An Earth wall can't hold, there's no forced quick win, and rushing, hunting the Wizard or turtling all lose to balanced play.
- **Are the pieces balanced?** Water came out strongest and gave most of the checkmates. After I also found its attacks hard to see at the table, the bots compared ten versions of the Water rule, and the current one (diagonal bends, one direction per move) is what came out of that.
- **Which formation is best?** My own formation from the physical prototype came last of nine strong ones. The default is now one that a formation search found, and mine is still there as one of seven other presets.
- **How often are games drawn?** Up to a third of games ended in a draw, usually because too few attackers were left to finish the game. With the castle return and chess's draw rules, that's down to 7–10%, about as often as the same bots draw at chess.

To find out how far the bots can be trusted, I ran the same tests on chess, where the answers are known. The rankings come out right, but the exact numbers less so. Everything is in [playtest/FINDINGS.md](playtest/FINDINGS.md).

## Where things are

| Path | What |
|---|---|
| [AGENTS.md](AGENTS.md) | Instructions for AI coding assistants working in this repo (Claude Code, Codex, Cursor, Copilot, …) |
| [GAME_SPEC.md](GAME_SPEC.md) | The game rules: the source of truth for everything the engine does |
| [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | Product and technical decisions (D1…), plus open questions |
| [docs/research/](docs/research/) | Research behind the decisions: tech stack, architecture, 2D game frameworks |
| [spike/](spike/) | Throwaway prototype for trying the game on screen (D11); task in [spike/BRIEF.md](spike/BRIEF.md) |
| [packages/engine/](packages/engine/) | The rules engine of the real app (D7, D8, D13): pure TypeScript, tested against the spec, perft totals and the spike; see its [README](packages/engine/README.md) |
| [playtest/](playtest/) | Computer players that play the game against each other to test balance (D12); results in [playtest/FINDINGS.md](playtest/FINDINGS.md) |

## Running the tests

Needs Node 24 (it runs TypeScript directly). Run `npm install` once for the type checker, then:

```sh
npm test            # the engine's rules tests
npm run typecheck
```

# Elements

A digital version of **Elements**, an abstract two-player strategy board game (chess-inspired, with Fire, Wind, Earth and Water pieces and a Wizard). The goal is to play it with friends on iPad and iPhone first, then on Android and the web.

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

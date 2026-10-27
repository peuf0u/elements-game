# Elements — Product Brief

What we're building and the product decisions made so far. Game rules live in [GAME_SPEC.md](GAME_SPEC.md); this file covers everything around them.

## Goal

Turn the Elements board game into a digital game that friends can play together, starting on iPhone and iPad.

## Decisions

| # | Decision | Date |
|---|---|---|
| D1 | **First version is same-device play**: two players on one iPad/iPhone, taking turns. No server, no accounts. | 2026-10-27 |
| D2 | **Online play between friends comes later**, as a second iteration. | 2026-10-27 |
| D3 | **iPad is a first-class target**: the game must play *well* on iPad, not just scale up from the phone. | 2026-10-27 |
| D4 | **Cross-platform is wanted**: iOS and iPadOS first, with web and Android (and whatever comes next) without a rewrite. | 2026-10-27 |
| D5 | **The rules engine is pure and platform-independent**: game state and moves are plain, serializable data, and the engine just turns (state, move) into a new state. This keeps D2 cheap, because the same engine can run on a server or a second device later. | 2026-10-27 |
| D6 | **v1 = core rules only**; proposed mechanics and rule experiments come in as variant toggles (see GAME_SPEC.md "v1 scope"). | 2026-10-18 |
| D7 | **TypeScript end to end.** The rules engine is a standalone pure TypeScript package (`packages/engine`) that the app, the AI bot worker and a future server import unchanged. Both short-listed app stacks use it. See [tech-stack research](docs/research/tech-stack.md). | 2026-10-27 |
| D8 | **Engine architecture** follows [architecture research](docs/research/architecture.md): immutable public API, the game stored as its action log pinned to a rules version, moves as `(from, to)`, pseudo-legal generation plus a Wizard-safety filter, variants as a config object, and one player interface for local, bot and remote players. | 2026-10-27 |
| D9 | **Presentation (final): PixiJS 8 + GSAP for the board, inside a React + Vite app shell, wrapped with Capacitor** for the App Store and Play Store; the same build is the website. Chosen for its higher ceiling for a rich, game-like interface (effects, a later 3D mode), built-in accessibility and team maintenance. The first board build is checked on a real iPad for sharpness, Stage Manager/Split View resizing, smooth dragging (including Low Power Mode) and no stutter while the bot thinks. **Alternative candidates**, if Pixi falls short on a check it can't fix: Konva (simplest interaction model) and Phaser (full game framework, project-health concerns). See [2D game framework research](docs/research/2d-game-frameworks.md). | 2026-10-27 |
| D10 | **The game is a self-contained module** (`mountGame(element, hostPort)`: board, session and bot) that talks to its host only through a small, versioned JSON message protocol. Haptics and storage are requests to the host. The React shell uses it in the same process from day one, and a native SwiftUI or Compose shell can host it later in a WebView without rework. See [2D game framework research §6.8](docs/research/2d-game-frameworks.md). | 2026-10-27 |
| D11 | **Build approach: a throwaway spike first, then a proper incremental build.** The spike is a quick playable version to try the game on screen. Architecture doesn't matter there; it lives in its own `spike/` folder and is never promoted to production. If the game works on screen, it is rebuilt properly and incrementally (a walking skeleton: a thin slice through all layers first, then one rule at a time), step by step so the designer understands the structure. Lessons from the spike go back into GAME_SPEC.md and this brief. | 2026-10-27 |

## Open

- **Spike scope and delivery**: what the spike includes, and how to open it on the iPad.
- **v2 backend**: Firebase vs Supabase, decided when online play starts.
- **Native shells** (SwiftUI and Compose): not for v1. Reconsider for v2 online play (friends, notifications, Game Center). D10 keeps that door open.
- **Accounts**: Apple Developer ($99/year) and Google Play ($25 once). New personal Play accounts must run a closed test with 12 testers for 14 days before release, so start that early.
- **Undo policy**: suggested free undo on a shared device, undo by request online, configurable against the bot (architecture research A7).
- Visual identity: names and look of the two sides, and the form of the element pieces (GAME_SPEC.md deferred Q5).
- Same-device UX on iPad: rotate the board between turns, or keep one orientation that reads from both sides?
- How online play works (D2): turn-based over days with notifications, or live sessions, or both.

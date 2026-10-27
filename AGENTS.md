# Elements

A digital version of the Elements board game, built with AI assistance by its designer, who isn't a game developer.

## Sources of truth

- **Rules** → `GAME_SPEC.md`. Read it before touching anything that decides what's legal. When a rule is unclear or missing, ask the designer, then record the answer in the spec (marked `✅ (designer, …)`) in the same change.
- **Decisions** → `PRODUCT_BRIEF.md` (D1, D2, …). Read it before any product or technical choice. Record new decisions and open questions there.
- **Why a decision was made** → `docs/research/`. Read it when revisiting or questioning a decision.

## Two tracks

- **`spike/`** is a throwaway prototype for trying the game on screen (D11). Its task is in `spike/BRIEF.md`. Speed beats structure there. Its value is the lessons, written up in `spike/LESSONS.md`.
- **The real app** is built fresh and incrementally as a walking skeleton (D11), following the architecture in D7–D10. It never imports or copies code from `spike/`.

## Working with the designer

- **Teach the structure as it grows.** In the real app, each new folder, package or architectural piece comes with a short plain-language explanation: what it is, why it's there, and how it connects to the rest. The designer wants to understand the codebase, not just have one.
- Discuss rule questions in game terms (squares, pieces, turns), with a small board diagram when it helps.

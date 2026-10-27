# Elements: software architecture research

*Research date: 2026-10-27. Scope: architecture patterns only. The framework and stack comparison lives in [tech-stack.md](tech-stack.md); this document is deliberately stack-agnostic. Code sketches are TypeScript-like pseudocode.*

Inputs: [GAME_SPEC.md](../../GAME_SPEC.md) (rules v0.2) and [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md) (decisions D1–D6).

---

## TL;DR

1. Build Elements in **three layers**: a **pure rules engine** (no UI, no I/O, no clock, no randomness), a thin **game session** (controller) that owns the current game and talks to players, storage and later the network, and a **presentation** layer that only draws state and turns taps into intents. This is "functional core, imperative shell", and it is how chess.js, scalachess (lichess) and Stockfish are separated from their UIs.
2. The engine's whole public API is four functions over plain data: `initialState(config)`, `legalActions(state)`, `apply(state, action) → { state, events }`, and `status(state)`. Everything else (AI, server, tests, UI highlights) is built on those four.
3. **A game is its action log.** Store `{ rulesVersion, config, actions[] }` and rebuild state by replaying. Undo, redo, save/load, replays, bug reports, online sync and regression tests then all come from one mechanism.
4. Use **pseudo-legal move generation plus a legality filter** ("does this move leave my Wizard attacked?"), the way chess.js does. Use the *same* attack code for check detection, so Water's bending paths and Earth blocking can't drift apart. Keep a **Zobrist hash** in the state for threefold repetition now and for the AI's transposition table later.
5. Keep the engine API **immutable** (a move returns a new state). An 81-square board is cheap to copy. Add a mutable make/unmake board inside the AI package only if profiling shows a need, and prove the two match with property tests.
6. Model **game phases** (formation → play → over) as an explicit state machine inside the engine, and **UI interaction** (idle → selected → animating → handover) as a separate explicit machine in the shell. Don't let boolean flags grow.
7. Put **every player behind one interface** (`chooseAction(view) → Promise<Action>`): local human, bot and remote human. Pass-and-play, vs-computer and online then differ only in which two players the session gets.
8. For v2, make the **server authoritative**: it runs the same engine package, validates each action, appends it to the stored log, and sends a push notification. Clients apply moves optimistically. Each game is pinned to the rules version and variant config it started with. Real-time netcode (lockstep, client prediction) mostly doesn't apply. **Constraint for the stack decision:** the engine has to run on the server too.

---

## Reference architecture

```
┌──────────────────────── PRESENTATION  (imperative shell, platform-specific) ──────────────────────┐
│  BoardView · PieceView · highlights · animation queue · accessibility layer · handover screen     │
│        ▲ renders a ViewModel derived from GameState          │ user intents (tap square,          │
│        │ plays animations from engine Events                 ▼  confirm, undo, resign)            │
│  UI interaction state machine:  idle → selected → submitting → animating → (handover) → idle      │
└────────▲──────────────────────────────────────────────────────┬───────────────────────────────────┘
         │ (state, events)                                      │ Action  (plain, serializable data)
┌────────┴──────────────────────────────────────────────────────▼───────────────────────────────────┐
│  GAME SESSION  (controller, imperative shell)                                                     │
│   • holds GameRecord { rulesVersion, config, actions[] } and the current GameState                │
│   • loop: player = players[state.toMove]; action = await player.chooseAction(view)                │
│           validate with engine → append to log → persist → broadcast events                       │
│   • owns side effects: storage, clock/timer, network, push, haptics, sound                        │
│                                                                                                   │
│   Player adapters:  LocalHuman (UI) │ Bot (worker/isolate) │ Remote (v2: server)                  │
│   Storage adapters: local file/db (v1) │ server API (v2)                                          │
└────────▲──────────────────────────────────────────────────────┬───────────────────────────────────┘
         │ return values only                                   │ pure function calls
┌────────┴──────────────────────────────────────────────────────▼───────────────────────────────────┐
│  RULES ENGINE  (functional core: pure, deterministic, no I/O / clock / randomness)                │
│   initialState(config)   legalActions(state)   apply(state, action) → {state, events}             │
│   status(state)          viewFor(state, player)   encode/decode notation   replay(record)         │
│   internals: board model · move generation (pseudo-legal + Wizard-safety filter) · attack map ·   │
│              Water path search · Zobrist hashing · draw/win detection · RulesConfig (variants)    │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ the same engine package is imported, unchanged, by:
          ├── AI package (search + evaluation; runs off the main thread)        [later]
          ├── Server (v2): validates actions, stores logs, sends push           [v2]
          └── Test suite: spec examples · perft · property/random playouts · golden replays
```

Dependency rule: arrows point **down only**. The engine imports nothing from the layers above it. The AI imports only the engine. The UI never computes a rule itself.

---

## 1. Layering: functional core, imperative shell, one-way data flow

**Pattern.** Gary Bernhardt's "Functional Core, Imperative Shell" splits a program into a *functional core* that holds the logic as pure values and functions, and a *shell* of imperative code that "manipulates stdin, stdout, the database, and the network, all based on values produced by the functional core" ([Destroy All Software](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)). The Elm Architecture applies the same idea to interactive programs, and the Elm guide explicitly includes games: a **Model** ("the state of your application"), a **View** ("a way to turn your state into HTML") and an **Update** ("a way to update your state based on messages") ([Elm guide](https://guide.elm-lang.org/architecture/)). Side effects are requested as `Cmd`/`Sub` values that the runtime carries out ([Elm guide: effects](https://guide.elm-lang.org/effects/)). Redux describes the same loop as **one-way data flow**: state describes the app, the UI renders from state, an event updates state, and the UI re-renders ([Redux fundamentals](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow)). A reducer is `(state, action) => newState` and must not mutate, run async code, or "calculate random values" ([same page](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow); [Redux style guide](https://redux.js.org/style-guide/)).

Chess software is split the same way. chess.js calls itself a library for "move generation/validation, piece placement/movement, and check/checkmate/stalemate detection", "basically everything but the AI" ([chess.js](https://github.com/jhlywa/chess.js)). In lichess, "pure chess logic is contained in the scalachess submodule" ([lila README](https://github.com/lichess-org/lila)), and scalachess describes itself as "entirely functional, immutable, and free of side effects" ([scalachess](https://github.com/lichess-org/scalachess)). Stockfish "does not include a graphical user interface" and talks to GUIs over the UCI protocol ([Stockfish README](https://github.com/official-stockfish/Stockfish)).

**Why it matters for Elements.**
- D5 already requires the core to be pure and serializable. This layering is how you keep that promise once UI code starts piling up.
- Each later milestone plugs into a layer that already exists: online (v2) adds a server *shell* around the same core, the AI is a new *client* of the core, and variants are *configuration* of the core. None of them rewrites the core.
- AI coding assistants do better with small, pure, well-tested modules. A rules engine you can test without launching the app is the easiest kind of code to get right with an assistant.

**The three layers, concretely.**

| Layer | Owns | Must not |
|---|---|---|
| **Rules engine** | board model, legal moves, applying moves, win/draw detection, hashing, notation, variants | touch UI, storage, network, timers, `Date.now()`, `Math.random()` |
| **Game session** | the current `GameRecord`, the turn loop, the players, persistence, timers, sound/haptics triggers, network | decide whether a move is legal (it asks the engine) |
| **Presentation** | drawing, animation, input, accessibility, the interaction state machine | store authoritative game state or re-implement any rule |

```ts
// The whole engine surface. Everything is plain JSON-serializable data.
initialState(config: RulesConfig): GameState
legalActions(state: GameState): Action[]
apply(state: GameState, action: Action): { state: GameState; events: GameEvent[] } // throws/returns error if illegal
status(state: GameState): { phase; toMove; inCheck; result?: Result }
viewFor(state: GameState, player: Side): PlayerView   // identity in v1; hides info for hiddenSetup later
```

---

## 2. Rules engine design

### 2.1 Data model

Model the data from the spec's *meaning*, not from pyramids (GAME_SPEC §2: a piece is element + size + owner).

```ts
type Side = 'white' | 'black'                       // placeholder names (GAME_SPEC open Q5)
type Element = 'fire' | 'air' | 'earth' | 'water'
type Unit = { element: Element; size: 1 | 2 | 3 }
type Piece =
  | { kind: 'wizard'; owner: Side }
  | { kind: 'element'; owner: Side; units: [Unit] | [Unit, Unit] }   // 2 units = a stack, never splits
type Square = number                                // 0..80, index = rank * 9 + file  ("a1".."i9" in notation)

type GameState = {
  rulesVersion: string
  config: RulesConfig                              // variant toggles, see §10
  phase: 'formation' | 'play' | 'over'
  board: (Piece | null)[]                          // 81 cells
  toMove: Side
  reserve: Record<Side, Array<'wizard' | Unit>>    // pieces not yet placed (formation)
  pliesSinceIrreversible: number                   // for the 50-move rule: reset on capture or combine
  hash: string                                     // Zobrist hash of the current position (see 2.4)
  recentHashes: string[]                           // hashes since the last irreversible move (repetition)
  result?: { winner: Side | null; reason: 'checkmate' | 'elimination' | 'stalemate' | 'repetition' | 'fiftyMove' | 'agreement' | 'resign' }
}

type Action =
  | { type: 'place'; piece: 'wizard' | Unit; to: Square }  // formation phase
  | { type: 'move'; from: Square; to: Square }             // play: move, capture, or combine
  | { type: 'offerDraw' } | { type: 'acceptDraw' } | { type: 'resign' }
```

A useful fact about Elements: **a play move is fully identified by `(from, to)`**. The resulting position doesn't depend on which path Water took, or whether a Fire+Wind stack moved "as Fire" or "as Wind" (GAME_SPEC §5). So the action, the notation and the network message stay tiny. The engine can still return a display path for animation (see §6).

The board representation question that chess engines care about (bitboards vs "mailbox" arrays, [CPW: Board Representation](https://www.chessprogramming.org/Board_Representation)) barely matters at 81 squares and 26 pieces. A plain 81-cell array (a "mailbox": one array slot per square) is the simplest choice. Note that an 81-square board doesn't fit a 64-bit bitboard anyway. Stockfish keeps a per-square array *and* per-type bitboards side by side ([Stockfish position.h](https://github.com/official-stockfish/Stockfish/blob/master/src/position.h)). chess.js uses a padded "0x88" array for cheap off-board checks ([chess.js source](https://github.com/jhlywa/chess.js/blob/master/src/chess.ts)). Either trick can be added later behind the same API.

### 2.2 Immutable state vs make/unmake

There are two ways to step through moves:

- **Immutable / copy-make:** `apply(state, move)` returns a new state and leaves the old one alone. Undo means keeping the old state. This is what Redux and scalachess do, and what D5 asks for.
- **Make/unmake:** a single mutable board. `makeMove` changes it in place, and `unmakeMove` reverses the change using saved information. Stockfish does this: `do_move(m, StateInfo&)` and `undo_move(m)`, where `StateInfo` "stores information needed to restore a Position object to its previous state when we retract a move" ([position.h](https://github.com/official-stockfish/Stockfish/blob/master/src/position.h)). The Chess Programming Wiki notes that irreversible details (in chess: en passant, castling rights, halfmove clock) have to be saved on a stack, because they can't be derived from the move ([CPW: Unmake Move](https://www.chessprogramming.org/Unmake_Move)). chess.js is also mutable with an internal `_makeMove` and `_undoMove` ([chess.ts](https://github.com/jhlywa/chess.js/blob/master/src/chess.ts)).

The trade-off is speed vs safety. Search engines visit millions of positions, and copying a whole position per node costs memory bandwidth ([CPW: Copy-Make](https://www.chessprogramming.org/Copy-Make)). Mutable code is easier to get subtly wrong, though, and it can't be shared safely with UI or worker code.

**Indicative numbers for Elements' board size.** This was a throwaway micro-benchmark on an Apple M4 Pro with Node 24, 5 M iterations each. It is not rigorous: real move generation will dominate.

| Approach (81-cell board, 1 move applied) | ns per move |
|---|---|
| make + unmake on one mutable array | ~2 |
| copy a plain JS array of 81 cells + spread a new state object | ~64 |
| copy an `Int16Array(81)` with `.slice()` | ~408 |

Even the immutable variant allows roughly 15 M state copies per second, far more than the move generator will produce at first. **Recommendation:** keep the immutable API (D5) everywhere. If the AI later needs more speed, give the AI package its own internal mutable `SearchBoard` with make/unmake. Prove it equals the reference engine with a property test (`hash(makeMove(b, m)) == hash(apply(s, m).state)` and `unmake(make(b, m)) == b` for random positions). The immutable engine stays the "source of truth" for the UI and server.

### 2.3 Move generation: pseudo-legal + legality filter

Chess engines distinguish **pseudo-legal** moves (moves that follow each piece's movement rules but may leave your own king in check) from **legal** moves ([CPW: Move Generation](https://www.chessprogramming.org/Move_Generation)). With pseudo-legal generation, "it is left up to the move-making function to test the move". Strictly legal generation has to handle pins, which the wiki calls "the main difficulty" ([same page](https://www.chessprogramming.org/Move_Generation)). chess.js takes the simple route: it generates pseudo-legal moves, then for each one makes it, checks `_isKingAttacked(us)`, and undoes it ([chess.ts `_moves`](https://github.com/jhlywa/chess.js/blob/master/src/chess.ts)).

For Elements this is clearly the right first design, because the attack rules are unusual:
- Water attacks along **bending paths** around plain Earth and along the board edge (GAME_SPEC §3), so it "can give check around an Earth piece" (§6).
- Plain Earth blocks lines and can't be captured. Combined Earth loses both properties and stops being a bank for Water (§5).
- Stacks move as *either* element (§5).

A hand-written "is the Wizard attacked?" function would have to duplicate all of this. Instead, define attacks as "squares the opponent's pseudo-legal moves could capture on" and reuse one generator:

```ts
function legalActions(s: GameState): Action[] {
  if (s.phase === 'formation') return placementActions(s)
  if (s.phase === 'over') return []
  return pseudoLegalMoves(s, s.toMove)
    .filter(m => !isWizardAttacked(applyUnchecked(s, m), s.toMove))
}
function isWizardAttacked(s: GameState, side: Side): boolean {
  const w = wizardSquare(s, side)
  return pseudoLegalMoves(s, opponent(side)).some(m => m.to === w)   // same generator → Water/Earth rules stay in one place
}
```

Water is the only non-trivial generator: a depth-limited path search (1..N steps of *flow*, *bank around Earth*, or *bank along edge*, no square revisited, every square on the path empty except a final enemy). Deduplicate by destination, and remember one path per destination for animation. The spec's worked example (Water at b2, Earth at c3) turns directly into test cases (§9).

Optimizations such as precomputed attack tables and pin detection can come later, behind `legalActions`, once perft tests (§9) lock the behavior in.

### 2.4 Position hashing (Zobrist)

**Zobrist hashing** turns a position into a fixed-size number. At startup you generate a pseudorandom number "for each piece at each square" (plus side-to-move and other state), and the hash is the XOR of the numbers for everything present. Because XOR is its own inverse, a move updates the hash incrementally: XOR out the piece on its old square, XOR it in on the new square, XOR out any captured piece, and toggle the side-to-move key ([CPW: Zobrist Hashing](https://www.chessprogramming.org/Zobrist_Hashing)). Collisions are inherent. 64-bit keys are standard, while a 32-bit key is expected to collide after about 2^16 positions (birthday problem) ([same page](https://www.chessprogramming.org/Zobrist_Hashing)).

Two uses in Elements:
1. **Threefold repetition** (GAME_SPEC §6, provisional). Engines keep the hashes of earlier positions and compare only back to the last irreversible move ([CPW: Repetitions](https://www.chessprogramming.org/Repetitions)). chess.js keeps a `Map<hash, count>` and declares threefold repetition at count ≥ 3 ([chess.ts](https://github.com/jhlywa/chess.js/blob/master/src/chess.ts)). scalachess stores position hashes in the game history and compares only positions with the same side to move ([scalachess Hash.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Hash.scala)). In Elements, captures and combines are irreversible (they also reset the 50-move counter per §6), so the list only needs to reach back to the last one.
2. **AI transposition table** (later). This is a hash table of already-searched positions storing best move, depth, score and bound type ([CPW: Transposition Table](https://www.chessprogramming.org/Transposition_Table)).

For Elements, generate one key per `(owner, pieceCode, square)`, where `pieceCode` identifies a single unit or a two-unit stack, plus a side-to-move key. Seed the PRNG with a fixed constant so hashes are identical on every device and on the server. chess.js does this with a fixed-seed xoroshiro128 ([chess.ts](https://github.com/jhlywa/chess.js/blob/master/src/chess.ts)). In JavaScript, 64-bit keys need `BigInt` (as chess.js uses) or two 32-bit halves. Store the hash as a string in serialized state.

### 2.5 Win, draw and phase detection

`status(state)` (or `apply`, which records `result`) checks after every move, in this order: opponent has no capturing pieces left → elimination win; opponent has no legal moves → checkmate if in check, stalemate (draw) otherwise; repetition; 50-move rule. Elements has two win conditions, so the order and the tie-breaks should be written down in the spec and pinned by tests.

**Engine-relevant gaps in GAME_SPEC v0.2** (found while designing the engine; none block starting work, but each needs an answer to write `apply`):
- Who places first in formation? (§6 says both place the Wizard first, but not which side starts.)
- Can a formation end with a Wizard already attacked, or can a placement "give check"? What happens on the first play move if so?
- "Combined Earth no longer blocks attacks" (§5): does the combined piece still block sliding *movement* like any other occupied square? Presumably yes, since pieces never jump.
- Draw by agreement and resignation need actions (included above) and a UI flow.

---

## 3. Moves as commands, and the game as an event log

**Command pattern.** Robert Nystrom: "A command is a reified method call", meaning a request turned into an object you can store and pass around ([Game Programming Patterns: Command](https://gameprogrammingpatterns.com/command.html)). The same chapter covers undo ("we keep a list of commands and a reference to the 'current' one", and redo advances the pointer), AI ("the AI code simply emits Command objects"), networking ("if we take those commands and make them serializable, we can send the stream of them over the network") and replays ("to replay the game, the engine just runs the normal game simulation, executing the pre-recorded commands") ([same chapter](https://gameprogrammingpatterns.com/command.html)).

**Event sourcing.** Martin Fowler: "Capture all changes to an application state as a sequence of events". You can then rebuild state completely by replaying, query the state at any past point, and cache snapshots ("since an application state is purely derivable from the event log, you can cache it anywhere you like") ([Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)). Redux makes the same point about actions: "as actions are just plain objects, they can be logged, serialized, stored, and later replayed for debugging or testing purposes" ([Redux: Three Principles](https://redux.js.org/understanding/thinking-in-redux/three-principles)). Lichess stores games as an encoded *move list*, not as positions. Its storage code decodes the moves and rebuilds the board, position hashes, castling rights and halfmove clock by replaying them ([lila PgnStorage.scala](https://github.com/lichess-org/lila/blob/master/modules/game/src/main/PgnStorage.scala)).

**For Elements:** the source of truth is the `GameRecord`.

```ts
type GameRecord = {
  id: string
  rulesVersion: string          // pins the rules this game is played under (see §7)
  config: RulesConfig           // variant toggles
  players: { white: PlayerInfo; black: PlayerInfo }
  actions: Action[]             // formation placements + play moves, in order
  createdAt: string             // metadata lives here, never inside GameState
}
const replay = (r: GameRecord) =>
  r.actions.reduce((s, a) => apply(s, a).state, initialState(r.config))
```

What this gives you:
- **Save/load:** serialize the record (a few KB at most). Optionally cache the latest `GameState` as a snapshot, but always be able to rebuild it from the log.
- **Undo/redo:** `actions.slice(0, -1)` and replay, or keep a stack of past states. Redux's `past / present / future` recipe is exactly this ([Redux: Implementing Undo History](https://redux.js.org/usage/implementing-undo-history)). Since states are immutable, keeping old states is free. Whether undo is allowed (pass-and-play takebacks, online takeback requests, never vs a bot?) is a **product rule** for the session layer, not the engine.
- **Replays and review:** step through `actions` and show `replayUpTo(n)`.
- **Bug reports and playtest data:** a playtester's game *is* a reproducible test case (§9).
- **Online sync (v2):** sending an action means appending one item to the log.

**Commands vs events.** It helps to separate the *request* (`Action`, which may be rejected) from what *happened* (`GameEvent[]` returned by `apply`: `placed`, `moved`, `captured`, `combined`, `check`, `gameOver`). Redux recommends naming actions as "events that occurred" rather than "setters" ([Redux style guide](https://redux.js.org/style-guide/)). The log stores actions, the minimal input. Events are derived output for the UI, sound and notifications.

**Notation.** Give Elements a short, human-readable text form from day one. It becomes the save format, the test fixture format, the online wire format and the screen-reader move announcement. Chess precedent: lichess's move format writes a placement ("drop" in crazyhouse) as `N@f3` ([scalachess Uci.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/format/Uci.scala)). A proposal:

| Action | Notation |
|---|---|
| place Wizard on e1 | `Z@e1` |
| place Fire size 3 on c2 | `F3@c2` |
| move / capture / combine | `c2-c5` (the engine knows from the board whether it was a capture or a combine. A display form like `c2xc5` or `c2+c5` can be generated) |

Add a position string format as well, like chess's FEN: one line for board + side to move + phase + clocks. It makes spec examples and test fixtures one-liners.

---

## 4. State machines: game phases and UI interaction

**Pattern.** Nystrom's State chapter starts from a character whose boolean flags (`isJumping`, `isDucking`, ...) produce combinations that "aren't valid". Every fix breaks something else. The cure is a finite state machine: "a fixed set of states", "only in one state at a time", inputs trigger transitions. Hierarchical states (a substate defers to its superstate) and pushdown automata (a stack of states) extend it ([Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)). Statecharts add nested and parallel states. "Using state machines makes it easier to find impossible states and spot undesirable transitions" ([Stately docs](https://stately.ai/docs/state-machines-and-statecharts)). boardgame.io builds phases into its framework: "a phase is a period in the game that overrides the game configuration while it is active", for example a different set of allowed moves ([boardgame.io: Concepts](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/concepts.md); [Phases](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/phases.md)).

**Two machines in Elements, kept separate.**

**(a) Game phase, inside the engine** (part of `GameState`, serializable):

```
formation ──(all 26 pieces placed)──▶ play ──(checkmate / elimination / draw / resign)──▶ over
   │ substates (v1):  wizards → elements        (alternating, open)
   │ substates (hiddenSetup variant): secretPlacement(white ∥ black) → reveal
```

`legalActions` depends on the phase (placements in formation, moves in play, nothing in over). This makes "can't combine during setup" (§6) a natural consequence instead of an `if`.

**(b) UI interaction, inside the presentation shell** (not saved, not shared):

```ts
type UiState =
  | { tag: 'idle' }                                            // waiting for a tap (or for the bot/remote)
  | { tag: 'selected'; from: Square; targets: Square[] }      // targets = legal destinations from engine
  | { tag: 'submitting'; action: Action }                      // v2: sent to server, awaiting ack
  | { tag: 'animating'; events: GameEvent[] }                  // input locked
  | { tag: 'handover'; next: Side }                            // pass-and-play: "pass the device"
  | { tag: 'waitingForOpponent' }                              // bot thinking / remote player's turn
  | { tag: 'gameOver'; result: Result }
```

A tagged union like this makes impossible combinations (e.g. "selected while animating") impossible to represent. The handover state matters especially for `hiddenSetup` in pass-and-play: the screen must hide the board until the next player confirms. The open question of whether to rotate the board between turns (PRODUCT_BRIEF "Open") becomes one transition in this machine.

A statechart library is optional. A discriminated union plus a `transition(uiState, uiEvent)` function is enough at this size and keeps the code portable.

---

## 5. Player abstraction: local, bot and remote behind one interface

**Pattern.** Nystrom's Command chapter points out that once input becomes commands, the same game can be driven by a human, the AI ("the AI code simply emits Command objects") or a network stream ([Game Programming Patterns: Command](https://gameprogrammingpatterns.com/command.html)). boardgame.io makes this concrete: a client can run its own game, or delegate to a "master". Its *Local* master "can run completely on the browser", which it recommends for pass-and-play ([boardgame.io: Multiplayer](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/multiplayer.md)). It also ships bots (`RandomBot`, `MCTSBot`) driven by an `enumerate` function that lists legal moves ([boardgame.io src/ai](https://github.com/boardgameio/boardgame.io/tree/main/src/ai)).

**For Elements:**

```ts
interface PlayerAgent {
  chooseAction(view: PlayerView, legal: Action[], signal: AbortSignal): Promise<Action>
}

class LocalHuman implements PlayerAgent { /* resolves when the UI reports a confirmed tap */ }
class Bot        implements PlayerAgent { /* posts state to a worker, resolves with its best move */ }
class Remote     implements PlayerAgent { /* v2: resolves when the server pushes the opponent's action */ }

async function runSession(record: GameRecord, players: Record<Side, PlayerAgent>) {
  let s = replay(record)
  while (s.phase !== 'over') {
    const action = await players[s.toMove].chooseAction(viewFor(s, s.toMove), legalActions(s), abort.signal)
    const { state, events } = apply(s, action)          // validate locally, always
    record.actions.push(action); await storage.save(record)
    ui.play(events); s = state
  }
}
```

| Mode | White | Black |
|---|---|---|
| v1 pass-and-play | LocalHuman | LocalHuman (+ handover screen) |
| vs computer | LocalHuman | Bot |
| v2 online | LocalHuman | Remote |
| balance testing | Bot | Bot |

The last row matters for this project. The designer wants to find dominant strategies and test variants (GAME_SPEC §8, v1 scope). Bot-vs-bot games run headless, using only the engine and AI with no UI. They can simulate thousands of games per variant setting (e.g. `exactRange` on vs off) and report win rate by side, draw rate and game length. You get this almost for free once the interface exists.

The `AbortSignal` handles undo, leaving the game, or the opponent resigning while a bot is still thinking.

---

## 6. Presentation concerns

**Keep the UI from owning rules.** The UI asks the engine for everything rule-related:
- **Legal-move highlights:** `legalActions(s).filter(a => a.from === selected).map(a => a.to)`. Show captures and combines differently, using the engine's preview events.
- **Check indicator, game-over banner, "your turn":** from `status(s)`.
- **Water path preview:** from an engine helper `displayPath(s, move)`. Water moves are not straight lines, so the arrow and the animation must follow the real path.

**Animate from events, not from state diffs.** Diffing two boards can tell you *that* a square changed, but not *why*. A diff can't reliably tell a capture from a combine (both leave one piece on the destination), and it can't recover Water's bending route. Have `apply` return events and play them through an animation queue. This is Nystrom's Event Queue pattern: "decouple when a message or event is sent from when it is processed" ([Game Programming Patterns: Event Queue](https://gameprogrammingpatterns.com/event-queue.html)).

```ts
type GameEvent =
  | { type: 'placed'; piece: Piece; at: Square }
  | { type: 'moved'; from: Square; to: Square; path: Square[] }
  | { type: 'captured'; at: Square; piece: Piece }          // a captured stack loses both units
  | { type: 'combined'; at: Square; result: Piece }
  | { type: 'check'; side: Side }
  | { type: 'gameOver'; result: Result }
// UI: state already updated → enqueue animations for events → lock input until queue drains
```

The same events drive sound, haptics, the move list and screen-reader announcements. The model updates immediately, and the view catches up through the queue. If the app is backgrounded mid-animation, it simply renders the current state.

**Accessibility of a board UI.**
- **Don't rely on colour alone.** Apple: "Convey information with more than color alone". Red-green and blue-orange pairings are hard for colour-blind players ([Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). Elements' prototype encodes element *by colour* (red/yellow/blue/brown, GAME_SPEC §2) and owner by a coloured tip. Give each element a distinct shape or icon, and show size as a number or pips.
- **Tap targets.** Apple's default control size on iOS/iPadOS is 44×44 pt, with a 28×28 pt minimum ([Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). A 9×9 board across a phone in portrait gets roughly 40–48 pt per square before margins. That is an estimate from typical iPhone widths, not verified per device. So it sits below the default but above the minimum, which supports D3's focus on iPad and argues for tap-to-select over small drag targets on phones.
- **Reduce Motion.** When it's on, "ensure your app or game responds by reducing automatic and repetitive animations" ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)). The animation queue should read this setting and shorten or skip animations.
- **Screen readers.** Each square needs a label ("e5, black Fire 3 + Wind 1, can capture"). Moves should be announced in plain language generated from events and notation. Lichess's blind mode is a good precedent: players type moves in algebraic notation and use commands to query the board, such as listing pieces of a type or scanning a rank or file ([lichess blind mode guide](https://lichess.org/page/blind-mode-guide)). On the web, the WAI-ARIA grid pattern gives arrow-key navigation between cells with a single tab stop for the whole grid ([WAI-ARIA APG: Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)).

All of this is easier because the UI reads plain state and events. An accessible text view of the board is just one more renderer of the same `GameState`.

---

## 7. Online turn-based architecture (v2)

### 7.1 Server-authoritative with a shared engine

In server-authoritative multiplayer, the server validates every action and the clients aren't trusted. Nakama: "all exchanges of gameplay data are validated and broadcast by the server" ([Nakama: Authoritative multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)). Colyseus describes itself as a framework "for building authoritative game servers" ([Colyseus docs](https://docs.colyseus.io/)). boardgame.io's model fits Elements closely: "the game logic runs on the master, which computes the next game state", while clients "also run the game in parallel (this is called an optimistic update)", and an incorrect client result "is overridden by the master eventually" ([boardgame.io: Multiplayer](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/multiplayer.md)).

For Elements, the server is mostly a thin wrapper around the engine:

```ts
// POST /games/:id/actions   body: { expectedPly, action }
async function submitAction(gameId, user, expectedPly, action) {
  const rec = await db.load(gameId)                         // GameRecord: { rulesVersion, config, actions[] }
  if (rec.actions.length !== expectedPly) return conflict(rec)   // stale client → send them the log
  const engine = engines[rec.rulesVersion]                  // pinned rules (7.4)
  const s = engine.replay(rec)
  if (sideOf(user, rec) !== s.toMove) return forbidden()
  const { state, events } = engine.apply(s, action)         // throws on illegal → 400
  rec.actions.push(action); await db.save(rec)              // append-only log
  await notify(opponentOf(user, rec), events)               // push + live socket if connected
}
```

- `expectedPly` is an optimistic concurrency check. Fowler's *Optimistic Offline Lock* "prevents conflicts between concurrent business transactions by detecting a conflict and rolling back the transaction" ([Fowler: Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)). It also makes retries safe: re-sending the same move after a timeout can't apply it twice.
- **Storage as move logs** follows the lichess approach of storing the move sequence and replaying to rebuild state ([lila PgnStorage.scala](https://github.com/lichess-org/lila/blob/master/modules/game/src/main/PgnStorage.scala)). An Elements game is a few hundred short actions at most, so it fits in one database row. Replaying it per request is cheap. Cache the latest state if needed.
- **Hidden information (future `hiddenSetup`, `hiddenElement`):** the server must not send the opponent's secret placements. boardgame.io's `playerView` returns "a version of G that is stripped of any information that should be hidden from that specific player", and moves that need secret data are marked server-only with `client: false` ([boardgame.io: Secret State](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/secret-state.md)). That is why `viewFor(state, side)` belongs in the engine API from v1, even though it returns the full state for now.

**Constraint for the stack decision (hand-off to tech-stack.md):** "the same engine on the server" means the server has to be able to *run* the engine's language. If the engine is TypeScript, any JS/TS server or serverless function can import it. If it's Dart, C#, GDScript or Kotlin, the server must run that runtime, or the engine must be compiled to something the server can run (e.g. WebAssembly or a JS target). This is a real input to the framework comparison.

### 7.2 Async turns and push notifications

Nakama distinguishes **active** turn-based play (players "remain connected for the duration of the match") from **passive** play where "the gameplay can span several hours to weeks". For passive play it suggests keeping match state in storage and using "a series of RPCs to manipulate the stored state and send notifications" ([Nakama: Multiplayer concepts](https://heroiclabs.com/docs/nakama/concepts/multiplayer/)). That is the shape of Elements v2 for friends: a database row per game, one endpoint to submit an action, and a push notification to the opponent.

**Push is a doorbell, not a data channel.** Apple describes APNs as "a best-effort service": it may reorder notifications, it stores only one pending notification per app when a device is offline, and notifications may be "throttled, saved in storage, and in some cases, not delivered" ([Apple: Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)). Apple's UserNotifications docs say delivery "isn't guaranteed" ([Apple: UserNotifications](https://developer.apple.com/documentation/usernotifications)). So the client must always fetch the authoritative game record when it opens or resumes, and never assume the notification carried the move.

### 7.3 Optimistic UI and reconnection

- **Optimistic UI:** after a local move, the client runs `apply` itself, which is legal by the same engine, animates immediately, and shows a quiet "sending..." state (`submitting` in §4). If the server rejects it (a conflict, or a rules-version mismatch), the client replaces its state with the server's log. boardgame.io describes this exact optimistic-update-then-override model ([Multiplayer](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/multiplayer.md)).
- **Reconnection:** because state is a log, reconnecting means "give me the record (or actions after ply N)". No delta protocol is needed. For live sessions over a socket, Colyseus's `allowReconnection(client, seconds | "manual")` holds a dropped player's seat for a time window or until manually released, and the client reconnects with a stored `reconnectionToken` ([Colyseus: Reconnection](https://docs.colyseus.io/room/reconnection)). For async play there is no "seat" to hold: the game simply waits in the database.
- **Live play** (both players online) uses the same protocol plus a socket or subscription that pushes new actions instantly. It's an optional transport, not a different architecture.
- **Turn timer** (a future variant): the engine must not read a clock (§1). The server owns time and turns a timeout into an action such as `{ type: 'timeout', side }`. The engine applies it like any other action, so replays stay deterministic.

### 7.4 Rules and variant versioning

Elements' rules are explicitly "work in progress" (GAME_SPEC §2), so this will happen: a rule changes while friends have games in progress.

Precedents:
- scalachess stores the **variant on every position** (`Position(board, history, variant, color)`), and the variant is resolved by a persisted id or key ([Position.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Position.scala); [Variant.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/variant/Variant.scala)).
- Fowler: when rules change over time, the changing logic belongs in the domain model (e.g. strategy objects chosen by date), and replaying old events through *changed* logic produces different results ([Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)).

Recommended policy:
1. Every `GameRecord` stores `rulesVersion` and `config`. **In-flight games finish under the rules they started with.** New games use the latest version.
2. The engine package exports a registry: `engines['0.2'] = ...`. A rules change creates a new version. Old versions are frozen: bug fixes only, and only if golden replays (§9) still pass.
3. The server sets a **minimum client version per rules version**. An app too old to play a game's rules version prompts an update instead of guessing.
4. Before releasing a rules change, **replay every stored game** under the new engine version in CI to see which games it would change.
5. Treat variant toggles as data (§10), so "new rules" are often a new `config` default rather than new code.

### 7.5 Why real-time netcode mostly doesn't apply

Action games solve a different problem. **Deterministic lockstep** sends only inputs and has every machine run the same simulation, but "each player in the game has latency equal to the most lagged player" and keeping simulations perfectly deterministic is "exceptionally difficult" ([Gaffer On Games](https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/)). **Client-side prediction with server reconciliation** applies inputs locally right away and later corrects to the authoritative state, which hides latency in fast-paced games ([Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)).

Elements has discrete turns, one small message per turn, no continuous simulation between turns, and no timing-sensitive input. What carries over: **server authority**; a **deterministic engine** (Elements has no randomness, so this is easy as long as the engine never calls a clock or RNG); and a trivial form of **prediction** (optimistic apply), where a misprediction only happens on conflicts. Tick rates, interpolation, lag compensation and rollback aren't needed. Even Nakama notes that for active turn-based games "the expected tick-rate is quite low" ([Nakama: Authoritative](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)).

---

## 8. AI opponent integration

**Search.** Elements is a deterministic, perfect-information, two-player game (GAME_SPEC §1), the classic setting for minimax with **alpha-beta pruning**. Alpha-beta returns the same result as minimax "without any potential of overlooking a better move" while skipping large parts of the tree, and how much it skips "depends on how well ordered your game tree is" ([CPW: Alpha-Beta](https://www.chessprogramming.org/Alpha-Beta)). Wrap it in **iterative deepening**: search depth 1, then 2, and so on until the time budget runs out, then "fall back to the move selected in the last iteration" ([CPW: Iterative Deepening](https://www.chessprogramming.org/Iterative_Deepening)). Engines check a soft time limit between iterations and a hard limit "periodically, usually by every set amount of nodes" ([CPW: Time Management](https://www.chessprogramming.org/Time_Management)). **MCTS** is the main alternative. It repeats selection, expansion, simulation (self-play "until the end of the game") and backpropagation "as long as there is time left" ([CPW: MCTS](https://www.chessprogramming.org/Monte-Carlo_Tree_Search)). boardgame.io's `MCTSBot` is a small reference implementation driven by `iterations` and `playoutDepth` options ([mcts-bot.ts](https://github.com/boardgameio/boardgame.io/blob/main/src/ai/mcts-bot.ts)).

**Elements-specific notes.**
- **Branching factor.** Chess averages "about 35-38 moves per position" ([CPW: Branching Factor](https://www.chessprogramming.org/Branching_Factor)). Elements has a 9×9 board, Earth moving in 8 directions up to 3 squares, Water paths, stacks with two movement types and combine moves, so its branching factor is *likely* higher. **Unverified:** measure it with perft once the engine exists, because it decides how deep a phone can search.
- **Formation is a different problem.** The first element placement alone has about 27 empty squares × up to 12 piece kinds. Searching the whole 26-placement formation tree is out of reach. Give the bot preset formations, which GAME_SPEC §6 already proposes for beginners, or a heuristic placer, and search only the play phase.
- **Hidden-information variants** (`hiddenSetup`, `hiddenElement`) break plain minimax, which assumes perfect information. They need separate bot logic and shouldn't shape the v1 AI.

**Architecture.**
- `ai` is a separate package that depends only on the engine: `chooseMove(state, { timeMs, level, seed }) → Action`. The UI and session never see search internals.
- **Run it off the main thread.** On the web, Web Workers run scripts "in a background thread separate from the main execution thread" so "the main (usually the UI) thread [can] run without being blocked", with data passed by `postMessage` and "copied rather than shared" ([MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)). Dart isolates "can only communicate via message passing", and `Isolate.run()` handles the setup for one-off heavy work so Flutter UIs stay responsive ([Dart: Isolates](https://dart.dev/language/isolates)). Godot threads allow "off-loading work from the main thread", but many objects aren't thread-safe ([Godot docs](https://docs.godotengine.org/en/stable/tutorials/performance/using_multiple_threads.html)). In every stack the message is the serialized `GameState`, which D5 already guarantees, so moving search to a worker costs almost nothing.
- **Time budget and cancellation:** pass `timeMs` (e.g. 300 ms for easy, 2 s for hard) and an abort signal. Iterative deepening means a move is always ready.
- **Difficulty levels:** limit depth or time, add seeded noise to the evaluation, or sometimes pick the 2nd–3rd best move. Stockfish exposes a `Skill Level` option from 0 to 20 and `UCI_LimitStrength`/`UCI_Elo` ([Stockfish engine.cpp](https://github.com/official-stockfish/Stockfish/blob/master/src/engine.cpp)). Randomness belongs in the AI (seeded, so a bug is reproducible), never in the engine.
- **Evaluation function, kept separate:** an evaluation is "a heuristic function to determine the relative value of a position", usually "a linear combination of independent features and associated weights" ([CPW: Evaluation](https://www.chessprogramming.org/Evaluation)). For Elements: `evaluate(state, side, weights)` with features such as material (per element and size, with stacks valued as both units at risk), mobility, Wizard safety (attackers nearby, escape squares, Earth shields), capturing pieces left (the elimination win), and zone control. Keep `weights` as data so bot-vs-bot runs (§5) can tune them.
- **Transposition table:** keyed by the Zobrist hash (§2.4).

---

## 9. Testing architecture

A pure engine is the cheapest code there is to test thoroughly. Four layers, from cheapest to most valuable over time:

1. **Unit tests from spec examples.** Every rule in GAME_SPEC with an example becomes a test written as a position string plus expected legal destinations. The Water example (Water size 3 at b2, Earth at c3) lists four allowed paths and one forbidden step (b2 → a2), which map directly to assertions. The tactical example (an Earth block that opens a Water capture, §3) and the combining range rules (3+1 → 3, 1+2 → 2, 2+2 → 2, §5) are next. Tag each test with the spec section so a spec change points to the tests it affects. boardgame.io's testing guide uses the same two levels: moves as plain functions, plus scenario tests from a custom setup ([boardgame.io: Testing](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/testing.md)).

2. **Perft (move-path enumeration).** Perft is "a debugging function to walk the move generation tree of strictly legal moves to count all the leaf nodes of a certain depth", and results are compared to known values. A "divide" variant lists the count under each root move so you can find which move is wrong ([CPW: Perft](https://www.chessprogramming.org/Perft)). scalachess keeps per-variant `.perft` files (`id`, a position, then `perft 1 48`, `perft 2 2039`, ...) ([3check.perft](https://github.com/lichess-org/scalachess/blob/master/test-kit/src/test/resources/3check.perft)). **Elements has no published perft numbers**, so you have to create your own: pick 5–10 positions (Water next to Earth, edge banking, stacks, combined Earth, check and pins), hand-verify depth 1 against the spec, then freeze depths 2–4 as golden numbers. After that, any change to these counts means move generation changed. Perft also measures speed and the branching factor (§8).

3. **Property-based / random-playout tests.** A property is "an assertion of a relationship between a code's input and output" checked over many generated inputs. The library then shrinks a failing case "as small as possible" ([fast-check](https://fast-check.dev/docs/introduction/what-is-property-based-testing/)). scalachess's test kit has generators ("arbitraries") for positions and game trees ([scalachess test-kit](https://github.com/lichess-org/scalachess/tree/master/test-kit/src/main/scala/chess)). Play thousands of random legal games and assert invariants on every step:
   - `apply` never throws on an action from `legalActions`.
   - The mover's Wizard is never attacked after their own move.
   - Plain Earth is never captured, a stack never has more than 2 units, and piece counts never increase in play.
   - The incremental Zobrist hash equals a hash recomputed from scratch.
   - `deserialize(serialize(s))` equals `s`, and `replay(record)` equals the live state.
   - If a mutable `SearchBoard` exists (§2.2), make/unmake round-trips and agrees with `apply`.
   - Every random game terminates (guaranteed while the 50-move rule is on, since captures and combines are finite).

4. **Golden replay tests.** "Golden tests are like unit tests, except the expected output is stored in a separate file". When the output changes on purpose, you re-accept it and review the diff ([Golden tests](https://ro-che.info/articles/2017-12-04-golden-tests)). Store real game records from playtests, bug reports and online games with their final state hash and result. CI replays all of them. A rules change that alters any outcome shows up as a reviewable diff. This also enforces the versioning policy in §7.4.

Run the perft and property suites for **each variant toggle combination** (or at least each toggle on and off), because toggles interact (§10).

---

## 10. Variants and configuration

GAME_SPEC's v1 scope asks for an engine "written with variants in mind from day one", with toggles such as `exactRange` and `hiddenSetup` now, and `hiddenElement`, `castle`, `windDiagonalSwitch` and `turnTimer` later.

**Precedent.** scalachess models each chess variant as an object extending an abstract `Variant` class with overridable hooks: `validMoves`, `specialEnd`, `specialDraw`, `kingSafety`, `initialBoard`, ... For example, King of the Hill overrides `specialEnd` to end the game when a king reaches the centre ([Variant.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/variant/Variant.scala); [KingOfTheHill.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/variant/KingOfTheHill.scala)). The variant is stored with the position ([Position.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Position.scala)).

**For Elements, toggles combine** (exactRange + hiddenSetup + castle, ...), whereas lichess variants are mutually exclusive. So prefer a **config object plus named hook points** over a class per variant:

```ts
type RulesConfig = {
  exactRange: boolean            // §3: move exactly N squares (open Q1: Water too?)
  hiddenSetup: boolean           // §6: simultaneous secret formation
  draw: { threefold: boolean; fiftyMove: number | null }   // §6: provisional defaults, tunable in playtests
  // later: hiddenElement, castle, windDiagonalSwitch, turnTimer
}
const DEFAULT_CONFIG: RulesConfig = { exactRange: false, hiddenSetup: false, draw: { threefold: true, fiftyMove: 50 } }

// Hook points read config in exactly one place each:
const rangeSteps = (cfg: RulesConfig, size: number) => cfg.exactRange ? [size] : range(1, size)
```

Guidelines:
- **Config is data inside the game record and the state.** It's serializable and travels to the server and AI worker. It's fixed for the life of a game (§7.4).
- **Each toggle is read in as few places as possible** inside the engine (one hook per toggle). The UI never checks `config.exactRange`. It just highlights whatever `legalActions` returns.
- **Mechanics that add state** (`castle` countdowns, `hiddenElement` secrets) add optional fields to `GameState` with defaults, and bump the rules version.
- **Hidden-information toggles** go through `viewFor` (§7.1) and the formation substates (§4).
- **Test matrix:** spec tests + perft + property tests for every toggle on and off (§9). Bot-vs-bot runs per config give the designer balance data (§5).
- **UI for playtesting:** a "Rules" screen that edits a `RulesConfig` before a game starts. Show the active toggles in the game header so playtest notes record which rules were in force.

---

## Decisions to make

| # | Decision | Options | Recommendation |
|---|---|---|---|
| A1 | State updates | Immutable `apply` vs mutable make/unmake | **Immutable public API.** Add a mutable search board only inside `ai`, only if profiling demands it, and verify it with property tests (§2.2). |
| A2 | Move generation | Strictly legal vs pseudo-legal + filter | **Pseudo-legal + "Wizard not attacked" filter**, sharing one generator for attacks (§2.3). Optimize later behind the same API, guarded by perft. |
| A3 | Source of truth | Snapshot state vs action log | **Action log** (`GameRecord`), with snapshots as a cache (§3). |
| A4 | Move identity | `(from, to)` vs full path / movement type | **`(from, to)`.** The engine derives a display path. Revisit only if a future mechanic makes the path matter. |
| A5 | Notation | Ad-hoc JSON vs compact text | **Compact text** (`F3@c2`, `c2-c5`) plus a one-line position format. Use it for saves, tests, the wire format and screen readers (§3). |
| A6 | Phase/UI state | Boolean flags vs explicit state machines | **Explicit machines:** game phase in the engine, interaction in the UI (§4). A library is optional. |
| A7 | Undo rules | Free undo / takeback request / none | **Product decision.** The architecture supports all of them through the log. Suggestion: free undo in pass-and-play, request-based online, configurable vs bot. |
| A8 | Hash width | 32-bit vs 64-bit Zobrist | **64-bit** (BigInt or 2×32-bit). 32-bit collides around 2^16 positions (§2.4), which is fine for repetition but risky for a large transposition table. |
| A9 | Bot algorithm | Alpha-beta vs MCTS | **Alpha-beta + iterative deepening first** (deterministic, debuggable, easy difficulty knobs). Try MCTS as an experiment via the same `PlayerAgent` interface. Use preset or heuristic formations for the setup phase (§8). |
| A10 | Rules versioning | Migrate in-flight games vs pin per game | **Pin per game** (`rulesVersion` + `config` in the record), with frozen old versions, golden replays and a minimum client version (§7.4). |
| A11 | v2 backend shape | Custom thin server vs game backend (Nakama, Colyseus, boardgame.io server) vs BaaS + functions | **Defer to v2**, but require that it can **run the engine package unchanged**, which ties into the tech-stack choice (§7.1). Async play needs only storage + one validated endpoint + push. A real-time room server matters only for live sessions. |
| A12 | Adopt boardgame.io? | Use the framework vs hand-roll the same patterns | **Hand-roll, learning from it.** It bundles phases, a master server, optimistic updates, secret state and an MCTS bot ([docs](https://github.com/boardgameio/boardgame.io/tree/main/docs/documentation)), but it is JS-only and its last tagged release is v0.50.2 from November 2022, although commits continue as of October 2026 ([GitHub](https://github.com/boardgameio/boardgame.io)). The core Elements engine is small enough to own. Revisit if the stack ends up being TypeScript. |
| A13 | `viewFor` from v1 | Add now vs add with hidden-info variants | **Add now** as an identity function. It's the seam that `hiddenSetup` and online play need later (§7.1). |

Spec questions surfaced by this work (for the designer, see §2.5): who places first in formation; whether a formation may leave a Wizard attacked; whether combined Earth still blocks *movement*; and the order of win/draw checks.

---

## Sources

Architecture and patterns
- Gary Bernhardt, *Functional Core, Imperative Shell*: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell
- Elm guide, The Elm Architecture: https://guide.elm-lang.org/architecture/ · Effects: https://guide.elm-lang.org/effects/
- Redux, Three Principles: https://redux.js.org/understanding/thinking-in-redux/three-principles
- Redux, Fundamentals (data flow, reducers): https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow
- Redux, Style Guide: https://redux.js.org/style-guide/
- Redux, Implementing Undo History: https://redux.js.org/usage/implementing-undo-history
- Robert Nystrom, *Game Programming Patterns*: Command https://gameprogrammingpatterns.com/command.html · State https://gameprogrammingpatterns.com/state.html · Event Queue https://gameprogrammingpatterns.com/event-queue.html
- Martin Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Martin Fowler, Optimistic Offline Lock: https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html
- Stately, State machines and statecharts: https://stately.ai/docs/state-machines-and-statecharts

Chess engines and engine techniques
- Chess Programming Wiki: Board Representation https://www.chessprogramming.org/Board_Representation · Copy-Make https://www.chessprogramming.org/Copy-Make · Unmake Move https://www.chessprogramming.org/Unmake_Move · Move Generation https://www.chessprogramming.org/Move_Generation · Zobrist Hashing https://www.chessprogramming.org/Zobrist_Hashing · Repetitions https://www.chessprogramming.org/Repetitions · Transposition Table https://www.chessprogramming.org/Transposition_Table · Perft https://www.chessprogramming.org/Perft · Alpha-Beta https://www.chessprogramming.org/Alpha-Beta · Iterative Deepening https://www.chessprogramming.org/Iterative_Deepening · Time Management https://www.chessprogramming.org/Time_Management · Evaluation https://www.chessprogramming.org/Evaluation · Monte-Carlo Tree Search https://www.chessprogramming.org/Monte-Carlo_Tree_Search · Branching Factor https://www.chessprogramming.org/Branching_Factor
- chess.js README: https://github.com/jhlywa/chess.js · source (v1.4.0; pseudo-legal filter, `_makeMove`/`_undoMove`, Zobrist hash, threefold repetition): https://github.com/jhlywa/chess.js/blob/master/src/chess.ts
- scalachess README: https://github.com/lichess-org/scalachess · Variant.scala https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/variant/Variant.scala · KingOfTheHill.scala https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/variant/KingOfTheHill.scala · Position.scala https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Position.scala · Hash.scala https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Hash.scala · Uci.scala https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/format/Uci.scala · perft fixture https://github.com/lichess-org/scalachess/blob/master/test-kit/src/test/resources/3check.perft · test-kit arbitraries https://github.com/lichess-org/scalachess/tree/master/test-kit/src/main/scala/chess
- lichess lila README: https://github.com/lichess-org/lila · game storage (move-list encoding + replay): https://github.com/lichess-org/lila/blob/master/modules/game/src/main/PgnStorage.scala
- lichess blind mode guide: https://lichess.org/page/blind-mode-guide
- Stockfish README: https://github.com/official-stockfish/Stockfish · position.h (`StateInfo`, `do_move`/`undo_move`): https://github.com/official-stockfish/Stockfish/blob/master/src/position.h · engine.cpp (Skill Level, UCI_Elo): https://github.com/official-stockfish/Stockfish/blob/master/src/engine.cpp

Turn-based multiplayer and networking
- boardgame.io docs (source on GitHub): Concepts https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/concepts.md · Multiplayer https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/multiplayer.md · Secret State https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/secret-state.md · Phases https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/phases.md · Testing https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/testing.md · AI source https://github.com/boardgameio/boardgame.io/tree/main/src/ai · repository and releases https://github.com/boardgameio/boardgame.io (release/commit dates checked via the GitHub API on 2026-10-27)
- Nakama, Authoritative multiplayer: https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/ · Multiplayer concepts: https://heroiclabs.com/docs/nakama/concepts/multiplayer/
- Colyseus docs: https://docs.colyseus.io/ · Reconnection: https://docs.colyseus.io/room/reconnection
- Glenn Fiedler, What every programmer needs to know about game networking: https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/
- Gabriel Gambetta, Client-side prediction and server reconciliation: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- Apple, Sending notification requests to APNs: https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns · UserNotifications: https://developer.apple.com/documentation/usernotifications

Concurrency, accessibility, testing
- MDN, Web Workers API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- Dart, Isolates: https://dart.dev/language/isolates
- Godot, Using multiple threads: https://docs.godotengine.org/en/stable/tutorials/performance/using_multiple_threads.html
- Apple Human Interface Guidelines, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- W3C WAI-ARIA Authoring Practices, Grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- fast-check, What is property-based testing: https://fast-check.dev/docs/introduction/what-is-property-based-testing/
- Roman Cheplyaka, Golden tests: https://ro-che.info/articles/2017-12-04-golden-tests

**Not verified / own work:** the copy vs make/unmake timings in §2.2 come from a one-off local micro-benchmark, not a published source. The Elements branching factor (§8) and per-square size on phones (§6) are estimates. The notation, data model, config shape and versioning policy are proposals derived from the sources above, not established standards.

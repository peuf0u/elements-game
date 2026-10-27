# Spike lessons: Elements on screen

The spike from `spike/BRIEF.md`, built and played on 2026-10-27. Code like this gets thrown away; this file is what we keep.

**Open on the iPad** (private, only the designer can open them until shared from each page's Share menu):

| Page | Link | File |
|---|---|---|
| The game | https://claude.ai/artifact/PUaVxRSY45MR2KAh2pE9JU | `index.html` |
| Piece shapes sketch | https://claude.ai/artifact/MXmZ6s5XrFXhTGndQBPRYj | `shapes.html` |
| Board look sketch | https://claude.ai/artifact/X4UJZtgfMvpASGFE6a6XPZ | `board.html` |
| Owner colours sketch | https://claude.ai/artifact/EkFbsMvRLBxReQpmWTH67x | `owner.html` |

`rules-check.mjs` checks the rules engine against the spec's examples: `node spike/rules-check.mjs spike/index.html`.

## What was built

Everything in the brief's scope:
- **The full game for two players on one screen:** formation phase, every piece including Water's full route rule, combining, capture, check and checkmate, and all end checks in the spec's order.
- **Controls:** tap or drag to move, unlimited undo, new game.
- **Options:** the exact-range variant, and three board orientations.
- **iPad layout:** portrait and landscape.

Things added beyond the brief while playing:
- **Default formation button:** sets up the designer's own formation (from the video) in one tap.
- **Face-to-face orientation:** the board stays still, and Black's tray and labels face Black, so two people can sit on opposite sides of one iPad.
- **Step-by-step move animation:** a piece glides one square at a time and pauses briefly on each, so a Water route can be followed.
- **Peek:** tap an opponent's piece to see everywhere it can reach.
- **A debug "set up a position" mode**, used to check the spec's examples by hand.

## What worked

- **Keeping the rules separate from the drawing.** The rules are one pure block of code with no screen code in it, so they could be checked outside the browser against every worked example in GAME_SPEC.md. All of them match. Several first "failures" were mistakes in the test positions, not in the rules. The real app should keep this split (D7).
- **Water is playable.** The route rule (flow, bank around Earth, slide along the edge) works in code exactly as written in §3. Showing the route as a line, and animating the piece square by square, makes a bend visible.
- **One link, updated in place.** Every change went to the same artifact link, so the iPad always had the latest version.
- **Sketch pages before changing the game.** For each look question (shapes, combined pieces, board, owner colours) we compared options on a separate page first. It was quicker to choose and nothing in the game broke while we tried things.

## What didn't work at first

- **Colour alone wasn't enough** to tell the elements apart. Fixed with one shape per element.
- **The board looked like chess.** The checkered squares and the a–i / 1–9 labels came from the spike, not from the designer's paper board, which is a plain grid. Fixed with the stone plates.
- **Owner was hard to see.** A thin white or black rim was the only cue. Fixed with a shade per side.
- **Same-device play needed more than "rotate on/off".** Players sitting opposite each other wanted the board to stay still. Added face-to-face mode.

## Rule changes and clarifications

All recorded in GAME_SPEC.md with ✅ *(designer, spike 2026-10-27)*:
- **Exact range** (§3) is a variant, **off by default**. When it's on, it applies to every piece: Fire, Wind and Earth move exactly N squares, Water's route has exactly N steps, a stack moves exactly its larger size, and the Wizard is unaffected. Open question 1 is closed.
- **Water at the board corner** (§3): the ✗ b2 → a2 in the worked example is about that single step. In the real corner a2 is still reachable along the edge (b2 → b1 → a1 → a2).
- **Default formation** (§6): the designer's formation from the video is the default preset. Black uses it from their side of the table (rotated 180°). The squares and sizes were read off the video, so they are still 🟡.

## UX ideas worth keeping

These are recorded in PRODUCT_BRIEF.md under the visual identity open question. They are still marked as not decided, because the real app hasn't adopted them.

- **One shape per element, chosen to hint at how it moves:**

  | Element | Shape | Why |
  |---|---|---|
  | Fire | Square | Rows and columns |
  | Wind | Diamond | Diagonals |
  | Water | Drop | A river |
  | Earth | Octagon | Eight directions, and a stop sign for the blocker |
  | Wizard | Star | Unchanged |

- **A stack seen from above:**
  - The bigger piece's shape is underneath, with the other one as a small shape on top. When the two are the same size, the piece that was moved onto stays underneath.
  - With Earth, the attacker is always underneath, because the stack moves only as the attacker.
  - The stacked look was preferred over overlaid outlines and a split piece.
- **A stack shows one set of dots: its range.** It never splits and moves at its larger size, so its two original sizes no longer matter.
- **Owner shown by a shade of the element colour:** lighter and sunnier for White, deeper for Black, plus the thin rim. This was preferred over a centre "pyramid tip" cap and over a thick rim.
- **A sandstone board in three plates:** one plate per 3-row zone, each square a separate tile, warm home zones and a paler middle. No checkers. This was preferred over a plain paper grid, tinted zones, marble and basalt, slate, terracotta, pebbles and carved stone.
- **Smaller ideas:**
  - each player's status shown in their own tray ("your move · Check!")
  - a two-tap confirm on New game
  - a dragged piece lifts away from the finger
  - a tap in the gap between plates counts as the nearest square

## What the designer should learn

These are the brief's questions. Some are answered from this session; the rest need the designer's own play and are marked **open**.

1. **Fun:**
   - The designer says they love the spike as a prototype.
   - **Open:** which parts feel better or worse on screen than on the table.
2. **Readability:**
   - On the iPad, element and owner were both too hard to read at first. Shapes and owner shades fixed that.
   - **Open:**
     - how it reads in an iPhone-sized window
     - whether Water's possible moves are understandable without explanation
3. **Formation phase:**
   - The designer's first request was a way to set up a position automatically, so placing 13 pieces one by one is at least slow on screen.
   - A preset (the default formation) was added.
   - **Open:** whether more presets, or a choice of presets, would help.
4. **Combining:**
   - Moving onto your own piece shows a gold "+" on that square.
   - **Open:** whether players find it without being told, and whether they combine by accident.
5. **Orientation:**
   - The spike offers three modes: fixed, turn to the player to move, and face to face.
   - The designer asked for face to face for players on opposite sides.
   - **Open:** which one to make the default. This is the brief's question 5 and is still in PRODUCT_BRIEF.md's Open list.
6. **Pixi on iPad:**
   - The board, portrait/landscape switching and window resizing all worked in an iPad-sized window in a desktop browser.
   - **Open:**
     - sharpness on the real iPad
     - smooth dragging in Low Power Mode
     - Split View / Stage Manager on the device
7. **Rules:**
   - The spec didn't cover the exact-range details or the corner case for Water. Both are now answered (above).
   - **Open:** whether the exact-range variant plays better or worse.

## Notes for the real app

- **Keep the rules as pure functions over plain data,** testable without a screen. The spike's data shapes worked well:
  - a piece is `{owner, elements: [{element, size}]}` or a Wizard
  - a position is an 81-square array plus turn, reserves, captures and counters
- **Legal moves are two steps:** list every move each piece could make, then drop the ones that leave your own Wizard attacked. Water's moves are a search over routes, so the move list is longer than for chess-like pieces, but fast enough.
- **The board needs to be measurable for the zone gaps.** With plates there is no single "square size × row" formula, so turning a tap into a square goes through one function.
- **Orientation needs one setting with three modes,** and the trays and labels have to be able to face either player.

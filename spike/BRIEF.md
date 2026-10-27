# Spike brief: Elements on screen

**Goal:** let the designer play a full game of Elements on their iPad as soon as possible, to find out whether the game works on a screen and what the real app needs. This is a **throwaway** (D11): favour speed and playability over structure, tests or reuse. What lasts is `spike/LESSONS.md`.

## Steps

### 1. Learn the rules
Read `GAME_SPEC.md` in full, especially §3 "Water movement rule" and its worked examples, §5 Combining and §6 Game flow.
**Done when** you can explain Water's three step types and the order of end checks without looking.

### 2. Build the playable game
Everything in **In scope** below, in `spike/`.
**Done when** two people can play one device from an empty board, through formation and play, to a win or draw, and every item in scope works.

### 3. Check the rules by hand
Set up the worked Water examples from GAME_SPEC.md §3 (a debug "free placement" mode is fine) and confirm the highlighted squares match the spec exactly, including the ✗ case. Do the same for one check, one checkmate, one combine, and one capture of a combined piece.
**Done when** every example matches. Any mismatch is fixed, or turns out to be a spec gap that you ask the designer about and record in GAME_SPEC.md.

### 4. Deliver to the iPad
Publish the spike as a private claude.ai artifact (Artifact tool) and give the designer the link. Republish from the same file path for every update, so the link stays the same.
**Done when** the designer has opened the link on their iPad and played a move.

### 5. Iterate with the designer
Adjust based on their feedback while they play. Rule questions go into GAME_SPEC.md, and product questions go into PRODUCT_BRIEF.md's "Open" list.

### 6. Write the lessons
Write `spike/LESSONS.md`: what worked, what didn't, rule changes made, UX ideas worth keeping, and answers to every question under **What the designer should learn**.
**Done when** the designer has read it and agrees it captures the session.

## In scope

- **Pass-and-play** for two players on one screen.
- **Formation phase:** White places first, Wizards first, alternating one piece at a time, all 13 pieces in each player's own 3 rows, no stacks.
- **All pieces and movement:**
  - Fire, Wind, Earth and the Wizard.
  - Water's full route rule: flow, banking around Earth, along the edge.
  - Sizes as range ("up to N").
- **Combining:**
  - Move onto your own piece to combine; it uses the turn.
  - Max 2 elements per stack, no same-element stacks.
  - Moves as either element.
  - Earth combined with another element: moves only as that element, can be captured, and is no longer a bank for Water.
- **Capture:** chess-style. Earth can't capture or be captured.
- **Check rules:** chess rules. No move may leave your own Wizard attacked, and checkmate ends the game.
- **Ending the game:** both win conditions and the end-check order from GAME_SPEC.md §6, and at least stalemate as a draw.
- **Interaction:**
  - Tap to select and tap a destination, and drag and drop.
  - Highlight legal destinations and show the last move.
  - Show captured pieces and whose turn it is.
  - When a Water move has several possible routes, show one of them when the move is made.
- **Undo** (unlimited) and **New game**.
- **Toggles:**
  - The "exact range" variant (GAME_SPEC.md §3).
  - "Rotate board to the player whose turn it is" (on/off), to explore the open same-device orientation question.
- **iPad-friendly layout:**
  - Portrait and landscape.
  - Resizes with the window (Split View/Stage Manager).
  - Finger-sized squares.
  - No page scroll or zoom while dragging.

## Out of scope

Computer opponent, saving games, app store packaging (Capacitor), automated tests, polished art, sound, online play, and all 🧪 proposed mechanics.

## Tech

- **PixiJS 8** for the board (D9), so the spike also gives a first feel of the chosen renderer. GSAP is optional for animation.
- **A single HTML page** with inline code is the simplest to publish. External scripts load only from cdnjs.cloudflare.com or cdn.jsdelivr.net, pinned to an exact version (for example `pixi.js@8.22.0`). The Artifact tool's own instructions cover the rest.
- **Simple shapes are enough:**
  - Elements by colour: Fire red, Wind yellow, Water blue, Earth brown.
  - Size by scale plus 1–3 pips.
  - Owner by a white or black tip/outline.
  - A combined piece shows both colours.
  - The Wizard is a distinct shape.
  - Draw the board's three 3-row bands.

## What the designer should learn

Answer these in LESSONS.md, from the designer's own play:

1. **Fun:** does the game work on a screen? Which parts feel better or worse than on the table?
2. **Readability:**
   - Can you tell element, size and owner at a glance on an iPad and on an iPhone-sized window?
   - Are Water's possible moves understandable?
3. **Formation phase:** fun or tedious on screen? Would preset formations help?
4. **Combining:** is "move onto your own piece" discoverable? Do players combine by accident?
5. **Orientation:** rotate the board each turn, or keep it fixed?
6. **Pixi on iPad:**
   - Is it sharp?
   - Does dragging stay smooth, including in Low Power Mode?
   - Does it behave when the window is resized?
7. **Rules:**
   - Which situations did the spec not cover?
   - Did the "exact range" variant play better or worse?

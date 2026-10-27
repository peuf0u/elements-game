# Elements — Game Spec (v0.2)

Extracted from the designer's 18-minute video walkthrough of the game (not public).
Timestamps like `[07:28]` point into that video.

Status legend:
- ✅ **Stated** — said explicitly in the video and/or clearly shown.
- 🟡 **Inferred** — my reading of what was said/shown; needs confirmation.
- ✅ *(designer, Q&A)* — decided in the spec Q&A session (2026-10-18).
- 🔧 **Variant** — an optional rule toggle for playtesting.
- 🧪 **Proposed** — an idea the designer mentioned but has not adopted yet.

---

## 1. Overview

- Abstract, perfect-information, 2-player strategy game, strongly inspired by chess. No randomness. ✅ `[00:13]` `[01:04]` `[01:26]`
- Pitch: "Easy to learn, hard to master." ✅ `[15:46]`
- Theme: the four elements — Fire, Air (Wind), Earth, Water — plus a Wizard (king equivalent). ✅ `[03:12]` `[06:00]`

## 2. Components

| Component | Per player | Notes |
|---|---|---|
| Board | — (shared) | 9×9 grid ✅ `[01:44]`. Drawn with two thick lines splitting it into three horizontal bands of 3 rows each 🟡 (visible in all board frames). Board is "very much work in progress". ✅ `[02:40]` |
| Element pieces | 12 | 4 elements × 3 sizes (3, 2, 1). ✅ `[02:02]`–`[02:12]` |
| Wizard | 1 | Moves like a chess king. ✅ `[02:15]`–`[02:24]` |

**Element pieces are defined by their meaning, not their shape.** Each piece has an **element**, a **size** (1–3) and an **owner**. The prototype uses pyramids from the open-source Looney Pyramids system `[00:07]` because they felt right, but the digital version is free to use any object that shows those three properties. ✅ *(designer, review)*

Players are called **White** and **Black**, borrowed from chess. ✅ `[01:53]` These are **placeholder names**; the final names and look of the two sides are open (see deferred questions). ✅ *(designer, review)*

On the physical prototype, the pyramid's **body color = element** and the **tip color = owner** (white tip / black tip). 🟡

Element ↔ color mapping on the prototype ✅ *(designer, Q&A)*:

| Element | Color |
|---|---|
| Fire | Red |
| Air / Wind | Yellow |
| Water | Blue |
| Earth | Brown |

A piece's **size** = its **range** (max squares moved per move). ✅ `[05:22]`–`[05:40]` The dots on the prototype pyramids mark size (1/2/3). ✅ *(designer, Q&A)*

### Board zones 🟡
Each player owns the 3-row band nearest to them; the middle 3 rows are neutral.
The designer names them "defensive, middle, attacking zone" ✅ `[11:39]` — presumably own band = defensive, middle = middle, opponent's band = attacking.

## 3. Pieces & movement

General rules:
- Every element can move **forwards and backwards**. ✅ `[03:48]`
- A piece moves **up to N squares**, where N = its size (1–3). ✅ `[05:30]` + *(designer, Q&A)*
  - 🔧 **Variant "Exact range":** a piece must move **exactly** N squares. The designer wants to playtest this, so the app should support it as a toggle, **off by default**. ✅ *(designer, spike 2026-10-27)* When on, it applies the same way to every piece ✅ *(designer, spike 2026-10-27)*:
    - Fire, Wind and Earth move exactly N squares, captures included.
    - Water's route has exactly N steps.
    - A combined piece moves exactly its range (the larger size), whichever element it moves as.
    - The Wizard is unaffected (always 1).
- Pieces cannot jump over other pieces; every square on the way must be empty, and only the final square may hold an enemy piece to capture. ✅ *(designer, Q&A)*
- So Fire is a short-range rook, Wind a short-range bishop, and Earth a short-range queen that can't capture.

| Piece | Direction | Range | Can capture? | Can be captured? |
|---|---|---|---|---|
| **Fire** | Orthogonal (along ranks & files, like a rook) ✅ `[03:39]` | size | Yes | Yes |
| **Air / Wind** | Diagonal (like a bishop) ✅ `[03:45]` | size | Yes | Yes |
| **Earth** | Any of the 8 directions ✅ `[04:08]` | size 🟡 | **No** ✅ `[04:13]` | **No** ✅ `[08:42]` |
| **Water** ("River") | Straight forward/backward, may **bend around Earth** ✅ `[04:35]`–`[05:18]` | size | Yes | Yes |
| **Wizard** | Any of the 8 directions ✅ `[06:08]` | 1 | Yes ✅ `[06:08]` | — (checkmate instead, see §6) |

Fire and Wind are the two "very offensive" pieces. ✅ `[03:33]`

### Earth — the defender
- Cannot capture and cannot be captured. ✅ `[04:13]` `[08:42]`
- Its job is to **block attack lines**: put Earth between an attacker and its target and the attack is stopped. ✅ `[04:17]`
- Earth is effectively "part of the board" — terrain that other pieces interact with (see Water). ✅ `[04:57]`

### Water — the river
- Flows forward and backward along its column, freely at any time. ✅ `[03:48]` `[04:35]` + *(designer, review: the designer remembered backward being allowed only after reaching the far end, but the video says it is free, and free was chosen)*
- Can **bend around any Earth piece — your own or your opponent's**. ✅ `[04:48]`–`[04:53]` `[09:45]`
- Moves straight by default, but **whenever it is next to an Earth piece it may choose to turn**. ✅ `[09:50]`
- Can go forward, wrap around an Earth piece, and continue forward again within one move. ✅ `[05:08]`–`[05:18]`
- Can even move "around" an Earth piece and come back. ✅ `[10:14]`–`[10:17]`
- **Water can move along the borders of the board.** ✅ `[04:42]` + *(designer, Q&A)*

#### Water movement rule (v0.2 — confirmed in Q&A)

A Water move is a path of **1 to N single steps** (N = size). Each step must be one of:

1. **Flow** — one square straight **forward or backward** along its column (backward is always allowed).
2. **Bank around Earth** — from a square touching an Earth piece to a neighbouring square (any of 8 directions) **that touches the same Earth piece**. In other words, Water circles around the Earth through the ring of 8 squares surrounding it. "Touching" = any of the 8 surrounding squares. Works with **any** Earth, yours or your opponent's.
3. **Bank along edge** — from a square on the board edge to an orthogonally adjacent square **that is also on the edge** (slide along the border, turning at corners). No diagonal turns on the edge.

Further rules:
- Every step counts toward the range, including steps spent around Earth or along the edge. ✅
- Once it is no longer next to Earth or on the edge, it can only flow forward or backward. ✅
- No square is visited twice in one move, and Water can't end where it started. 🟡 (a full loop would need more range than the maximum of 3)
- Every square on the path must be empty; the **last** step may land on an enemy piece to capture it (not on Earth). 🟡 (chess-like, same as the other pieces)

Example: Water size 3 (W) at b2, Earth (E) at c3. Ring around E = ○.

```
 5  ·  ·  ·  ·  ·
 4  ·  ○  ○  ○  ·
 3  ·  ○  E  ○  ·
 2  ·  W  ○  ○  ·
 1  ·  ·  ·  ·  ·
    a  b  c  d  e
```
- b2 → b3 → b4 → b5 — flow, bank, flow (or simply flowing forward the whole way)
- b2 → c2 → d2 — banking along the bottom of the ring, ending sideways
- b2 → c2 → d3 — banking around the corner, ending diagonally
- b2 → b3 → c4 — banking up and over the Earth
- b2 → c2 → d2 → d1 — around the corner, then flowing **backward** down column d (the "come back" move from `[10:14]`)
- ✗ b2 → a2 — a2 does not touch E, so this sideways step isn't allowed
  - The ✗ is about that single step. Because this example sits in the real board corner, a2 *is* still reachable along the edge: b2 → b1 → a1 → a2 (flow, edge, edge). The same goes for a1, b1 and c1. ✅ *(designer, spike 2026-10-27)*
- Tactical example ✅ `[10:19]`–`[10:47]`: the opponent blocks a Wind attack on their Fire by placing an Earth piece; that Earth now gives my Water a bend point, so my Water can capture the Fire, which would not have been possible without the Earth there.

### Wizard
- Moves exactly like a chess king: 1 square in any direction; captures 1 square in any direction. ✅ `[06:00]`–`[06:14]`

## 4. Combat

- Chess-style capture: if an enemy piece is within your piece's movement range, you may move onto it and remove it from the game. ✅ `[06:14]`–`[06:35]`
- **Size and element do not matter in combat** — a size-1 Water can capture a size-3 Fire. ✅ `[06:35]`–`[06:43]`
- Earth cannot capture and cannot be captured. ✅
- (A rock-paper-scissors variant where each element only beats one other was explored and set aside as a separate game.) ✅ `[06:43]`–`[07:06]`

## 5. Combining elements (the core dynamic)

- Two elements of the same player can be **combined into one piece** (physically: stacked). ✅ `[07:25]`–`[07:33]`
- **How:** move a piece (with a normal legal move) onto one of your own pieces. This **uses your turn**. ✅ *(designer, Q&A)*
- **A stack holds at most 2 elements and never splits** for the rest of the game. You can't move onto a stack, and a stack can't move onto another piece of yours. ✅ *(designer, Q&A)*
- Any element can combine with any **other** element. ✅ `[08:23]` Two pieces of the **same** element can't combine. 🟡 (provisional: it would gain nothing)
- A combined piece can move **as either element, but only one movement type per move** (Fire+Wind moves orthogonally *or* diagonally, never an L-shaped mix). ✅ `[07:33]`–`[07:55]`
- Range = the **larger** of the two sizes (not the sum): 3+1 → 3, 1+2 → 2, 2+2 → 2. ✅ `[08:00]`–`[08:17]`
- If a combined piece is captured, **both** elements are lost. This is the risk that balances combining. ✅ `[15:04]`–`[15:16]`
- **Earth transformation:** combining Earth with an offensive element turns the Earth offensive. It **loses** its immunity (it can be captured) and stops acting as Earth, and it effectively becomes a piece of the other element (Earth+Fire ≈ Fire, Earth+Wind ≈ Wind). Like any other piece, it still occupies its square: nothing can slide through it. ✅ *(designer, review)* ✅ `[08:29]`–`[09:06]`
  - It moves **only as the other element**, at the larger of the two sizes. ✅ *(designer, Q&A)*
  - It is **no longer a bank** that Water can bend around. ✅ *(designer, Q&A)*
  - Purpose: a comeback mechanic when you have lost your main attacking elements. ✅ `[09:06]`–`[09:20]`

## 6. Game flow

### Phase 1 — Formation (setup)
- There is no fixed starting position: each player builds their own formation inside their **own 3-row zone** (the 27 squares nearest them). ✅ `[11:22]`–`[11:49]`
- **All 13 pieces** (12 element pieces + Wizard) must be placed. ✅ *(designer, Q&A)*
- Players **alternate placing one piece at a time**, in the open: each placement is visible and can be reacted to. ✅ `[11:49]` + *(designer, Q&A)*
- **White places first**, matching "White moves first". ✅ *(designer, review)*
- A Wizard can never start under attack: the two setup zones are at least 4 rows apart, and no piece reaches more than 3 squares (Water's routes included). No setup rule is needed for this.
  - 🔧 **Variant "Hidden setup":** both players build their formation in secret at the same time, then reveal.
- v1 rule, kept simple on purpose ✅ *(designer, Q&A)*:
  - Both players place their **Wizard first**, anywhere in their own zone. `[11:51]`–`[11:53]`
  - Then they alternate placing single element pieces. **No stacks during setup**; combining only happens during play.
- 🧪 Later: the Wizard gets its own, more restricted starting area (likely tied to the Castle idea in §7).
- For beginners, the rulebook could suggest preset formations. 🧪 `[12:13]`–`[12:28]`
  - **Default formation:** the designer's own formation `[12:44]`–`[13:10]` is the default preset in the spike. ✅ *(designer, spike 2026-10-27)* The squares and sizes were read off the video. 🟡 Shown for White; Black uses the same formation from their side of the table (rotated 180°: White's b3 is Black's h7).
    ```
     3  ·  W3 E1 ·  E3 ·  E2 W2 ·       W = Wind  E = Earth  R = Water  F = Fire
     2  ·  ·  R1 W1 R2 F1 R3 ·  ·       Z = Wizard, number = size
     1  ·  ·  ·  F3 Z  F2 ·  ·  ·
        a  b  c  d  e  f  g  h  i
    ```

### Phase 2 — Play
- **White always moves first** ✅ *(designer, Q&A; the video said "by agreement" `[13:37]`)*. The app decides who plays White (alternate or random).
- Players alternate turns; one move per turn, and combining counts as that move. ✅ `[13:45]` + *(designer, Q&A)*

### Winning ✅ `[13:49]`–`[14:05]`
Either:
1. **Eliminate all of the opponent's capturing pieces**, meaning every Fire, Wind, Water and any combined Earth. The opponent is left with only plain Earth and their Wizard. ✅ *(designer, Q&A)* The Wizard can capture, but it doesn't count here.
2. **Checkmate the opponent's Wizard**, with chess check rules ✅ *(designer, Q&A)*:
   - You may not make a move that leaves your own Wizard attacked.
   - When in check you must escape it: move the Wizard, capture the attacker, or block the line (Earth is ideal for this).
   - Checkmate = in check with no legal move.
   - 🟡 Water attacks along its bank-paths, so it can give check "around" an Earth piece.

### Order of end checks ✅ *(designer, review)*
After every move, check in this order; the first match ends the game:
1. **The mover wins**: the opponent has no capturing pieces left, or is checkmated.
2. **Draws** (below): stalemate, repetition, the 50-move rule.

Example: a move that removes the opponent's last capturing piece **and** leaves them with no legal move is a win, not a stalemate.

### Draws 🟡 (provisional chess-like defaults, the designer hasn't decided yet)
- **Stalemate** (not in check but no legal move) → draw.
- **Threefold repetition** of the same position with the same player to move → draw.
- **50-move rule:** 50 moves by each player with no capture and no combining → draw.
- Draw by agreement.

## 7. Proposed / future mechanics 🧪

| Idea | Description | Timestamp |
|---|---|---|
| **Hidden element** | A piece can be hidden inside another piece; the opponent does not know which element is inside. If the opponent captures a piece holding a hidden element, they also lose their capturing piece, and the hidden one stays. A "stealth" trap. | `[10:54]`–`[11:13]`, `[13:10]`–`[13:30]` |
| **Castle** | A 3×3 castle area around the Wizard's start. If an enemy element enters the castle and the Wizard is forced out, a countdown of 1–3 turns starts, after which the owner may return a captured element to play. | `[15:49]`–`[16:35]` |
| **Terrain bonuses** | Board areas that favour certain elements. Designer worries about balance. | `[16:38]`–`[16:49]` |
| **Wind diagonal switching** | Wind is stuck on one diagonal color forever (the chess bishop problem), so a bad setup is punishing. Fix idea: special squares or a cross on the board where Wind can switch diagonals. | `[16:49]`–`[17:23]` |
| **Turn timer** | Small hourglass limiting turn length. Considered "step 2". | `[02:31]`–`[02:36]` |

## 8. Known balance concerns (from the designer)
- Wind diagonal lock depends heavily on setup. `[16:49]`
- Looking for dominant strategies or "too easy to win" tactics through playtesting. `[17:44]`–`[18:03]`

---

## v1 scope

- **Core rules only**: §2–§6 plus the provisional draw rules. ✅ *(designer, Q&A)*
- The 🧪 mechanics in §7 are left out of v1. Each one is added later as a **variant toggle**, so they can be playtested one at a time.
- The rules engine should be written with variants in mind from day one. Known toggles so far:
  - `exactRange`: pieces must move exactly N squares (§3)
  - `hiddenSetup`: simultaneous secret formation (§6)
  - later: `hiddenElement`, `castle`, `windDiagonalSwitch`, `turnTimer` (§7)

## Open questions (deferred, none block v1)

1. ~~Under the `exactRange` variant, must Water take exactly N steps too?~~ Yes, see §3. ✅ *(designer, spike 2026-10-27)*
2. Draw rules are provisional chess defaults. Revisit after playtesting.
3. Same-element combining is provisionally disallowed. Revisit if a use for it shows up.
4. Wizard's own restricted starting area: shape and size (ties into the Castle idea).
5. Names and look of the two sides (currently White/Black from chess), and the visual form of element pieces (currently pyramids). Neither affects the rules.

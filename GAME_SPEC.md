# Elements — Game Spec (v0.4)

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
Each side's **castle** is the 3×3 middle of its band: d1–f3 for White, d7–f9 for Black (§6 Castles). ✅ *(designer, 2026-10-29)*

## 3. Pieces & movement

General rules:
- Every element can move **forwards and backwards**. ✅ `[03:48]`
- A piece moves **up to N squares**, where N = its size (1–3). ✅ `[05:30]` + *(designer, Q&A)*
  - 🔧 **Variant "Exact range":** a piece must move **exactly** N squares. Playtested by computer (open question 9) and **not wanted** ✅ *(designer, playtest 2026-10-28)*: it isn't offered in the app. The engine keeps the switch for computer playtests only. The rest of this entry records how it worked. The designer first wanted to playtest it as a toggle, **off by default**. ✅ *(designer, spike 2026-10-27)* When on, it applies the same way to every piece ✅ *(designer, spike 2026-10-27)*:
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
- Moves straight by default, but **whenever it is next to an Earth piece it may choose to turn**. ✅ `[09:50]` Since v0.3 the turn is a diagonal step ✅ *(designer, 2026-10-28)*.
- Can go forward, wrap around an Earth piece, and continue forward again within one move. ✅ `[05:08]`–`[05:18]`
- ~~Can even move "around" an Earth piece and come back.~~ `[10:14]`–`[10:17]` Not since v0.3: in one move the river flows only forward or only backward ✅ *(designer, 2026-10-28)*.
- **Water can move along the borders of the board.** ✅ `[04:42]` + *(designer, Q&A)*

#### Water movement rule (v0.3)

The designer changed Water's movement on 2026-10-28 after playing the prototype: Water's attacks were hard to see, and its reach too large ✅ *(designer, 2026-10-28)*. The computer compared ten versions (open question 10, [playtest/WATER-RULES.html](playtest/WATER-RULES.html)), and the designer chose **diagonal bends with one way per move**. The v0.2 rule stays in the engine as a playtest switch.

A Water move is a path of **1 to N single steps** (N = size). Each step must be one of:

1. **Flow**: one square straight **forward or backward** along its column.
2. **Bend around Earth**: a **diagonal** step from a square touching an Earth piece to a square **that touches the same Earth piece**. "Touching" means any of the 8 surrounding squares. Works with **any** Earth, yours or your opponent's. Sideways steps around Earth aren't allowed ✅ *(designer, 2026-10-28)*.
3. **Slide along the edge**: from a square on the board edge to an orthogonally adjacent square **that is also on the edge** (along the border, turning at corners).

**One way per move** ✅ *(designer, 2026-10-28)*: "the river should only flow forward or backwards in one turn". The first step that goes forward or backward sets the move's direction, and no later step may go the other way. Steps that go neither way, sliding sideways along the edge, are always fine.

Further rules:
- Every step counts toward the range, including steps around Earth or along the edge. ✅
- Once it is no longer next to Earth or on the edge, it can only flow along its column. ✅
- No square is visited twice in one move, and Water can't end where it started. 🟡 (a full loop would need more range than the maximum of 3)
- Every square on the path must be empty; the **last** step may land on an enemy piece to capture it (not on Earth). 🟡 (chess-like, same as the other pieces)
- Playtest switches in the engine, none of them in the app ✅ *(designer, playtest 2026-10-28)*:
  - 🔧 **"No edge slide"** (`noWaterEdge`): step 3 is gone.
  - 🔧 **"Straight captures"** (`waterStraightCapture`): the capturing step must be a flow along the column.
  - 🔧 **The v0.2 rule** (`waterDiagonalBends` and `waterOneWay` off): bends may also be sideways, and a move may go forward and then back.
  - 🔧 The other candidates from open question 10: `waterRiver`, `waterStraightSteps`.

Example: Water size 3 (R) at b2, Earth (E) at c3, in the corner of the board. ○ = reachable.

```
 5  ·  ○  ○  ·  ·
 4  ·  ○  ○  ·  ·
 3  ·  ○  E  ·  ·
 2  ·  R  ·  ·  ·
 1  ○  ○  ○  ○  ·
    a  b  c  d  e
```
- b2 → b3 → b4 → b5: flowing forward.
- b2 → b3 → c4: flowing forward, then bending diagonally around the Earth.
- b2 → b3 → c4 → c5: and flowing on.
- b2 → b1 → c1 → d1, and b2 → b1 → a1: flowing back to the edge, then sliding along it.
- ✗ b2 → c2: a sideways step around the Earth. Bends are diagonal now.
- ✗ b2 → b3 → c4 → d4: also sideways.
- ✗ b2 → b1 → c1 → c2: forward after going backward, against one way per move.
- Under v0.2 the same Water reached 14 squares, including c2, d2, d3, d4 and a2.
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
    - Computer playtesting (2026-10-29, [playtest/FINDINGS.md](playtest/FINDINGS.md) §16): it does help the side that's behind. Not being able to do it costs a side that's a piece down 7–8 points, against 3 from an even start. But the bots do it from the opening, about twice per game, so it isn't saved for a comeback. See open question 11.

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
- 🧪 Later: the Wizard gets its own, more restricted starting area (likely tied to the Castle idea in §7). Tested as the castle of open question 14.
- For beginners, the rulebook could suggest preset formations. 🧪 `[12:13]`–`[12:28]`
  - **In the app, presets come first** ✅ *(designer, 2026-10-29)*: quick games start from a preset, and full games use the alternating placement above with a preset as a one-tap starting point to adjust (PRODUCT_BRIEF D15). Whether the alternating placement stays is open question 12: in computer play, seeing the other side's pieces helps little ([playtest/FINDINGS.md](playtest/FINDINGS.md) §17).
  - **Default formation:** the designer's own formation `[12:44]`–`[13:10]` is the default preset in the spike. ✅ *(designer, spike 2026-10-27)* The squares and sizes were read off the video. 🟡 Shown for White; Black uses the same formation from their side of the table (rotated 180°: White's b3 is Black's h7).
  - The designer's formation isn't a thought-through one, just one that was nice to play with; it may be replaced by better formations ✅ *(designer, playtest 2026-10-28)*. In computer play with strong bots it came last of nine strong formations (43% against the others), and drew most often. See [playtest/FORMATIONS.html](playtest/FORMATIONS.html). 
  - **New default and presets** ✅ *(designer, playtest 2026-10-28)*. The default is **"Wind 3 held back"**, the strongest formation the search found. It moves only four of the designer's pieces: Wind 3 to c1 with Earth 1 beside it, Wind 2 to f2, Fire 1 to h3. Five presets go with it: "Mirrored and reshaped", "Fire in front of the Wizard", "Fire 1 in front", "Low Winds, Earth forward" and "Wizard forward". The designer's own formation stays available as "Original". Boards and results: [playtest/FORMATIONS.html](playtest/FORMATIONS.html); squares: `PRESETS` in `packages/engine/src/formation.ts`.
    - Under rules v0.3 (new Water), Wind 3 held back still comes first among the presets. A new search found "Fire forward" about as strong: the designer's formation with Fire 2 on e2, Fire 1 on h2 and Wind 1 on f1 (third board below). It became the seventh preset, "Fire forward" ✅ *(designer, playtest 2026-10-29)*. Head to head against Wind 3 held back it scored 57% with Deep 2k and 53% with Deep 20k, so they're level ([playtest/FINDINGS.md](playtest/FINDINGS.md) §15).
    ```
     3  ·  ·  ·  ·  E3 ·  E2 F1 ·
     2  ·  ·  R1 W1 R2 W2 R3 ·  ·
     1  ·  E1 W3 F3 Z  F2 ·  ·  ·
        a  b  c  d  e  f  g  h  i
    ```
    ```
     3  ·  W3 E1 ·  E3 ·  E2 W2 ·       W = Wind  E = Earth  R = Water  F = Fire
     2  ·  ·  R1 W1 R2 F1 R3 ·  ·       Z = Wizard, number = size
     1  ·  ·  ·  F3 Z  F2 ·  ·  ·
        a  b  c  d  e  f  g  h  i
    ```
    ```
     3  ·  W3 E1 ·  E3 ·  E2 W2 ·       Fire forward
     2  ·  ·  R1 R2 F2 ·  R3 F1 ·
     1  ·  ·  ·  F3 Z  W1 ·  ·  ·
        a  b  c  d  e  f  g  h  i
    ```

### Phase 2 — Play
- **White always moves first** ✅ *(designer, Q&A; the video said "by agreement" `[13:37]`)*. The app decides who plays White (alternate or random).
- Players alternate turns; one move per turn, and combining counts as that move. ✅ `[13:45]` + *(designer, Q&A)*

### Castles ✅ *(designer, 2026-10-29, rules v0.4)*
- Each side has a castle, the 3×3 middle of its home zone: d1–f3 for White, d7–f9 for Black.
- The Wizard moves freely, in and out of either castle.
- When your Wizard stands in the **enemy** castle, you may, **instead of moving**, bring back one of your captured pieces and place it on an empty square of **your own castle**.
- **Once per visit:** after bringing a piece back, your Wizard must leave the enemy castle and come back in before it can bring another. ✅ *(designer, 2026-10-29)*
- Only a piece you've lost can come back. 🟡 *Inferred, to confirm:* it comes back as a single element (a captured stack comes back as its two elements, one at a time); not while your Wizard is in check (a piece placed at home can't help it); not if your castle has no empty square.
- 🟡 Bringing a piece back counts like a capture for the 75-move rule.
- Why: draws came from too few attackers left at the end. A Wizard that walks into the enemy camp late in the game can rebuild an attack, and the defender must choose between guarding its castle (two Wizards never stand side by side, so a Wizard in the middle of its castle keeps the other out) and running. Computer play cut draws from 27% to 13% (strong bot 18% → 11%), with games of the usual length ([playtest/FINDINGS.md](playtest/FINDINGS.md) §20, open question 15).
```
 9  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·     White's Wizard has walked into Black's castle (e7).
 8  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·     Instead of a move, White brings back its captured
 7  ·  ·  ·  ▢  Z  ▢  ·  ·  ·     Water 3 onto an empty square of its own castle (e2).
 …                                To bring another, the Wizard steps out and back in.
 2  ·  ·  ·  ▢  R3 ▢  ·  ·  ·
 1  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·
    a  b  c  d  e  f  g  h  i
```

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
2. **Draws** (below): stalemate, repetition, the 75-move rule.

Example: a move that removes the opponent's last capturing piece **and** leaves them with no legal move is a win, not a stalemate.

### Draws 🟡 (provisional chess-like defaults, the designer hasn't decided yet)
- **Stalemate** (not in check but no legal move) → draw.
- **Threefold repetition** of the same position with the same player to move → draw.
- **75-move rule:** 75 moves by each player with no capture, no combining and no piece brought back (§6 Castles) → draw. ✅ *(designer, playtest 2026-10-28)* Chess uses 50; Elements' endgames stall more often because Earth never leaves the board, and computer playtests showed 75 turns about a third of those draws into wins while typical games stay the same length (open question 2).
- Draw by agreement.

## 7. Proposed / future mechanics 🧪

| Idea | Description | Timestamp |
|---|---|---|
| **Hidden element** | A piece can be hidden inside another piece; the opponent does not know which element is inside. If the opponent captures a piece holding a hidden element, they also lose their capturing piece, and the hidden one stays. A "stealth" trap. | `[10:54]`–`[11:13]`, `[13:10]`–`[13:30]` |
| ~~**Castle**~~ | A 3×3 castle area around the Wizard's start. If an enemy element enters the castle and the Wizard is forced out, a countdown of 1–3 turns starts, after which the owner may return a captured element to play. **Adopted in a new form in rules v0.4**: §6 Castles. | `[15:49]`–`[16:35]` |
| **Terrain bonuses** | Board areas that favour certain elements. Designer worries about balance. | `[16:38]`–`[16:49]` |
| **Wind diagonal switching** | Wind is stuck on one diagonal color forever (the chess bishop problem), so a bad setup is punishing. Fix idea: special squares or a cross on the board where Wind can switch diagonals. | `[16:49]`–`[17:23]` |
| **Turn timer** | Small hourglass limiting turn length. Considered "step 2". | `[02:31]`–`[02:36]` |

## 8. Known balance concerns (from the designer)
- Wind diagonal lock depends heavily on setup. `[16:49]`
- Looking for dominant strategies or "too easy to win" tactics through playtesting. `[17:44]`–`[18:03]`
- **From computer playtesting** (2026-10-28, [playtest/FINDINGS.md](playtest/FINDINGS.md), bots that look 2–3 moves ahead). White's edge is chess-sized (52–56%), about 1 in 4 games is drawn, and no unbeatable defence or forced quick win turned up. Two things stand out:
  - **Water is by far the strongest element.** It gives about 80% of all checkmates, by bending around Earth (either side's) or sliding along the edge. Removing Water 3 from the default formation drops that side to a 17% score.
  - **Fire barely matters, in any formation.** Removing any one Fire piece makes no measurable difference, from the default formation or from random ones.
  - **Formations don't change this.** A search through about 100 formations found none better than the default, and none that holds off Water. Earth beside the Wizard makes Water more dangerous, not less.
  - **The `waterStraightCapture` variant evens the elements out.** Water, Wind and Fire each give about a third of the checkmates, and losing Fire 3 starts to cost something. It stays fair, with games about a third longer and a few more draws between the strongest bots. `noWaterEdge` alone changes little.
  - **Rechecked with a much stronger bot** (Deep, [playtest/FINDINGS.md](playtest/FINDINGS.md) §10–§11). White's edge stays small (53–56%; the same bots give chess 48%, so it's a little larger than chess's at this level), and Water still leads (two thirds of checkmates; losing Water 3 hurts most). But "Fire barely matters" was an artifact of weak bots: with strong play, losing Fire 3 drops a side to 24%. Elimination decides a quarter to a third of games.
  - See open questions 6–9.

---

## v1 scope

- **Core rules only**: §2–§6 plus the provisional draw rules. ✅ *(designer, Q&A)*
- The 🧪 mechanics in §7 are left out of v1. Each one is added later as a **variant toggle**, so they can be playtested one at a time.
- The rules engine should be written with variants in mind from day one. Known toggles so far:
  - `exactRange`: pieces must move exactly N squares (§3). Playtest only, not offered in the app ✅ *(designer, playtest 2026-10-28)*
  - `noWaterEdge`, `waterStraightCapture`: the two Water experiments (§3)
  - `waterDiagonalBends`, `waterOneWay`: v0.3 Water, **on by default**; turning both off gives the v0.2 rule. `waterRiver`, `waterStraightSteps`: the other Water candidates (open question 10)
  - `castleReturn` (`oncePerVisit`), `returnTo` (`castle`): the castle return of rules v0.4, **on by default** (§6 Castles). `everyTurn` and `home` are the tested alternatives, `off` turns it off
  - `wizardZone`, `earthBreaksEarth`: the other anti-draw rules, playtest only (open questions 13, 14)
  - `hiddenSetup`: simultaneous secret formation (§6)
  - later: `hiddenElement`, `windDiagonalSwitch`, `turnTimer` (§7)

## Open questions (deferred, none block v1)

1. ~~Under the `exactRange` variant, must Water take exactly N steps too?~~ Yes, see §3. ✅ *(designer, spike 2026-10-27)*
2. Draw rules are provisional chess defaults. Revisit after playtesting.
   - Computer playtesting (2026-10-28): about 1 in 4 games between equal players is drawn, roughly half by repetition and half by the 50-move rule. With `exactRange` on, the 50-move rule alone ends 44% of games. [playtest/FINDINGS.md](playtest/FINDINGS.md) §2, §7.
   - With the strong bot, 24–33% of games are drawn, mostly by the 50-move rule. The same bot draws only 10% of chess games, so Elements is more drawish than chess at the same level of play (§11, §12).
   - The 50-move rule means 50 moves by **each** player (100 turns) with no capture and no combine. The designer doesn't want a shorter limit (it could only add draws) and asked for longer ones to be tested ✅ *(designer, playtest 2026-10-28)*. The limit is a rule setting in the engine (`quietMoveLimit`, default 50).
   - Why games stall: at a 50-move draw a median of 3 capturing pieces are left in total, 1 on the weaker side, and more than half of the last 100 moves are Wizards and plain Earth shuffling. Earth never leaves the board, so a few remaining attackers can't break its walls.
   - Tested (2026-10-28, Deep 2k with learned values, 400 games per row, default formation): limit 50 → 28% drawn by the rule, the longest 10% of games past 97 moves each; 75 → 19%, past 117; 100 → 17%, past 148; no limit → 89% of games decided, but the longest 10% past 259 moves each. The typical game stays about 50 moves each throughout. With random formations: 16% → 12% → 11%. Chess with the same bots: 6%. So 75 turns a third of these draws into wins for a modest cost in length; going further buys little.
   - Decided: the limit is **75 moves each** ✅ *(designer, playtest 2026-10-28)*. Stalemate and threefold repetition stay provisional.
   - Rules v0.4 adds the castle return (§6 Castles), which cuts draws to 11–14% in computer play ([playtest/FINDINGS.md](playtest/FINDINGS.md) §20).
   - Under rules v0.3 (2026-10-29, saved games, [playtest/FINDINGS.md](playtest/FINDINGS.md) §16): 17–26% of games drawn, two thirds by the 75-move rule and the rest by repetition, no stalemates. Drawn games last about 105–110 moves each, against 43 for decided ones. A quarter of draws end with one side two or more elements up that it couldn't convert, typically two attacking stacks against one Water stack and two plain Earths around the Wizard.
3. Same-element combining is provisionally disallowed. Revisit if a use for it shows up.
4. Wizard's own restricted starting area: shape and size (ties into the Castle idea). Since rules v0.4 the castles exist (§6), but the Wizard still starts anywhere in its home zone; all presets put it inside its castle.
5. Names and look of the two sides (currently White/Black from chess), and the visual form of element pieces (currently pyramids). Neither affects the rules.

From computer playtesting (2026-10-28, [playtest/FINDINGS.md](playtest/FINDINGS.md)). None of these block v1:

6. **Water capturing at the end of a bent route.** §3 marks "the last step may land on an enemy piece to capture it" as 🟡 inferred. It decides most games: about 80% of checkmates are given by Water, and about 70% of those bend around Earth or slide along the edge. Can Water capture (and give check) at the end of a route that bent around Earth or along the edge? The designer isn't sure yet and asked for both versions to be compared, along with a "no edge slide" version (the two 🔧 Water variants in §3). ✅ *(designer, playtest 2026-10-28)*
   - Compared (2026-10-28, [playtest/FINDINGS.md](playtest/FINDINGS.md) §9): with `waterStraightCapture`, Water's share of checkmates drops from 78% to 40%, and Water, Wind and Fire end up about equally valuable. White still scores 54% (52% between the strongest bots). Draws stay at about 1 in 4 between Careful bots but rise to 1 in 3 between Thinker bots, and games run about a third longer (74 moves each instead of 55). Elimination becomes as common as checkmate between Thinker bots (see question 8). `noWaterEdge` alone barely helps: Water switches to bending around the attacker's own Earth. Both together add draws and length for little gain. Recommendation: try `waterStraightCapture` at the table.
   - Rechecked with the strong bot (§11): Water gives 65% of checkmates under normal rules and 35% with straight captures; losing Water 3 / Fire 3 / Wind 3 costs 11 / 24 / 18% normally and 20 / 21 / 18% with straight captures. Draws go from 33% to 37% and games from 54 to 68 moves each. Water's lead is smaller than the weak bots showed, so straight captures is now a fine-tuning choice rather than a fix for a broken piece.
   - The designer doesn't like the straight-capture rule and prefers to keep Water as it is; with the strong bot's results, Water's lead is acceptable. `waterStraightCapture` stays a playtest toggle only, off by default. ✅ *(designer, playtest 2026-10-28)*
   ```
    3  ·   ·   E1  R3  ·   ·   e2  ·   ·     Black's Water + Wind stack on g1 checks
    2  ·   ·   ·   W1  FR2 ·   ·   ·   ·     White's Wizard along the edge:
    1  ·   ·   ·   F3  Z   ·   rw3 ·   ·     g1 → f1 → e1. Checkmate.
       a   b   c   d   e   f   g   h   i
   ```
7. **Is Water meant to be the strongest element, and Fire the weakest?** The video calls Fire and Wind "very offensive" `[03:33]`. Between computer players, Water does more than half of all capturing, and from the default formation Fire hardly matters. If Fire should be stronger, the default formation (Fire 3 and Fire 2 start on the back row) or Fire's movement could change.
   - Tested (2026-10-28): it isn't the formation. Fire matters no more from random formations or from searched formations with Fire in front. Under `waterStraightCapture` it does start to matter (losing Fire 3 drops a side to about 40%). So Fire's weakness looks like Water doing its job, not something wrong with Fire itself.
   - Rechecked with a much stronger bot (§11): Fire does matter. Losing Fire 3 drops a side to 24% from the default formation (Water 3: 13%, Wind 3: 14%). Fire gives about a quarter of the checkmates. Water is still the strongest element, and Fire the weakest attacker, but the gap is much smaller than the weak bots showed.
   - Compared with chess in the same framework (§12): losing the queen costs chess more (7%) than losing Water 3 costs Elements (13%). A dominant piece is normal, and Water 3 is no more decisive than the queen.
8. ~~**Elimination is rarely how a game is won** between players who look ahead: about 5% of games for Careful and 18% for Thinker, against about 70% checkmate. Is elimination meant as an equal second goal, or as a backstop?~~ Elimination stays as a way to win ✅ *(designer, playtest 2026-10-28)*.
   - Under `waterStraightCapture`, elimination decides 36% of Thinker games, more than checkmate (31%).
   - Rechecked with a much stronger bot (§11): elimination decides 24–32% of games under normal rules, against 39–52% checkmate. Between strong players it's a real second way to win.
9. ~~**The `exactRange` variant** is just as fair in computer play, but games get twice as long and draws rise from about 1 in 4 to about half. It stays off by default. Is it still worth trying at the table?~~ No: the designer doesn't want exact range ✅ *(designer, playtest 2026-10-28)*. It's dropped from the app, and the engine keeps the switch for playtests only.
10. **Water's movement: hard to see and a long reach.** Playing the prototype against a bot, the designer found Water overpowered: its attacks are hard to see, and its reach is large ✅ *(designer, prototype 2026-10-28)*. The computer agrees on both counts. Two in three Water checkmates come along a bent route or an edge slide. In real positions from strong-bot games a single Water has 9.3 moves on average, against 3.7 for Fire and 2.6 for Wind. Neglecting Water early loses, but neglecting Fire loses just as much, so early Water play isn't special (`node run.mjs neglect`: one side may not move that element for its first 10 moves; with Wind 3 held back it scores 26% without Water moves and 23% without Fire moves). The designer is considering changing how Water moves:
    - **Keep the edge slide** ✅ *(designer, 2026-10-28)*.
    - **No ban on moving backwards** ✅ *(designer, 2026-10-28)*.
    - **Candidates the designer likes** ✅ *(designer, 2026-10-28)*:
      - **River rule:** Water goes around only an Earth that stands right in its column, ahead or behind, the way a river flows around a rock in its path. An Earth beside or diagonal to it gives no turn.
      - **Straight steps:** every step is forward, backward or sideways, never diagonal, also when going around Earth.
      - **One way per move**: within one move, Water goes only forward or only backward. The first forward or backward step sets the direction, and sideways steps are always fine (`waterOneWay`). It was first dropped, because under today's rule it removes only the rare "come back" move. Then diagonal bends turned out to allow zigzags: d3 → e4 → e3, up diagonally around one Earth and back down. So the designer brought it back: "the river should only flow forward or backwards in one turn" ✅ *(designer, 2026-10-28)*.
    - Measured on 18,000 Water pieces in positions from strong-bot games, with the edge slide kept. Moves are per Water; "corner captures" are captures at the end of a route that left the Water's column.

      | Rule | Moves | Captures | Corner captures |
      |---|---|---|---|
      | Today | 11.4 | 0.23 | 0.19 |
      | One way per move | 10.8 | 0.22 | 0.18 |
      | Straight steps | 7.8 | 0.13 | 0.08 |
      | River | 7.2 | 0.14 | 0.09 |
      | River + straight steps | 5.9 | 0.09 | 0.04 |
      | River + straight steps + one way | 5.7 | 0.09 | 0.04 |
    - **Decided: diagonal bends + one way per move, with the edge slide**, the default from rules v0.3 ✅ *(designer, 2026-10-28)*. §3 has the rule.
    - The designer's candidates were **the river rule and straight steps, with the edge slide** ✅ *(designer, 2026-10-28)*. They are rule switches in the engine (`waterRiver`, `waterStraightSteps`, and `waterDiagonalBends` below) and in the prototype's menu ("Water movement (trial)").
    - Tested in whole games (2026-10-28, `node run.mjs waterRules`): Deep 2k with learned values, from Wind 3 held back on both sides, 400 equal games per rule plus 150 games each without Water 3, Fire 3 or Wind 3.

      | | Today | River | Straight steps | River + straight | Diagonal bends | River + diagonal |
      |---|---|---|---|---|---|---|
      | White's score | 50% | 54% | 55% | 54% | 53% | 54% |
      | Draws | 24% | 23% | 29% | 47% | 16% | 28% |
      | Typical game (moves each) | 46 | 55 | 59 | 100 | 45 | 64 |
      | Checkmates given by Water | 78% | 76% | 67% | 54% | 68% | 65% |
      | Captures per game, Water / Fire / Wind | 3.4 / 1.8 / 2.3 | 3.1 / 1.9 / 2.6 | 2.3 / 2.0 / 2.5 | 2.1 / 2.0 / 2.5 | 3.2 / 1.8 / 2.4 | 2.8 / 2.0 / 2.5 |
      | Score without Water 3 / Fire 3 / Wind 3 | 13 / 15 / 14% | 16 / 23 / 12% | 19 / 19 / 14% | 23 / 26 / 21% | 11 / 18 / 13% | 24 / 31 / 15% |

      Comparison page with charts and boards: [playtest/WATER-RULES.html](playtest/WATER-RULES.html).

      One way per move with the other rules (`node run.mjs waterOneWay`, same design):

      | | One way | Diagonal bends, one way | River + diagonal bends, one way | Straight steps, one way |
      |---|---|---|---|---|
      | White's score | 54% | 51% | 49% | 56% |
      | Draws | 24% | 21% | 42% | 29% |
      | Typical game (moves each) | 45 | 51 | 74 | 65 |
      | Checkmates given by Water | 69% | 69% | 69% | 54% |
      | Captures per game, Water / Fire / Wind | 3.5 / 1.8 / 2.3 | 2.8 / 1.8 / 2.4 | 2.6 / 2.0 / 2.5 | 2.3 / 2.0 / 2.5 |
      | Score without Water 3 / Fire 3 / Wind 3 | 11 / 16 / 12% | 17 / 24 / 14% | 22 / 25 / 15% | 22 / 21 / 14% |

      - Diagonal bends + one way keeps the game decisive (21% draws, 5 moves longer than today). It removes the zigzags, and Water captures less (2.8 per game instead of 3.4).
      - Straight steps + one way evens the elements out most, and Water no longer gives most of the checkmates. Games are about 19 moves longer.

      "Diagonal bends" was the designer's next idea ✅ *(designer, 2026-10-28)*: Water flows straight and slides along the edge as before, but its steps around Earth must be diagonal (`waterDiagonalBends`, `node run.mjs waterBends`). It is the only candidate that makes games more decisive: 16% draws at the same length. Water still captures the most.

      - River alone makes Water easier to read but hardly weaker.
      - Straight steps alone evens the elements out, for a few more draws and longer games.
      - River + straight steps stalls the game: Water is what breaks Earth walls, and with both limits the walls hold.
      - Diagonal bends cuts draws and Water's share of checkmates a little, without slowing the game.
      - River + diagonal bends weakens Water clearly (losing Water 3 costs about as much as losing Wind 3), with a few more draws.
      - Not decided yet. The bots read every route perfectly, so readability has to be judged at the table.
11. **Earth's comeback is used from the opening.** §5 says combining Earth with an attacker is meant as a comeback when you've lost your main attackers. In computer play it works as one: not being able to do it costs a side that's a piece down 7–8 points, against 3 from an even start. But the bots do it from the first moves, about twice per game, mostly while material is still even ([playtest/FINDINGS.md](playtest/FINDINGS.md) §16). Is that fine, or should it be limited (for example, only once you've lost some attackers)? A limit would be a new rule to test. **Fine as it is** ✅ *(designer, 2026-10-29)*: Earth may combine from the first move, with no limit.
12. **Open placement, or building in secret?** §6 has players place one piece at a time in the open, so each can react to the other. In computer play reacting is worth little: formations are mostly just stronger or weaker, not counters to each other, and seeing the whole opposing formation, then moving up to three pieces to beat it, gained 0–6 points, within luck ([playtest/FINDINGS.md](playtest/FINDINGS.md) §17). So full games could have both players build at the same time, in secret, then reveal (the "Hidden setup" variant), which in the app saves 26 turns of waiting. Or keep open placement for how it feels at the table. People may read a formation in ways the bots can't, so this is worth watching in real games. **Parked** *(designer, 2026-10-29)*: the presets plus building your own are fine for now.
13. ~~**Draws: too little material at the end.**~~ Answered by the castle return (question 15, §6 Castles). About 1 game in 5 is drawn between strong bots, against 1 in 10 for chess at the same level, and a quarter of draws end with one side two or more elements up ([playtest/FINDINGS.md](playtest/FINDINGS.md) §16). The designer's idea "Earth breaks Earth" ✅ *(designer, 2026-10-29: worth testing)*: an Earth combined with an attacker may capture plain Earth (`earthBreaksEarth`, off). Computer play: Earth gets broken in about a third of games and the game stays fair, but draws don't fall (21% → 21%). The side ahead in those draws is down to 1–2 attackers, so the cause is too little attacking material, not Earth walls (§18). Rules that act on material are untested: the side well ahead wins at the move limit, or a side down to its last attacking piece loses. The designer doesn't want rules that need counting moves ✅ *(designer, 2026-10-29)*. Keeping the Wizard in a castle (question 14) halves the draws instead.
14. ~~**The Wizard stays home.**~~ Not adopted: the castle return (question 15) cuts the draws as much without trapping the Wizard. The designer's idea ✅ *(designer, 2026-10-29: worth testing)*: the Wizard may never leave its zone, either the whole 3-row home zone or a dedicated Wizard area (`wizardZone`: `anywhere`, the default, `home` or `castle`). The castle tested is the 3×3 middle of the home zone, d1–f3 for White and d7–f9 for Black; the Wizard starts there and never leaves, like the king's palace in Chinese chess. All seven presets already start the Wizard inside it. Computer play ([playtest/FINDINGS.md](playtest/FINDINGS.md) §19): the **castle halves the draws** (23% → 10% from the default formation, 20% → 11% with the strong bot), the game stays fair (White 50% of decided games), there are no stalemates, and games get shorter (about 33 moves each instead of 48). It punishes a careless defence harder: the weaker bot loses 12% of games within 20 moves each, against 4% today. The home zone helps much less (23% → 20%, 20% → 14%). Not decided yet. If the castle stays, it also answers question 4 and fits the Castle idea in §7.
15. **The castle return.** The designer's next idea ✅ *(designer, 2026-10-29: worth testing)*: Wizards move freely, and the castles of question 14 become a goal. A Wizard standing in the **enemy** castle may, instead of moving, bring back one of its side's captured pieces. The piece goes onto an empty square of the side's own home zone (or own castle) ✅ *(designer, 2026-10-29)*. It happens **once per visit**: the Wizard leaves the castle and comes back in before it can bring another ✅ *(designer, 2026-10-29, leaning; every turn was tested too)*. In the engine: `castleReturn` (`off`, `oncePerVisit`, `everyTurn`) and `returnTo` (`home`, `castle`). A return restarts the 75-move count like a capture, and isn't allowed while in check. Computer play ([playtest/FINDINGS.md](playtest/FINDINGS.md) §20): it **cuts draws as much as the strict castle** (27% → 11–13%, strong bot 18% → 11–13%) without the strict castle's quick losses, and games keep their usual length. Returns come late, at a median of move 57, in 13–38% of games. The first side to bring a piece back wins 80–88% of those games. It was behind on material in about 3 in 10 of them, and the side behind still won most of those, so it's also a comeback. Every turn adds no benefit over once per visit, and home zone versus own castle makes no difference. **Decided** ✅ *(designer, 2026-10-29)*: the default from rules v0.4, once per visit, onto the own castle. §6 Castles has the rule.

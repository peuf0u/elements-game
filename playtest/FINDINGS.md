# Playtest findings: the computer plays Elements

Easier-to-read version with drawn boards: [FINDINGS.html](FINDINGS.html) (open in a browser), also online at https://claude.ai/artifact/V6KKL4vWUm7FLFiqehXhEJ (private until shared from the page's Share menu).

*Run on 2026-10-28 to 30 (GAME_SPEC v0.2 to v0.5), about 216,000 games in total, 10,000 of them chess. §1–§9 were played on the spike's rules and replay move for move on the real engine (`packages/engine`); §10–§16 were played on the real engine. §1–§14 use the v0.2 Water rule; §15 checks rules v0.3, with the new Water, §16 looks at how v0.3 games unfold, §17 at the setup phase, §18–§20 test rules against draws, §21 rechecks the key tests under rules v0.4, §22 tests chess's automatic draws (rules v0.5), and §23 looks for dead positions. How the players work and where the methods come from: [README.md](README.md) and [docs/research/automated-playtesting.md](../docs/research/automated-playtesting.md). Every number below comes from `results/<experiment>.summary.json` or `node analyze.mjs <experiment>`.*

**How to read the numbers.** A "score" counts a win as 1 and a draw as ½, so 50% means even. The range in brackets is the 95% uncertainty range: if it includes 50%, the games can't tell the two sides apart. One "move" means one player's turn. §1–§9 come from bots that look 2–3 moves ahead (Careful and Thinker). §11 repeats the key tests with Deep, a much stronger bot (§10), and **where the two disagree, §11 is the better guide**. Treat anything that looks like a problem as a hint to try on the real board, not a verdict.

**Board diagrams** use the spec's letters: F Fire, W Wind, R Water, E Earth, Z Wizard, with the number giving the size. White is upper case and Black lower case. A stack lists both elements and its range: `RW3` is White Water + Wind moving 3.

---

## Summary

| Question | Answer | Verdict |
|---|---|---|
| Does White win too often? | White scores 52–56% between equal players. The same bots give chess 48% (§12), so Elements' first-move edge is a little larger than chess's, but still small | ✅ healthy |
| How often are games drawn? | About 1 in 4 to 1 in 3 games with the chess 50-move rule, more than chess at the same level (10%, §12). Stalled endgames, where Earth walls stop the last attackers. **Now 75 moves each** (§13), which cuts those draws by a third | ⚠️ better, keep an eye on it |
| Do games end? How long are they? | Always. Typical game: 45–55 moves each | ✅ healthy |
| How do games end? | Weak bots: ~70% checkmate, 5–18% elimination. **Strong bot: 40–50% checkmate, 25–30% elimination**, the rest drawn (§11) | ✅ both ways to win matter |
| Does skill matter? | Each step up the ladder wins 92–99%, and the weaker player never won | ✅ very good |
| Is there an unbeatable defence (Earth wall)? | No. The Turtle and both fortresses lose clearly | ✅ healthy |
| A dominant strategy? | None found. Rushing, hunting the Wizard and turtling all do worse than balanced play | ✅ healthy |
| Forced quick wins from the default formation? | None. The quickest win in 500 games took 9 moves each | ✅ healthy |
| Pieces too strong or useless? | **Water is the strongest element and gives two thirds of the checkmates.** The weak bots made Fire look useless, but with strong play losing Fire 3 clearly hurts (§11). Wind 3 is worth about as much as Water 3 | ⚠️ Water still leads |
| Does combining matter? | Very much: a player that never combines scores only 23% | ✅ healthy, one strong combo |
| Exact range variant | Just as fair, but games get twice as long and draws jump to 43–59% | ⚠️ plays worse |
| Default formation vs others | With weak bots nothing beat your default (§8). **With strong bots it came last of nine strong formations**, so "Wind 3 held back" is the new default, with five presets (§14). Mirror images play just as well | ✅ new default and presets |
| What makes a formation strong? | Water next to your own Earth, pieces close together, Earth in front, Wind 3 held back. But these rules explain only part of it: strong formations are narrow peaks, and moving one piece costs about 8 points (§14) | ℹ️ presets are worth offering |
| Can a formation tame Water? | No. Moving Fire forward changes nothing, and Earth beside the Wizard makes Water far *more* dangerous | ❌ not by formation |
| Can a rule change tame Water? | Yes: **"Water captures only straight"** makes Water, Wind and Fire about equal and keeps the game fair. Games get about a quarter longer and draws rise a little (33% → 37% with the strong bot) | ✅ worth playtesting |
| Rules v0.3: does the new Water rule work? | Yes. Water bends diagonally and goes one way per move. Water 3 is no longer the piece you can't lose, the game stays fair, and draws stay about the same (§15) | ✅ adopted |
| Does an early lead decide the game? | One element up is an edge (Deep 20k wins 70%); two up nearly decides it (88%); three up is the end. The winner had been behind in a fifth to a third of decided games (§16) | ✅ healthy |
| Does Earth's comeback work? | Yes: being able to combine Earth is worth 7–8 points to a side that's a piece down, against 3 from an even start. But the bots use it from the opening, not as a comeback (§16) | ⚠️ works, used early |
| Does seeing the other side's formation help? | Barely. Formations are mostly just stronger or weaker, not counters to each other. Seeing the whole opposing formation and moving up to three pieces to beat it gained 0–6 points, about White's first-move edge and within luck (§17) | ℹ️ open placement adds little |
| Does keeping the Wizard in a 3×3 castle cut the draws? | **Yes, by about half**: 23% → 10% from the default formation, 20% → 11% with the strong bot, about chess's level. The game stays fair, no stalemates, and games get shorter (about 31–35 moves each instead of 47–49). Confining it to the whole home zone helps much less (§19) | ✅ worth playtesting |
| Does a Wizard bringing pieces back from the enemy castle cut the draws? | **Yes, as much as the strict castle** (27% → 11–13%, strong bot 18% → 11–13%), without its quick losses, and games keep their usual length. Once per visit is enough; every turn adds nothing (§20). **Adopted in rules v0.4**, onto the own castle | ✅ adopted |
| Rules v0.4: does the game stay healthy with the castle return? | **Yes.** Draws halve in every test (Deep 2k 22% → 11%, Deep 20k 20% → 7%), White's edge doesn't change, the pieces rank the same, no style or preset takes over, and Earth's comeback still works. Walking the Wizard to the castle is a real plan: a bot that doesn't do it scores 39–42% (§21) | ✅ healthy |
| Does "Earth breaks Earth" cut the draws? | No. Earth stacks that may capture plain Earth break a wall in about a third of games, but draws stay at 21%. The real cause is too few attackers left at the end (1–2 for the side ahead), not Earth walls (§18) | ❌ not against draws |
| Can these results be trusted? | Checked on chess, where the answers are known (§12): piece rankings and ratios come out right, the sizes of effects are understated, and bots this weak can't measure White's edge reliably | ✅ rankings, ⚠️ exact numbers |
| A stronger bot? | **Deep**, built from chess-engine techniques with piece values learned from 8,000 games, rates about 430 points above Thinker at a sixth of its time (§10) | ✅ new standard bot |

---

## 1. Balance: White vs Black

Equal players, both starting from the default formation:

| Players | Games | White's score | White wins | Black wins | Draws |
|---|---|---|---|---|---|
| Careful vs Careful | 400 | **52%** (47–56) | 40% | 37% | 23% |
| Careful vs Careful, other piece values | 200 | 54% (47–60) | 41% | 34% | 25% |
| Careful vs Careful, same random formation both sides | 300 | 53% (47–58) | 42% | 36% | 22% |
| Thinker vs Thinker | 100 | **56%** (47–66) | 46% | 33% | 21% |

In chess White scores about 52–56% too. So moving first gives Elements a small, chess-sized edge, and nothing more. The random-formation row shows it's the first move, not the default formation, that gives White this edge.

One thing to keep an eye on: the stronger the players, the bigger White's edge looks (52% for Careful, 56% for Thinker). With only 100 Thinker games the uncertainty is too wide to say. In chess the edge shrinks with strength, so if Elements does the opposite, that would be worth knowing.

## 2. Do games end, and how?

Every one of the 9,000 games ended on its own. There were no endless loops.

| Players | Typical length (moves each) | Checkmate | Elimination | Repetition | 50-move rule |
|---|---|---|---|---|---|
| Random vs Random | 167 | 12% | 43% | 0% | 45% |
| Greedy vs Greedy | 74 | 3% | 85% | 0% | 12% |
| Careful vs Careful | 55 | 72% | 5% | 14% | 9% |
| Thinker vs Thinker | 45 | 61% | 18% | 9% | 12% |

- **Once players look ahead, checkmate is the main way to win.** Players who only grab pieces win by elimination. As soon as they defend their pieces, eliminating all nine capturing pieces (every Fire, Wind and Water, stacked or not) becomes too slow, and the Wizard falls first. At Thinker level elimination comes back a little (18%).
- **There's real drama.** In 45% of the Careful games with a winner, the winner was behind by at least a small piece at some point, and in 25% by a big one.
- **About 1 in 4 games is drawn,** about half by repetition and half by the 50-move rule.

## 3. Does skill matter? (the skill ladder)

| Match | Games | Stronger player's score | Weaker player won |
|---|---|---|---|
| Greedy vs Random | 400 | 99% | never |
| Careful vs Greedy | 200 | 99% | never |
| Thinker vs Careful | 100 | 96% | never |

Each extra move of look-ahead wins almost every game. Game designers use exactly this test for depth (see the research note, §3.2), and Elements passes it at every step we could measure. It's the "easy to learn, hard to master" sign you wanted.

## 4. Pieces: which ones matter?

### The handicap test

Careful played the default formation with one piece removed, against Careful with the full formation (80 games per piece, half as White and half as Black). The number on each square is the score of the side **missing** that piece. 50 means losing it doesn't matter. The lower the number, the more the piece is worth. Each number is uncertain by about ±10.

```
          the piece            score without it
 3  ·  W3 E1 ·  E3 ·  E2 W2 ·      ·  31 48 ·  46 ·  46 42 ·
 2  ·  ·  R1 W1 R2 F1 R3 ·  ·      ·  ·  33 44 43 51 17 ·  ·
 1  ·  ·  ·  F3 Z  F2 ·  ·  ·      ·  ·  ·  49 Z  48 ·  ·  ·
    a  b  c  d  e  f  g  h  i      a  b  c  d  e  f  g  h  i
```

- **Water 3 (g2) is the most valuable piece by far.** Without it a side scores only 17%.
- **Wind 3 (b3) and Water 1 (c2) come next** (31% and 33%). Water 1 is the surprise. It's worth so much because of a combination, see §5.
- **Removing any Fire piece makes no measurable difference** (49%, 48% and 51%). That doesn't fit the spec's description of Fire as "very offensive" (§3).
- **The Earth pieces matter a little** (46–48%). They can't be captured, so taking one away only removes a blocker.

### Is Fire weak, or just badly placed?

Fire 3 and Fire 2 start on the back row, boxed in. To check whether that's the whole story, both sides got **the same random formation**, a new one every game, and one side was missing one piece (100 games per piece, 1,200 in all). Now every piece starts in all sorts of places:

| Missing piece | Size 3 | Size 2 | Size 1 |
|---|---|---|---|
| Water | **25%** (17–34) | 45% | 42% |
| Wind | **38%** (29–48) | 48% | 45% |
| Earth | 45% | 42% | 49% |
| Fire | **50%** (40–59) | 45% | 50% |

**Fire is weak wherever it starts.** Losing Fire 3 still makes no difference, while losing Water 3 or Wind 3 clearly does. Fire isn't idle: across these games it gave 16% of the checkmates (Wind 7%, Water 77%) and captured about one piece per game. But its work is work the other pieces would have done anyway.

### Who does the capturing

Captures per game, by the element of the capturing piece (a stack's capture is split between its two elements):

| Players | Water | Wind | Fire | Wizard | Earth (in a stack) |
|---|---|---|---|---|---|
| Careful, default formation | **3.07** | 1.43 | 0.55 | 0.43 | 0.04 |
| Careful, random formations | **2.53** | 1.25 | 0.97 | 0.32 | 0.02 |
| Thinker, default formation | **4.42** | 1.95 | 1.77 | 0.82 | 0.45 |

Water does more than half of all the capturing. Fire captures a little more with random formations and with stronger players, but the test above shows that doesn't make it matter more. In the default formation Fire 3 and Fire 2 start on the back row beside the Wizard, behind a row of their own pieces, so they take several moves to get out. Moving them forward doesn't fix Fire, though (§8). The likelier reason is that Water already does Fire's job, and does it better: §9 shows that once Water loses its bent captures, Fire starts to count.

### How the Wizard falls: almost always to Water

Of the 287 checkmates between Careful players, **225 (78%) were given by a Water** (or a stack moving as Water). For Thinker it's 53 of 61 (87%). Fire and Wind gave 31 each.

| How the mating Water got there | Careful mates |
|---|---|
| Straight up or down its column | 70 |
| Sliding along the board edge | 69 |
| Bending around its own side's Earth | 61 |
| Bending around the defender's Earth | 25 |

Half the mates (145 of 287) catch the Wizard on its own back row. Three typical patterns:

**Along the edge.** Black's Water + Wind stack has just taken White's Fire 2 on g1. Now it threatens e1 along the bottom edge (g1 → f1 → e1). The Wizard is boxed in by its own pieces, and nothing can block f1:

```
 3  ·   ·   E1  R3  ·   ·   e2  ·   ·
 2  ·   ·   ·   W1  FR2 ·   ·   ·   ·
 1  ·   ·   ·   F3  Z   ·   rw3 ·   ·
    a   b   c   d   e   f   g   h   i
```

**Around the defender's own Earth.** This was Thinker's quickest win: Black, after 9 moves each. Black combines Water 3 onto its Wind 3 on e4, which makes a stack that moves 3 as Water. It bends around **White's own Earth 3 on e3** (e4 → f3 → e2 → e1). White's Earth stands in front of the Wizard to block Fire and Wind, but for Water it's a turning post:

```
 5  ·   ·   ·   ·   ·   ·   R3  ·   ·
 4  W3  ·   ·   ·   rw3 ·   ·   E2  ·
 3  ·   R2  E1  ·   E3  ·   ·   W2  ·
 2  ·   ·   R1  ·   ·   ·   F1  ·   ·
 1  ·   ·   W1  F3  Z   F2  ·   ·   ·
    a   b   c   d   e   f   g   h   i
```

**Earth as a ramp.** The attacker walks its own Earth forward next to the enemy Wizard, and its Water steps sideways around it. Here Black's Earth 2 on d4 lets Black's stack on d3 step to c3. The Wizard walked out too far, which is a bot weakness, but the pattern is real:

```
 5  ·   ·   ·   ·   r3  ·
 4  ·   E1  RW3 e2  ·   ·
 3  ·   ·   Z   rw3 WE3 ·
 2  ·   ·   ·   ·   R2  F1
    a   b   c   d   e   f
```

**In short:** Earth blocks Fire and Wind, but it gives Water a way around, and so does the board edge. Water can reach a Wizard from directions no other piece can. That makes it the main attacker, and the back row a dangerous place for the Wizard. It fits your own tactical example in §3 of the spec, where an Earth block is what lets Water capture. The computer says that example is the most important pattern in the game.

## 5. Combining

| Player | Score against Careful |
|---|---|
| Never-combiner | **23%** (16–32) |
| Combiner (combines whenever it can) | 51% (41–61) |

A player that never combines loses badly, so combining clearly earns its place in the game. Combining even more than Careful does gains nothing, so it isn't an automatic "always do it" move either. Careful combines about twice per side per game.

**The favourite combination: Water 1 onto Wind 3.** A stack moves at its larger size, so the little Water 1 becomes a Water that moves 3 and can also move as a Wind 3. It's the most common combination by far (1.17 per game). "Water 1 + Wind 3" is also the second-best capturer in the game, after the lone Water 3. In the default formation the two pieces start next to each other, and it's one of White's most common first moves:

```
 3  ·  W3 E1 ·        ──▶       3  ·  RW3 E1 ·      Water 1 (c2) moves onto Wind 3 (b3):
 2  ·  ·  R1 W1                 2  ·  ·   ·  W1     one piece that moves 3 as Water or as Wind
    a  b  c  d                     a  b   c  d
```

That's why removing Water 1 costs so much in the handicap test. It's the rule working as written (range = the larger size, spec §5), but it means a size-1 Water is worth almost as much as a big one once it's combined.

## 6. Cheat hunt: dominant strategies and unbeatable setups

| Style player | Score against Careful | What it tells us |
|---|---|---|
| Turtle (never crosses the middle, Earth next to the Wizard) | 26% (18–35), 42% draws | Hiding doesn't work. Many draws, but it loses far more than it wins |
| Turtle against Thinker | 4% (1–15) | A stronger attacker breaks it almost every time |
| Turtle in the corner fortress | 27% (19–36), 44% draws | The fortress doesn't save it either |
| Rusher (always forward) | 32% (24–42) | All-out attack is worse than balanced play |
| Hunter (only goes for the Wizard) | 40% (31–50) | Same |

- **No unbreakable Earth wall.** The fortress I sketched in the plan (Wizard in the corner under three Earth) doesn't hold:

  ```
   3  W3 W2 F2 R3 W1 R2 ·  R1 ·
   2  E3 E2 E1 ·  ·  ·  ·  ·  ·
   1  Z  F3 F1 ·  ·  ·  ·  ·  ·
      a  b  c  d  e  f  g  h  i
  ```

  It scores 41% against the default formation and draws a lot (32%). Played by the Turtle, it scores 27%. Each side has only three Earth pieces, and Water bends around them (§4).
- **No forced quick win from the default formation.** In 500 games between equal look-ahead players, the quickest win took 9 moves each.
- **No endless loops.** Every game ended, and none came near the safety limit.

**One catch from random formations:** with a careless setup the game can be lost at once. In 3 of 300 games with random formations, the game was over within 3 moves each. Once White gave checkmate on its very first move: a Water 3 moved up the edge column, and from there it attacked a Wizard boxed in by its own pieces. The spec is right that no Wizard *starts* under attack, but nothing stops a setup that can be mated in one move. With your alternating, visible placement, a player would see it coming, but a new player might not.

## 7. Exact range: better or worse?

The same tests with the exact-range variant on:

| | Normal ("up to N") | Exact range |
|---|---|---|
| White's score, Careful vs Careful | 52% | 50% |
| White's score, Thinker vs Thinker | 56% | 53% |
| Thinker vs Careful | 96% | 92% |
| **Draws, Careful vs Careful** | 23% | **59%** (44% by the 50-move rule) |
| **Draws, Thinker vs Thinker** | 21% | **43%** |
| Typical length, Careful (moves each) | 55 | **110** |
| Checkmates, Careful | 72% | 35% |

The variant is just as fair and skill matters just as much. But **games last twice as long and are drawn about twice as often**, mostly because nobody can make progress for 50 moves. The likely reason: pieces can't stop short, so it's much harder to put a piece exactly where it attacks. Water's edge slides mostly vanish (10 of 140 mates instead of 69 of 287), and its mates come from bending around Earth instead.

By the usual yardstick for a good game (fair, decisive, a good length; research note §3.4), **exact range plays worse** at this level. It might feel different to people, who plan further ahead than these bots.

## 8. Formations

| Formation (played by Careful) | Score against the default formation |
|---|---|
| A random formation | 31% (25–37) |
| Centre bunker (Wizard ringed by all three Earth) | 35% (26–44) |
| Corner fortress (diagram in §6) | 41% (32–51), 32% draws |

**Your default formation is good:** it beats random setups clearly and beats both fortress ideas. The corner fortress comes closest, mostly by drawing.

### Searching for better formations

A search (`search.mjs`) tried about 100 formations in about 5,000 games:
- variations of your default, random setups, and three hand-made ones with Fire moved forward
- each round it kept the best eight and varied them again
- at the end the top six played each other and your default (40 games per pair)

| Formation | Score in the final round robin |
|---|---|
| **Your default** | **53%** |
| The six best from the search | 45–51% |

**Nothing beats your default.** Early in the search some formations scored up to 67%, but that was luck from only 30 games. With more games they settled back near 50%. What the search does show is that **many formations are about equally good**: a set of good starting formations is easy to offer, and a player's setup won't decide the game. All six finalists moved Fire 2 forward, for example:

```
 Fire forward (in formations.mjs as fireForward)
 3  ·  W3 E1 ·  E3 ·  E2 W2 ·
 2  ·  ·  R1 R2 F2 ·  R3 F1 ·      Fire 2 and Fire 1 in front, Wind 1 on the back row
 1  ·  ·  ·  F3 Z  W1 ·  ·  ·
    a  b  c  d  e  f  g  h  i
```

Even there Fire made only 0.4–0.75 captures per game, against Water's 2.0–2.4 in every formation tried.

### Can a formation hold off Water?

Each formation played 150 games against your default. The table counts how often **the formation under test** was checkmated, and how many of its pieces the default's Water took:

| Formation | Score | Times mated | …by Water | Pieces lost to Water per game |
|---|---|---|---|---|
| Your default (against itself) | 56% | 42 | 34 | 1.35 |
| Fire forward | 52% | 51 | 42 | 1.34 |
| Fire forward 2 (`fireForward2`) | 49% | 52 | 44 | 1.61 |
| **Earth shield** | **29%** (22–37) | **86** | **68** | **2.26** |

The Earth shield is the obvious defence against edge slides: Earth on both sides of the Wizard, where it can never be captured.

```
 Earth shield
 3  ·  W3 F3 ·  E3 ·  F2 W2 ·
 2  ·  ·  R1 W1 R2 F1 R3 ·  ·
 1  ·  ·  ·  E1 Z  E2 ·  ·  ·      Earth on d1 and f1: nothing can slide along row 1
    a  b  c  d  e  f  g  h  i
```

**It backfires badly.** It was mated twice as often as your default. The Earth takes the Wizard's own escape squares, and it gives the enemy Water posts to bend around: mates around the defender's own Earth went from 4 to 14. And once the Earth steps away, the edge is open again (14 edge mates).

**So no: Water's strength isn't a formation problem.** No formation we tried makes the enemy Water less dangerous, and the one built to stop it is the worst of all. It has to be a rule question (§9).

## 9. Taming Water: two rule variants

Two variants, both switchable in the rules (GAME_SPEC §3):

- **No edge slide** (`noWaterEdge`): Water can't turn along the board edge, only around Earth.
- **Straight captures** (`waterStraightCapture`): Water still flows and bends around Earth to get somewhere, but the step that lands on an enemy piece must be a straight flow along the column.

```
 Normal rules: allowed                Straight captures: not allowed
 3  ·  E  z     Water bends around    3  ·  E  z     the step onto z is sideways,
 2  ·  R  ·     E onto the Wizard     2  ·  R  ·     so it can't capture; Water must
    b  c  d                              b  c  d     arrive moving up or down a column
```

### Equal Careful players, default formation (300 games per variant, 400 for normal rules)

| | Normal | No edge slide | **Straight captures** | Both |
|---|---|---|---|---|
| White's score | 52% | 53% | **54%** (49–60) | 56% |
| Draws | 23% | 30% | **24%** | 31% |
| Moves each (median) | 55 | 69 | **74** | 84 |
| Checkmates given by Water | 78% | 74% | **40%** | 32% |
| …by Fire / by Wind | 11% / 11% | 12% / 14% | **31% / 29%** | 35% / 35% |
| Captures per game: Water / Wind / Fire | 3.1 / 1.4 / 0.6 | 3.1 / 1.7 / 0.7 | **3.0 / 2.4 / 1.0** | 2.9 / 2.4 / 1.3 |
| Thinker vs Careful | 96% | 94% | **100%** | 95% |

### What a missing piece costs (default formation minus one piece, 80 games each)

| Missing | Normal | No edge slide | **Straight captures** | Both |
|---|---|---|---|---|
| Water 3 | **17%** | 32% | **38%** | 32% |
| Wind 3 | 31% | 29% | **37%** | 36% |
| Fire 3 | 49% | 45% | **41%** | 39% |

- **Straight captures even out the elements.** Water, Wind and Fire each give about a third of the checkmates, and their big pieces are worth about the same. For the first time, losing Fire 3 costs something.
- **That also explains Fire.** Fire wasn't broken. Water's bent and sideways captures did Fire's job better. Take those away, and Fire's straight lines matter.
- **No edge slide alone is a small fix.** Water just switches to bending around the attacker's own Earth, which becomes its main route (87 of 184 mates), and it still gives three quarters of the checkmates.
- **Both together** add draws and length for little extra gain.

### The strongest bots (Thinker against Thinker)

Thinker almost always picks its single best move, so from the same start it can play the same game again and again. Under straight captures it did exactly that: all 50 games opened with the same Wind raid, and Black seemed to win almost every game. So these games start with one random move per side, which gives every game a different opening:

| Thinker vs Thinker, random first moves | Normal | **Straight captures** |
|---|---|---|
| Games | 60 | **200** |
| White's score | 55% (42–67) | **52%** (45–59) |
| Draws | 23% | **34%** |
| Moves each (median) | 49 | **62** |
| Won by checkmate / by elimination | 52% / 25% | **31% / 36%** |
| Checkmates given by Water | 84% | **53%** |

A first batch of 60 games had White at 37%, which looked like Black gaining an edge. The 200 fresh games put White back at 52%, so that was luck. Between the strongest bots the variant costs a little: **more draws (1 in 3) and longer games.** But it brings something too. **Elimination becomes a real second way to win**, as common as checkmate, which bears on open question 8.

**Recommendation:** try **straight captures** at the table. It keeps Water's signature move, flowing and bending around Earth to get somewhere, and stops it attacking around corners. It's easy to say: *Water moves like a river, but strikes straight.* Watch whether the extra length and draws bother people.

## 10. A stronger bot: Deep

Careful and Thinker look a fixed 2 or 3 moves ahead and score positions with guessed piece values. **Deep** (`deep.mjs`) uses the standard techniques of chess engines:
- It looks one move deeper at a time until its budget of positions runs out.
- It remembers positions it has already searched.
- It tries the most promising moves first.
- At the end of its look-ahead it keeps following captures and checks.
- It treats a repeated position as a draw.

Three chess pruning tricks were tried as well and measured as no help in Elements, so they're switched off.

**Learned piece values.** `tune.mjs` takes positions from 4,000 games of Deep against itself and finds the piece values that best predict who went on to win (chess engines call this "Texel tuning"). A second round, from games played with the learned values, gave nearly the same numbers. Relative to the average attacking piece (= 1):

| | Size 1 | Size 2 | Size 3 |
|---|---|---|---|
| Water | 0.7 | 1.1–1.5 | **2.7** |
| Wind | 0.2–0.3 | 0.4–0.7 | 1.4 |
| Fire | 0.3–0.4 | 0.6 | 1.2 |

Size matters much more than the guessed values assumed: a size-3 piece is worth 3–7 size-1 pieces, not 2. Mobility and combining matter more too. Plain Earth's value can't be measured this way, because it is never captured.

**Ratings.** Every bot played every other 100 times (`node run.mjs rating`). On the chess Elo scale, with Careful fixed at 1000:

| Bot | Rating | Time per move |
|---|---|---|
| Careful | 1000 | 5 ms |
| Thinker | 1256 | 44 ms |
| Deep, 2,000-position budget, guessed values | 1425 | 7 ms |
| **Deep 2k, learned values** | **1690** | **7 ms** |
| Deep 20k, learned values | 1942 | 62 ms |

Learned values gave the biggest single gain, 200–300 points at every budget. Deep 2k with learned values is as fast as Careful, and Thinker scores only 5% against it. It is the new standard bot for experiments.

## 11. The key tests again, with the strong bot

Colours, both handicap tests and the Water variants, rerun with Deep 2k with learned values (`node run.mjs recheck`, 6,000 games; every game starts with one random move per side for variety).

| | Careful (§1–§9) | **Deep 2k, learned values** |
|---|---|---|
| White's score, default formation | 52% | **53–56%** |
| White's score, same random formation | 53% | **53%** |
| Draws | 23% | 24–33% |
| Moves each (median) | 55 | 47–54 |
| Won by checkmate / by elimination | 72% / 5% | **39–52% / 24–32%** |
| Checkmates given by Water / Fire / Wind | 78% / 11% / 11% | **65–72% / 24–29% / 4–8%** |
| Captures per game: Water / Wind / Fire | 3.1 / 1.4 / 0.6 | **3.1 / 2.8 / 2.1** |

**What a missing piece costs**, default formation (50% = no loss, lower = a bigger loss; ±10):

```
          the piece           Careful (§4)                Deep 2k, learned values
 3  ·  W3 E1 ·  E3 ·  E2 W2 ·    ·  31 48 ·  46 ·  46 42 ·     ·  14 50 ·  41 ·  40 36 ·
 2  ·  ·  R1 W1 R2 F1 R3 ·  ·    ·  ·  33 44 43 51 17 ·  ·     ·  ·  23 28 18 50 13 ·  ·
 1  ·  ·  ·  F3 Z  F2 ·  ·  ·    ·  ·  ·  49 Z  48 ·  ·  ·     ·  ·  ·  24 Z  41 ·  ·  ·
    a  b  c  d  e  f  g  h  i    a  b  c  d  e  f  g  h  i     a  b  c  d  e  f  g  h  i
```

With random formations shared by both sides, the strong bot's scores without each piece are: Water 21 / 34 / 35, Wind 24 / 30 / 37, **Fire 30 / 40 / 51**, Earth 47 / 55 / 52 (sizes 3 / 2 / 1).

**What holds:**
- **White's edge stays small,** no bigger with strong play. (§12 adds that the same bots give chess no edge at all, so Elements' edge is a little larger than chess's.)
- **Water is the strongest element.** Losing Water 3 hurts most, and Water still gives two thirds of the checkmates.
- **Straight captures even the elements out:**

| Deep 2k, learned values | Normal | No edge slide | **Straight captures** | Both |
|---|---|---|---|---|
| White's score | 56% | 57% | **54%** | 54% |
| Draws | 33% | 40% | **37%** | 43% |
| Moves each (median) | 54 | 63 | **68** | 68 |
| Checkmates given by Water | 65% | 50% | **35%** | 35% |
| Score without Water 3 / Fire 3 / Wind 3 | 11 / 24 / 18 | 16 / 30 / 14 | **20 / 21 / 18** | 21 / 17 / 24 |

**What changes:**
- **Fire was never useless; the weak bots couldn't use it.** With strong play, losing Fire 3 drops a side to 24% from your formation and to 30% from random ones. Fire is still the weakest attacking element, but it's a real piece.
- **Wind 3 is as valuable as Water 3** (14% and 13% without them).
- **Elimination is a real second way to win**: a quarter to a third of all games. Strong players defend their Wizard well enough that wearing down the enemy's pieces often decides first.
- **Water's lead is smaller than it looked,** so the case for straight captures is weaker than in §9. It still evens the elements out, but it's now a fine-tuning choice rather than a fix for a broken piece. Its price stays the same: longer games and a few more draws.

## 12. Calibration: the same tests on chess

To see how far these methods can be trusted, chess was put through the same framework (`chess/`). The same Deep search and the same tests, but on a game whose answers are known. The chess rules match the standard perft totals (`node chess/perft.mjs`).

**Learning piece values.** Starting from a bot that knows nothing (every piece worth 1), two rounds of learning from 4,000 games each (`node chess/tune.mjs`):

| | Round 1 | Round 2 | Textbook |
|---|---|---|---|
| Pawn | 1 | 1 | 1 |
| Knight | 1.7 | 2.0 | 3 |
| Bishop | 1.9 | 2.15 | 3 (a bit more than a knight) |
| Rook | 3.1 | 3.5 | 5 |
| Queen | 4.8 | 6.2 | 9 |

The order is right, bishop slightly above knight included. Between the pieces the ratios are right too (queen ÷ rook 1.79, textbook 1.8; rook ÷ knight 1.74, textbook 1.67). Only the pawn looks too valuable next to the pieces. Bots at this level trade carelessly, so the smallest pieces count for more.

**The handicap test, same bot as in §11** (Deep 2k with learned values, 200 games each):

| Chess, without… | Score | | Elements, without… | Score |
|---|---|---|---|---|
| **queen** | **7%** | | **Water 3** | **13%** |
| rook | 21% | | Wind 3 | 14% |
| knight | 32% | | Water 2 | 18% |
| bishop | 35% | | Fire 3 | 24% |
| pawn | 47% | | Fire 1 / Earth 1 | 50% |

The chess ranking is right. But the sizes are smaller than among strong humans: a missing pawn costs strong players about 100 rating points, and here only about 20. Weak bots lose material anyway, so a missing piece matters less.

**A dominant piece is normal.** Losing the queen hurts chess more than losing Water 3 hurts Elements. By learned value, Water 3 stands out a little more among its own pieces (2.7× the average attacking piece, against the queen's 2.0×). Elements seems to make up for a missing piece better, because Wind 3 and Water 2 can take over part of Water 3's job.

**White's edge and draws.** Same bot, 400 chess games: White scores **48%** (43–53), with 10% draws, against 54–56% White and 30–50% draws among masters. Bots this weak play like weak humans, who draw little and turn the first move into no measurable edge.

**So, how far to trust the Elements results:**
- **Piece rankings and rough ratios: yes.** They came out right in chess.
- **Exact sizes of effects: as rough guides only.** Real effects among strong players are probably bigger.
- **White's edge: compare, don't read off.** With the same bots, Elements shows 53–56% and chess 48%. So Elements' first-move edge is probably a little larger than chess's, but these bots can't say how big it is among strong players.
- **Draws: Elements is more drawish than chess at the same level** (24–33% against 10%), mostly from the 50-move rule.

## 13. The move limit: 50 or more?

Most draws between strong bots came from the 50-move rule: 50 moves by each player with no capture and no combine. At those draws:
- A median of **3 capturing pieces** are left in total, just 1 on the weaker side.
- The material gap is under one piece.
- More than half of the last 100 moves are **Wizards and plain Earth shuffling**.

Earth never leaves the board, so a few remaining attackers can't break its walls. In chess the blockers can be captured, and the same bots draw only 6% this way.

Deep 2k with learned values, 400 games per row, your default formation (`node run.mjs drawLimit`):

| Moves each before a draw | Decided | Drawn by the limit | Typical game (moves each) | Longest 10% |
|---|---|---|---|---|
| 50 | 67% | 28% | 52 | 97+ |
| **75** | **77%** | **19%** | **50** | **117+** |
| 100 | 78% | 17% | 59 | 148+ |
| no limit | 89% | (4% reach the 500-move cap) | 50 | 259+ |

With random formations it's 16% → 12% → 11%. **Decision: 75 moves each** ✅ *(designer, 2026-10-28)*. It turns a third of these draws into wins, and the typical game stays the same length; going further buys little. Games in §1–§12 were played with 50.

## 14. Formations with strong play

**The second formation search** is written up with drawn boards in [FORMATIONS.html](FORMATIONS.html). About 220 formations played a league with Deep 2k. The eight best then played each other and your default. Your default came last (43%), and **"Wind 3 held back"** came first, so it is now the app's default, with five more presets ✅ *(designer, 2026-10-28; GAME_SPEC §6)*. Mixed formations, where each side starts differently, give fewer draws (17%) and slightly shorter games than both sides using the same one.

### What makes a formation strong?

554 formations each played 28 games, two as White and two as Black against each of the seven presets (Deep 2k with learned values, 75-move rule, 15,500 games in all; `node formation-study.mjs collect`, then `fit`). There were three kinds: the seven presets, 354 variations of them with 1 to 6 pieces moved at random, and 200 random formations.

**Good formations are narrow peaks.** Moving one piece of a preset to a random square costs about 8 points on average. After three or more moves, little is left of the preset's strength:

| Formation | Score against the presets | Formations |
|---|---|---|
| The presets themselves | 52% | 7 |
| A preset with 1 piece moved | 44% | 60 |
| … 2 pieces moved | 41% | 63 |
| … 3 pieces moved | 33% | 56 |
| … 4 to 6 pieces moved | 31% | 168 |
| Random formations | 25% | 200 |

A few variations scored as well as the presets, up to 73%. With 28 games that is uncertain by about ±9 points, though, and in the search such high early scores usually turned out to be luck.

**Rules of thumb.** These are the features that went with a higher score. Each was checked both near the presets and in the random formations:

| Feature | Near the presets | Random formations |
|---|---|---|
| **Water touching your own Earth** (of 3 Waters) | 0: 28% · 1: 33% · 2: 35% · **3: 39%** | 0: 18% · 1: 24% · 2: 26% · **3: 30%** |
| …with the Earth right in front of the Water | 0: 35% · 1: 34% · **2: 40%** | 0: 24% · 1: 26% |
| **Combines possible on the first move** (pieces close together) | ≤20: 33% · 21–25: 36% · **26+: 40%** | ≤20: 23% · 21–25: 28% · 26+: 29% |
| **Water on the front row** | none: **37%** · some: 33% | no difference |
| **Earths on the front row** | 0: 30% · 1: 34% · **2: 38%** · 3: 36% | no difference |
| **Earth right in front of the Wizard** | no: **36%** · yes: 30% (26 formations) | no difference |
| **Wind 3** on row 1 · 2 · 3 | **37%** · 36% · 33% | no difference |

So, in game terms:

1. **Give each Water an Earth to lean on.** This is the strongest rule, and it holds everywhere. Water bends around Earth, so an Earth just ahead gives it routes to both sides, and the same Earth blocks attacks aimed at the Water.
2. **Keep the pieces close together**, so they can combine early.
3. **Water starts on the middle row, Earth on the front row.** The Earth walls the front, and the Water waits behind it.
4. **Don't put Earth directly in front of your Wizard.** It probably takes the Wizard's escape square and gives enemy Water a post to bend around next to the Wizard, the same way the Earth shield failed in §8. This rule rests on only 26 formations, though.
5. **Keep Wind 3 back.** Moving it back is the main change from your default to Wind 3 held back.

Wind 3 held back follows them:

```
 3  ·  ·  ·  ·  E3 ·  E2 F1 ·      E3 stands in front of R2, and E2 in front of R3
 2  ·  ·  R1 W1 R2 W2 R3 ·  ·      R1 touches E1; all three Waters lean on Earth
 1  ·  E1 W3 F3 Z  F2 ·  ·  ·      Wind 3 on the back row, nothing in front of the Wizard but Water
    a  b  c  d  e  f  g  h  i
```

**What didn't matter:** whether the Wizard starts on row 1 or further forward (36% either way), whether it stands on the e-file, whether the three Winds share a square colour, and where Fire, Fire 3 or Water 3 stand.

**These rules are only part of the story.** Together, all 23 features measured explain about a quarter of the real differences between formations, the part that isn't luck. Among the formations near the presets, they explain about a tenth. Your original formation is the clearest example. It follows rules 1–4 better than any preset: all three Waters have Earth right in front, three Earths are on the front row, and it has 27 combines. Yet it is the weakest preset (34% here), probably because Wind 3 stands exposed on b3. **What makes a formation strong is mostly how its pieces work together**: which piece covers which and where the Water can go. That can't be read off a checklist. It has to be found by playing, as the search did.

What this means for players: a player who builds a formation from scratch at the table will rarely stumble on one as strong as the presets. So presets are worth offering, and the placement phase gives an experienced player a real edge.

### Are mirror images as strong?

Mirrored left to right, a formation is the same idea on the other wing. Playing a formation against its own mirror image would prove nothing: that game is the same board seen in a mirror, so it's a fair fight by symmetry. The real question is whether the mirror image does as well against *other* formations. So each preset, and its mirror image, played all seven presets, 40 games each (280 games per row, `node run.mjs mirrorCheck`):

| Preset | As designed | Mirrored |
|---|---|---|
| Wind 3 held back | 59% (53–65) | 57% (51–63) |
| Mirrored and reshaped | 50% | 51% |
| Fire in front of the Wizard | 54% | 47% |
| Fire 1 in front | 47% | 46% |
| Low Winds, Earth forward | 46% | 52% |
| Wizard forward | 53% | 46% |
| Original | 42% | 46% |
| **Average** | **50%** | **49%** |

**Yes, mirror images are just as strong.** The biggest gaps, 6–7 points, are within what luck gives with 280 games each (about ±8 for a difference), and they go both ways. Draws and game length don't change either. So the app can offer every preset in both orientations.

### Does the ranking hold with the strongest bot?

The seven presets played a round robin, 60 games per pair (360 games per preset), once with Deep 2k and once with Deep 20k, which searches ten times as many positions (`node run.mjs presets2k`, `presets20k`):

| Preset | Deep 2k | Deep 20k |
|---|---|---|
| Mirrored and reshaped | 51% | **60%** |
| Fire in front of the Wizard | **56%** | **57%** |
| Wind 3 held back | **54%** | **55%** |
| Low Winds, Earth forward | 48% | 50% |
| Fire 1 in front | 50% | 44% |
| Original | 44% | 43% |
| Wizard forward | 47% | 41% |
| Draws | 17% | 11% |
| Typical game (moves each) | 40 | 37 |

Each score is uncertain by about ±5 points.

**The ranking holds in broad terms.** The same three formations lead with both bots: Wind 3 held back, Fire in front of the Wizard, and Mirrored and reshaped. Your original stays near the bottom. Within the top three the order shuffles, which shows they are about equally strong: Wind 3 held back beat the other two 56% and 62% in the 200-game head-to-heads with Deep 2k, and here it is level with Mirrored and reshaped (48%) and beats Fire in front of the Wizard 58%. Wind 3 held back is in the top three in every test, and first in the most of them (the search's round robin, the head-to-heads and the mirror check), so it stays a sound default.

**Wizard forward loses ground with stronger play** (47% → 41%). A Wizard on the front row is easier to attack for a bot that looks further ahead. It is still a fair choice for players who like it, but it is the weakest preset against strong opponents.

**Stronger play draws less.** Draws fall from 17% to 11%, and games get a little shorter. That's a good sign: the draws come from weak play more than from the game itself.


## 15. Rules v0.3: Water bends diagonally, one way per move

Playing the prototype, the designer found Water's attacks hard to see and its reach too large. Ten Water rules were compared in strong-bot games ([WATER-RULES.html](WATER-RULES.html), GAME_SPEC open question 10). The designer chose **diagonal bends with one way per move**, keeping the edge slide. Since rules v0.3 that is the default ✅ *(designer, 2026-10-28; GAME_SPEC §3)*. Water still flows along its column. Its steps around Earth must be diagonal, and within one move it goes only forward or only backward.

```
 5  ·  ○  ○  ·  ·      Water 3 on b2, Earth on c3 (the spec's example):
 4  ·  ○  ○  ·  ·      up the b-file, diagonally around the Earth to c4 and on,
 3  ·  ○  E  ·  ·      or back to the edge and along it.
 2  ·  R  ·  ·  ·      Gone: c2, d2, d3 and d4 (sideways steps) and a2
 1  ○  ○  ○  ○  ·      (back to the edge, then up again). 14 squares → 9.
    a  b  c  d  e
```

All results below start from Wind 3 held back unless stated, under the 75-move rule.

**With the strongest bot** (Deep 20k, 200 equal games and 100 per handicap row; `node run.mjs v03strong`):

| Deep 20k | v0.2 | v0.3 |
|---|---|---|
| White's score | 51% | 51% |
| Draws | 16% | 20% |
| Typical game (moves each) | 40 | 49 |
| Checkmates given by Water | 67% | 71% |
| Score without Water 3 / Fire 3 / Wind 3 | 8 / 22 / 10% | 17 / 18 / 10% |

**The key tests with Deep 2k** (`node run.mjs v03recheck`):
- **White's edge stays small:** 52% from the default formation and 52% from shared random formations.
- **Draws:** 22% from the default formation and 32% from random ones. With v0.2 Water it was 24% from the default.
- **Every piece's value** from Wind 3 held back (score of a side starting without it, 100 games each):

```
 3  ·  ·  ·  ·  E3 ·  E2 F1 ·      ·  ·  ·  ·  45 ·  47 41 ·
 2  ·  ·  R1 W1 R2 W2 R3 ·  ·      ·  ·  28 27 30 25 17 ·  ·
 1  ·  E1 W3 F3 Z  F2 ·  ·  ·      ·  46  8 24 Z  34 ·  ·  ·
    a  b  c  d  e  f  g  h  i      a  b  c  d  e  f  g  h  i
```
- From shared random formations (sizes 3 / 2 / 1): Water 20 / 37 / 38, Wind 31 / 38 / 38, Fire 27 / 36 / 42, Earth 43 / 54 / 54. With v0.2 (§11) it was Water 21 / 34 / 35, Wind 24 / 30 / 37, Fire 30 / 40 / 51.

**Playing styles** (Careful with one habit against Careful, 100 games each; `node run.mjs v03styles`): Turtle 31%, Rusher 28%, Hunter 43%, Never-combiner 13%, **Combiner 65%** (v0.2: 26 / 32 / 40 / 23 / 51%). No habit wins outright. But combining matters more than before: a bot that likes to combine now beats a plain one.

**Formations under v0.3:**
- The presets' round robin (Deep 2k, `node run.mjs presetsV03`): Wind 3 held back comes first, about 35 rating points above Fire in front of the Wizard. The other presets follow, 60–95 points behind.
- A new formation search under v0.3 (`node search.mjs 1 v03`) found one formation about as good: "Fire forward", your original with Fire 2 in front of the Wizard and Fire 1 out on h2.
  - Head to head it beat Wind 3 held back 57% (50–64) with Deep 2k, and 53% (43–62) with Deep 20k. That is level.
  - The other finalists were weaker than both.

```
 3  ·  W3 E1 ·  E3 ·  E2 W2 ·      Fire forward
 2  ·  ·  R1 R2 F2 ·  R3 F1 ·
 1  ·  ·  ·  F3 Z  W1 ·  ·  ·
    a  b  c  d  e  f  g  h  i
```

**What changes with v0.3:**
- **Water is no longer the piece you can't lose.** With the strongest bot, losing Water 3 now costs about as much as losing Fire 3 (17% and 18%); before, it was 8%. From the default formation, Wind 3 is now the most valuable piece. From random formations Water 3 still matters most, so Water stays the strongest element, by a smaller margin.
- **Water still gives most checkmates** (about 70%). It's still the piece that finishes games, but it captures less (2.8 instead of 3.4 per game, §14's comparison).
- **The game stays fair and decisive:** White 51–52%. Draws are about the same with Deep 2k and a little higher with Deep 20k (16% → 20%). Games are 5–10 moves longer.
- **Combining matters more**, probably because a single Water now reaches less, so Water stacks pay off.
- **Wind 3 held back stays a good default.** Fire forward became the seventh preset (designer, 2026-10-29).

## 16. How games unfold: leads, comebacks, Earth and draws

Read from games already played under v0.3, between equal sides: 2,260 games of Deep 2k and 300 of Deep 20k (the presets' round robin, the v0.3 recheck, the strong-bot check and the Fire forward match; `node arc.mjs`). **"Ahead by 1"** means one side has captured one more of the other side's elements (a stack counts as two). It's counted after the other side has replied, so an even trade doesn't count as a lead.

**The first time a side gets ahead, how does that side do?**

| Ahead by | Happens in | Deep 2k: wins / draws / losses | Deep 20k: wins / draws / losses | Around move |
|---|---|---|---|---|
| 1 | 90% of games | 55 / 24 / 22% | 70 / 13 / 17% | 15–20 |
| 2 | 65% | 71 / 18 / 12% | 88 / 8 / 4% | 30 |
| 3 | 40% | 86 / 9 / 5% | 96 / 3 / 1% | 40 |
| 4 | 24% | 94 / 4 / 2% | 100 / 0 / 0% | 43 |

- **One element up is an edge, not a win.** With Deep 2k a third of those games still end drawn or lost.
- **Two up nearly decides it with strong play** (88% wins), and three up is the end. The better the players, the more surely a lead turns into a win, as in chess.
- **Comebacks happen, but small ones.** Of the decided games, the winner had been one element behind in 31% (Deep 2k) and 19% (Deep 20k), two behind in 10% and 4%, and three behind in 2% and 0%.
- **15–18% of wins come without ever being ahead**: a checkmate out of an even position.
- v0.2 looked much the same with Deep 20k (two up: 90% wins), so the new Water rule didn't change how games unfold.

**Earth's comeback move** (§5 of the spec: combine Earth with an attacker, so it can attack):
- **The bots use it early and often, not as a comeback.** It happens in 90% of games, about twice per game. Each side's first one comes around move 7, and a quarter come within the first two moves, mostly while the material is still even. A quarter of all combines involve Earth.
- **Does it help the side that's behind?** `node run.mjs earthComeback`: Deep 2k from Wind 3 held back, 400 games per row with both colours. Side A either plays normally or never combines Earth:

| Side A starts | A may combine Earth | A never combines Earth | What not combining costs |
|---|---|---|---|
| Even | 50% (both the same bot) | 47% (42–51) | 3 points |
| Without Fire 2 | 31% (26–35) | 24% (20–28) | 7 points |
| Without Water 3 | 21% (18–26) | 13% (10–16) | 8 points |

- **It works as you meant it:** it's worth two to three times as much to the side that's a piece down as from an even start. For a side without Water 3, losing the option drops its score from about 1 in 5 to about 1 in 8.
- But because it's allowed from the first move, the bots treat it as an ordinary way to strengthen a piece, not something saved for a comeback. (The bots' scoring also likes stacks in general, which may push them to combine early.)

**Draws:**
- 26% of these games were drawn with Deep 2k and 17% with Deep 20k. Two thirds ended by the 75-move rule and the rest by repetition. There were no stalemates.
- **Drawn games are long grinds:** a median of about 105–110 moves each, against 43 for decided games.
- **A quarter of draws end with one side two or more elements up** that it couldn't turn into a win. A typical ending is two attacking stacks against one Water stack, with two plain Earths guarding the Wizard. A third of draws end level, and the rest one element apart.

## 17. The setup phase: does seeing the other side's formation help?

Your rule has players place one piece at a time, in the open (GAME_SPEC §6). That gives a real decision only if the best formation depends on what the other side builds. If one formation is best whatever the opponent shows, open placement adds turns but no choices. Two tests (`node setup-study.mjs matrix`, then `counter`), Deep 2k with learned values.

**Do formations counter each other?** From games already played: how much a formation's score depends on which formation it meets, beyond its overall strength. A model gives each formation one strength. What it leaves unexplained, beyond what luck gives, is the part that depends on the opponent.

| Games | Typical difference in overall strength | Extra difference from who it meets |
|---|---|---|
| 554 formations against the 7 presets (v0.2, 15,500 games) | 14 points | **4–5 points** |
| The presets against each other, v0.3, Deep 2k | 4 points | 3 points |
| The presets against each other, v0.2, Deep 2k | 3 points | 5 points |
| The presets against each other, v0.2, Deep 20k | 6 points | **none measurable** |

Formations are mostly just stronger or weaker. Which formation they meet shifts their score by a few points, and with the strongest bot not measurably.

**The most seeing could be worth.** A player sees the whole opposing formation, then may move up to three pieces of Wind 3 held back to beat it. The search tried all 257 one-piece changes (a piece to another square, swapping if it's taken), 16 games each against the target. The best 8 played 48 more, the best one was kept, and the search went on to a second and a third piece. Then fresh games measured each step: 400 against the target, and 60 against each of the other presets. About 67,000 games in all, rules v0.3.

Score of Wind 3 held back, as is and with its pieces moved, **against the formation it saw** (and against the other presets, in brackets):

| Formation seen | As is | 1 piece moved | 2 moved | 3 moved |
|---|---|---|---|---|
| Wind 3 held back (itself) | 51% (58%) | 49% (55%) | 52% (56%) | 48% (58%) |
| Fire forward | 44% (55%) | 49% (59%) | 48% (66%) | 50% (56%) |
| Wizard forward | 56% (58%) | 49% (54%) | 54% (56%) | 59% (55%) |
| Original | 63% (57%) | 60% (59%) | 68% (62%) | 66% (57%) |

Each score is uncertain by about ±5 points. In the search these same changes had scored 59–77% against the target.

- **Seeing gains a few points at most.** The best counters gained 1–6 points against the formation they were built for. Some of that came against the other presets too, so it wasn't a counter, just a slightly different good formation. That's about the size of White's first-move edge, and within luck.
- **The search fooled itself every time.** Changes that scored 59–77% in the search scored 48–68% in fresh games. With 16–64 games a lucky formation looks great, the same lesson as the narrow peaks in §14.
- **One lead worth a recheck.** Wind 3 held back with Fire 1 and Fire 2 swapped and Earth 1 moved to i2 scored 66% (62–71) against the other presets, against 55% for the unchanged formation in the same games. It's one result among sixteen, so it may be luck:

```
 Wind 3 held back                       Fire swapped, Earth 1 to i2
 3  ·  ·  ·  ·  E3 ·  E2 F1 ·           3  ·  ·  ·  ·  E3 ·  E2 F2 ·
 2  ·  ·  R1 W1 R2 W2 R3 ·  ·           2  ·  ·  R1 W1 R2 W2 R3 ·  E1
 1  ·  E1 W3 F3 Z  F2 ·  ·  ·           1  ·  ·  W3 F3 Z  F1 ·  ·  ·
    a  b  c  d  e  f  g  h  i              a  b  c  d  e  f  g  h  i
```

**What this means for the setup phase:**
- **For these bots, open placement adds turns but few decisions.** What you see of the other side barely changes what you should build. The decisions that matter are in building a good formation at all (a random one scores 25% against the presets, §14), and those exist whether the placement is open or hidden.
- **Placing last doesn't help Black either.** Under the current rule Black places the last piece, but seeing everything is worth too little to balance White's first move.
- So building both formations at the same time, in secret, then revealing them (the spec's "Hidden setup" variant) would lose little. In the app it also saves 26 turns of waiting. Open, alternating placement can stay if it feels good at the table: it isn't harmful, just not where the depth is.
- **Limits:** the search started from the default and moved at most three pieces, and people may read a formation in ways these bots can't (spotting an exposed Wizard, say). The 554-formation test covers far more varied formations and agrees.

## 18. Earth breaks Earth: does it cut the draws?

§16 found that a quarter of draws end with one side two or more elements up, and the defender's plain Earths beside its Wizard looked like the reason. The idea (GAME_SPEC open question 13): **an Earth combined with an attacker may capture plain Earth**, so the only thing that breaks an Earth wall is another Earth that has turned into an attacker. It's a rules switch, `earthBreaksEarth`, off by default (`node run.mjs earthBreaks`, 400 games per row, rules v0.3).

The learned piece values score a plain Earth as worth minus 3, because Earth was never captured. Under this rule a bot would then be glad to lose its Earths. So both sides of every comparison here count every Earth as +2 (`WEIGHTS.earthWall`). With today's values the same games looked the same (52%, 23% draws).

```
 8  ·   ·   z   ·   ·       Black's Wizard on e8 behind two plain Earths.
 7  ·   e   e   ·   ·       Today the Earth on e7 blocks White's Earth + Fire stack.
 6  ·   ·   ·   ·   ·       With the rule, the stack may take it (e5 → e7).
 5  ·   ·   EF3 ·   ·
    c   d   e   f   g
```

| | Normal rules | Earth breaks Earth |
|---|---|---|
| **Draws**, Wind 3 held back, Deep 2k | 21% | **21%** |
| **Draws**, shared random formations, Deep 2k | 33% | **31%** |
| **Draws**, Wind 3 held back, Deep 20k | 20% | **21%** |
| White's score (Deep 2k / random / Deep 20k) | 52 / 53 / 51% | 53 / 52 / 47% |
| Typical game, moves each | 46 / 62 / 49 | 49 / 68 / 44 |
| Won by elimination (Deep 2k / Deep 20k) | 28 / 28% | 32 / 31% |
| Earth captured | never | in about 1 game in 3 (0.4–0.5 per game) |
| Two elements up, then wins (Deep 2k / Deep 20k) | 79 / 80% | 83 / 82% |

- **The rule works as a move**: Earth gets broken in about a third of the games, the game stays fair, and games are about as long.
- **But it doesn't cut the draws.** The walls weren't the real cause. In the drawn games under the new rule, the side that's behind has only 0–1 plain Earth left, so its walls *are* broken, and the side that's ahead still has an Earth stack in most of them. What it lacks is attackers: a median of **1–2 attacking pieces** left. That's too little to checkmate a Wizard or catch the last enemy attacker, much like a chess ending with too little material.
- So the draws come from **too little attacking material at the end**, not from Earth. A rule that targets them would have to act on that: for example, the side that's well ahead wins at the move limit, or a side down to its last attacking piece loses.
- Small upside: a lead converts a little more often (two up: 79 → 83%), and elimination wins rise a little. Earth's character changes, though: it's no longer the piece that can never be taken.

## 19. The Wizard stays home: does it cut the draws?

§18 showed that draws come from too few attackers left at the end: one or two attacking pieces can't trap a Wizard that runs across the board. And today's Wizards do run. In the test games they reached every row, the opponent's back row included. The designer's idea (GAME_SPEC open question 14): **the Wizard may never leave its zone**. Two versions were tested against today's rule, as a rules switch `wizardZone` (`node run.mjs wizardZone`, 400 games per row, rules v0.3):

```
 Home zone (27 squares)                Castle (9 squares)
 3  ▢  ▢  ▢  ▢  ▢  ▢  ▢  ▢  ▢          3  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·
 2  ▢  ▢  ▢  ▢  ▢  ▢  ▢  ▢  ▢          2  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·
 1  ▢  ▢  ▢  ▢  Z  ▢  ▢  ▢  ▢          1  ·  ·  ·  ▢  Z  ▢  ·  ·  ·
    a  b  c  d  e  f  g  h  i             a  b  c  d  e  f  g  h  i
```

- **Home zone:** the Wizard moves anywhere in its own three rows, never into the middle.
- **Castle:** the Wizard stays on d1–f3 (Black: d7–f9) and must start there. All seven presets already do. Chinese chess (xiangqi) keeps its king in a 3×3 palace the same way.

Random formations here put the Wizard on a castle square, so all three rules start from the same kind of formation.

| | Anywhere (today) | Home zone | Castle |
|---|---|---|---|
| **Draws**, Wind 3 held back, Deep 2k | 23% (19–28) | 20% | **10%** (8–14) |
| **Draws**, shared random formations, Deep 2k | 31% | 24% | **15%** |
| **Draws**, Wind 3 held back, Deep 20k | 20% (16–24) | 14% | **11%** (8–14) |
| White's share of decided games (Deep 2k / random / 20k) | 50 / 54 / 48% | 55 / 53 / 52% | 50 / 51 / 50% |
| Typical game, moves each (Deep 2k / random / 20k) | 49 / 65 / 47 | 38 / 53 / 41 | **31 / 34 / 35** |
| Longest 10% of games, past (Deep 2k / 20k) | 119 / 105 | 103 / 88 | 68 / 59 |
| Won by checkmate / elimination (Deep 20k) | 50 / 31% | 54 / 32% | 59 / 30% |
| Won within 20 moves each (Deep 2k / random / 20k) | 4 / 5 / 3% | 7 / 8 / 3% | 12 / 19 / 4% |
| Stalemates | 0 | 0 | 0 |

- **The castle halves the draws** in all three settings and brings them to about chess's level with the same bots (§12). Draws by the 75-move rule almost disappear (2–4% of games, from 10–26%). What's left is mostly repetition.
- **The game stays fair.** White's share of decided games is 50–51%.
- **No stalemates**, even with the Wizard boxed into nine squares.
- **Games get shorter**, mostly at the long end: the longest tenth of games ends by move 59–68 instead of 105–119. The typical game drops from about 48 to 33 moves each.
- **Both ways to win stay.** Elimination still decides 21–30% of games, and checkmate a little more than before.
- **Comebacks stay.** The winner had been behind by one element in 33% of decided Deep 2k games (27% today) and 21% with Deep 20k (24%).
- **One thing to watch: quick wins.** A Wizard that can't run can be caught early. Between the strong bots this barely shows (4% of games won within 20 moves each, against 3%). But the weaker bot loses 12% of games that fast, and with random formations 19%. A careless formation or a careless opening gets punished hard, so beginners would feel this most.
- **The home zone helps much less**: 23 → 20%, 31 → 24% and 20 → 14%. Nine files are still enough room for a Wizard to run.

## 20. The castle return: the Wizard brings pieces back

The strict castle (§19) halves the draws but takes away the Wizard's freedom and punishes a careless defence hard. The designer's next idea (GAME_SPEC open question 15): **Wizards move freely, and a Wizard standing in the enemy castle may, instead of moving, bring back one of its side's captured pieces.** It's a rules switch, `castleReturn` with `returnTo` (`node run.mjs castleReturn`, 400 games per row, rules v0.3).

```
 9  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·     Black's castle d7–f9.
 8  ·  ·  ·  ▢  ▢  ▢  ·  ·  ·     White's Wizard has walked in to e7.
 7  ·  ·  ·  ▢  Z  ▢  ·  ·  ·     Instead of a move, White brings back
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·     a captured piece, e.g. Water 3 onto e2.
    a  b  c  d  e  f  g  h  i
```

- **Once per visit:** after bringing a piece back, the Wizard has to leave the castle and come back in before it can bring another. Tested against **every turn** in the castle, as a comparison.
- The piece goes onto an empty square of the side's **own home zone** or, in the second version, its **own castle**.
- A return restarts the 75-move count, like a capture. No return while in check.
- Walking a Wizard across the board takes more moves than Deep looks ahead, so both sides score a Wizard closer to the enemy castle as worth part of the best piece it could bring back, once the opponent is down to 4 attacking pieces or fewer (`WEIGHTS.castleWalk`). It changes nothing when the rule is off.

| | Today | Strict castle (§19) | Once per visit, home zone | Once per visit, home castle | Every turn, home zone |
|---|---|---|---|---|---|
| **Draws**, Wind 3 held back, Deep 2k | 27% (23–31) | 13% | **11%** (9–15) | **13%** | 11% |
| **Draws**, shared random formations | 30% | 16% | **12%** | **14%** | 14% |
| **Draws**, Wind 3 held back, Deep 20k | 18% (14–22) | 11% | **13%** | **11%** (8–14) | 12% |
| White's share of decided games (Deep 2k / random / 20k) | 53 / 54 / 48% | 58 / 51 / 54% | 53 / 57 / 46% | 59 / 49 / 53% | 49 / 52 / 51% |
| Typical game, moves each (Deep 2k / random / 20k) | 50 / 68 / 47 | 31 / 35 / 34 | 48 / 59 / 52 | 47 / 58 / 49 | 46 / 52 / 47 |
| Longest 10% of games, past (Deep 2k / 20k) | 126 / 106 | 69 / 63 | 103 / 99 | 93 / 101 | 91 / 95 |
| Won within 20 moves each (Deep 2k / random / 20k) | 5 / 5 / 2% | 13 / 16 / 8% | 5 / 7 / 3% | 5 / 6 / 3% | 6 / 8 / 1% |
| Games with a return (Deep 2k / random / 20k) | | | 23 / 38 / 17% | 25 / 34 / 13% | 26 / 32 / 14% |

- **It cuts the draws as much as the strict castle**: from 27–30% to 11–14% with Deep 2k, and from 18% to 11–13% with Deep 20k. Draws by the 75-move rule fall to 2–7% of games.
- **Without the strict castle's cost.** Quick losses stay at today's level (1–8% of games won within 20 moves each, against 8–16% with the strict castle), and the typical game keeps its length. Only the longest games get shorter.
- **It's a late-game rule.** Returns happen in 13–38% of games, the first one at a median of move 57, when the board has thinned out. The piece brought back is usually Water 3, Wind 3 or Fire 3.
- **Mostly it finishes games, sometimes it turns them.** The side that brings back the first piece wins 80–88% of those games (once per visit). It was ahead on material at the time in about half of them, and behind in 27–31%, and the side behind still won 53–73% of those. So it converts stuck endings and also gives a real comeback.
- **Once per visit is enough.** Every turn doubles the number of returns but cuts no more draws: the extra pieces just go to a side that's already winning.
- **Home zone or own castle makes no measurable difference.**
- **Adopted** (2026-10-29): rules v0.4 make it the default, once per visit, onto the own castle (GAME_SPEC §6 Castles). Experiments of v0.4 pass `V04` (engine.mjs).
- White's share of decided games moves between 46% and 59% across rows, within luck for about 350 decided games per row, with no pattern by rule.
- Limit: how often the bots use the rule depends on the walking nudge they were given. People may use it earlier or later, so watch this at the table.

## 21. Rules v0.4 checked: the key tests with the castle return

Before the castle return (§20) goes into the public prototype: the key tests of §15–§16 again under rules v0.4, set against the v0.3 results. The bots walk their Wizard toward the enemy castle as in §20 (`WEIGHTS.castleWalk`), like the prototype's Medium and Hard. About 10,500 games (`node run.mjs v04recheck`, `v04styles`, `presetsV04`, `castleWalkSweep`, `v04earthComeback`, `v04strong`, `v04levels`, and `node arc.mjs v04`).

### The game as a whole

| Deep 2k from Wind 3 held back unless noted | v0.3 | v0.4 |
|---|---|---|
| **Draws**, Wind 3 held back (400 games) | 22% | **11%** |
| **Draws**, shared random formations (400) | 32% | **13%** |
| **Draws**, Deep 20k (200) | 20% | **7%** |
| **Draws**, the seven presets' round robin (1,260) | 25% | **10%** |
| of which by the 75-move rule (Wind 3 held back / random / 20k) | 16 / 23 / 14% | **3 / 5 / 0%** |
| White's share of decided games (Wind 3 held back / random / 20k) | 53 / 53 / 51% | 52 / 48 / 47% |
| Typical game, moves each (Wind 3 held back / random / 20k) | 50 / 59 / 49 | 47 / 56 / 41 |
| Endings, Wind 3 held back: checkmate / elimination | 46 / 32% | 52 / 38% |
| Typical drawn game, moves each (§16's games) | 110 | **56** |

- **The draws halve everywhere**, and the long 75-move draws nearly disappear. What's left are mostly repetitions.
- **The game stays fair.** White's share of decided games is 47–52%, within luck of 50%, as before.
- **Games get a little shorter, and drawn ones much shorter**: a drawn game used to run 110 moves each, now 56.
- **Pieces come back in 29% of games** (233 of 800), the first at a median of move 54, about 2 per game once it starts. The side that brings back the first piece wins 80% of those games (§20 found 80–88%).

### Leads and comebacks (§16 again, Deep 2k)

| The first time a side is ahead by… | v0.3: wins / draws / losses | v0.4 |
|---|---|---|
| 1 element | 55 / 24 / 22% | 61 / 9 / 30% |
| 2 elements | 71 / 18 / 12% | 78 / 6 / 16% |
| 3 elements | 86 / 9 / 5% | 91 / 3 / 6% |

- **Fewer draws make both sides of a lead count more**: the side ahead wins more often, and the side behind also wins more often, instead of drawing. The winner had been behind by an element at some point in 36% of decided games (v0.3: 31%).

### Pieces: what each one costs (the handicap test)

Score of the side that starts without the piece, against the full formation (100 games each, Deep 2k; Deep 20k in the last column, from §15's three pieces).

| Without | v0.3 | v0.4 | | Without (Deep 20k) | v0.3 | v0.4 |
|---|---|---|---|---|---|---|
| **Wind 3** | 8% | 15% | | **Wind 3** | 10% | 6% |
| **Water 3** | 17% | 20% | | **Water 3** | 17% | 9% |
| **Fire 3** | 24% | 24% | | **Fire 3** | 18% | 14% |
| Water 1 | 28% | 19% | | | | |
| Wind 1 | 27% | 28% | | | | |
| Water 2 | 30% | 28% | | | | |
| Wind 2 | 25% | 32% | | | | |
| Fire 2 | 34% | 34% | | | | |
| Fire 1 | 41% | 42% | | | | |
| any Earth | 45–47% | 48–59% | | | | |

- **The same pieces matter most**: Wind 3, Water 3 and Fire 3, then the middle sizes, then Fire 1, and losing an Earth costs nothing. Each number has a range of about ±9 points, so the differences between v0.3 and v0.4 are mostly luck; the handicaps from random formations tell the same story.
- **The return doesn't rescue a side that starts a big piece down.** With the strong bot, it does even a little worse (6–14% instead of 10–18%), because there are fewer draws to save it. A returned piece helps in a close ending, not against a whole missing piece from move 1.

### Styles, presets and Earth's comeback

| Score against Careful (100 games each) | v0.3 | v0.4 |
|---|---|---|
| Combiner | 65% | 71% |
| Hunter | 43% | 43% |
| Turtle | 31% | 37% (half the games drawn) |
| Rusher | 28% | 30% |
| Never-combiner | 13% | 17% |

- **No style takes over.** The order is the same, and combining is still the strongest habit. Turtling still draws half its games: staying in your own half keeps your Wizard away from the enemy castle.
- **Presets** (round robin, 60 games per pair, Wind 3 held back = 1000): Wizard forward 1015, Wind 3 held back 1000, Fire in front of the Wizard 988, Fire 1 in front 955, Original 929, Mirrored 925, Low Winds 917. Under v0.3 Wizard forward was 939; a Wizard that starts further forward is closer to the enemy castle. Each rating has a range of about ±45, so Wizard forward and the default are level, and the spread between presets stays about 100 points. The default can stay.
- **Earth's comeback still works.** A piece down, the side that may combine Earth scores 30% against 26% without (Fire 2 missing) and 19% against 12% (Water 3 missing); from an even start it makes no difference (46%). In §16's games, a side that combined Earth after falling behind scored 39%, one that didn't 27%.

### Does the bot use the rule well? (the castle walk)

Walking a Wizard to the enemy castle takes more moves than the bot looks ahead, so its score pulls the Wizard there late in the game. The prototype uses a pull of 0.5. Here side A plays with a different pull against 0.5 (Deep 2k, Wind 3 held back, 400 games each; Deep 20k 200 games).

| A's pull toward the castle | 0 (never walks) | 0.25 | **0.5** (the prototype) | 1 | 2 |
|---|---|---|---|---|---|
| A's score against 0.5 | **42%** (38–47) | 45% (40–50) | 50% | **54%** (49–58) | 47% (42–52) |
| Games where A / its opponent brought a piece back | 7 / 97 | 19 / 84 | | 118 / 30 | 114 / 12 |
| Deep 20k: A's score against 0.5 | **39%** (33–46) | | | | |

- **Walking to the castle is a real plan.** A bot that never walks scores 39–42%, about 55–75 rating points weaker, and it almost never gets to bring a piece back.
- **A stronger pull of 1 may be a little better** (54%, just inside luck); 2 overdoes it: the Wizard sets off too early and the score drops again. So the prototype's 0.5 is reasonable, and the best is probably near 1.

### Relearning the bot for v0.4

The bot's piece values were learned from v0.2 games (§10), before the new Water rule and the castle return. Relearned the same way from 4,000 games of Deep 2k against itself under v0.4 (`node run.mjs selfplayV04`, then `node tune.mjs selfplayV04`), now with the castle walk as one of the learned weights:

| Value in the bot's score | Learned from v0.2 games | From v0.4 games |
|---|---|---|
| Water 3 / Wind 3 / Fire 3 | 11.8 / 6.2 / 5.1 | **9.5 / 8.5 / 5.9** |
| Water 2 / Wind 2 / Fire 2 | 6.4 / 1.8 / 2.8 | 4.0 / 2.7 / 2.6 |
| Water 1 / Wind 1 / Fire 1 | 3.2 / 0.9 / 1.7 | 3.4 / 1.2 / 2.2 |
| Castle walk | (set by hand: 0.5) | 0.42 |

- **Wind 3 rose almost to Water 3**, and Water 3 lost a fifth of its value: the v0.3 Water rule (§15) shows in the numbers. The size-3 pieces still matter most.
- **The learned castle walk, 0.42, is close to the hand-set 0.5.** But it only measures how much being near the castle went with winning in games where both sides walked at 0.5, so it was tried in play as well (`node run.mjs v04learned`):

| Relearned bot against the v0.4 bot before it | Castle walk 0.42 | **Castle walk 1** |
|---|---|---|
| Deep 2k, Wind 3 held back (400 games) | 53% (48–57) | **55%** (50–60) |
| Deep 2k, random formations (400) | 48% (43–53) | **58%** (53–62) |
| Deep 20k, Wind 3 held back (200) | 63% (56–69) | **67%** (60–73) |

- **The relearned values with a castle walk of 1 are better everywhere**: about 35–55 rating points at Deep 2k and about 120 at Deep 20k. The stronger bot gains more, because it sees further ahead into what the values mean. This is `WEIGHTS.v04`, which the public prototype's Medium and Hard now use.

### The prototype's levels

Easy lost every one of its 400 games against Medium and Hard, under v0.3 and under v0.4. Medium scored 13% (9–18) against Hard under v0.3 and 9% (6–14) under v0.4: Hard gains a little from the rule, perhaps because it sees further ahead to a return.

**Verdict:** rules v0.4 keep everything that was healthy about v0.3 and halve the draws. It's ready to play in the public prototype.

## 22. Rules v0.5: chess's automatic draws

The designer chose draw rules closer to chess (GAME_SPEC §6 Draws): **50 moves each** without a capture, combine or return (instead of 75), and a draw at the **fifth** repetition (instead of the third), both automatic, with no claims. Tested against v0.4 and with each change alone (`node run.mjs v05draws`, the relearned bot `WEIGHTS.v04` on both sides, 400 games per row at Deep 2k and 200 at Deep 20k).

| Draws | v0.4 (75 moves, 3rd time) | 50 moves only | 5th repetition only | **v0.5** (both) |
|---|---|---|---|---|
| Deep 2k, Wind 3 held back | 9% | 10% | **3%** | 7% |
| Deep 2k, shared random formations | 12% | 11% | **4%** | 9% |
| Deep 20k, Wind 3 held back | 5% | 4% | 7% | 10% |
| Typical game, moves each (2k / random / 20k) | 47 / 52 / 42 | 45 / 52 / 46 | 48 / 55 / 48 | 47 / 53 / 48 |
| Longest 10% of games, past (2k / random / 20k) | 85 / 104 / 70 | 82 / 93 / 80 | 90 / 115 / 82 | 86 / 97 / 86 |

- **The two changes pull in opposite directions and roughly cancel.** The fifth repetition alone cuts the Deep 2k draws to a third (most draws are now repetitions); 50 moves turns some of those longer games back into draws. Together, draws stay about where they were: 7–10% against 5–12%.
- **Games keep their length.** The typical game stays at 45–55 moves each, and the 50-move limit trims the longest ones.
- The Deep 20k rows have only 200 games each, so 5% against 10% (10 against 20 games) is at the edge of luck. White's 62% of decided games in the v0.5 20k row is also likely luck: every other row is 48–55%.
- Limit: the bots treat any repeated position as a draw when they look ahead, whatever the rule, so a side that's losing still steers toward repeating. People may play on longer under the fifth-repetition rule.

## 23. Nobody can win anymore: are there dead positions?

Chess draws at once when no sequence of legal moves at all could end in checkmate, even with both players helping ("dead position": king against king, king and bishop against king). The designer wants to look into an Elements version (GAME_SPEC open question 16). `node dead.mjs` looks for such a sequence, a "helpmate": both sides move together toward a win for either side, by elimination or checkmate. A position where none exists would be dead.

| Positions checked | Positions | Dead | Typical helpmate, moves |
|---|---|---|---|
| The 304 drawn v0.5 test games (§22), every 10th position and the last | 4,237 | **0** | 2–3 |
| Small endings on random squares: each side a Wizard, 1–2 attackers or a stack, 0–3 Earths | 25,534 | **0** | 1–2 |
| The same endings without the castle return | 25,538 | **0** | 1–2 |

- **Elements has no dead positions**, and the reason is in the rules, not in luck. A side without attackers has already lost, so in a running game both sides still have one. Every attacker can be captured (only plain Earth can't), and the Wizard captures too and can reach every square. So with the other side helping, one Wizard can always walk up and take the other side's attackers one by one. A lone Wind's square colour doesn't matter: the Wizard isn't bound to a colour.
- The one position where nothing can happen, a side with no legal move, is already a draw as stalemate.
- Chess has dead positions because a king can't be captured and a lone bishop or knight can't checkmate. In Elements the matching ending, Wizard against Wizard, is already a win: the side with attackers left has taken the others'.
- So a dead-position rule would never apply. What remains is endings that one side can't **force** a win in, against good defence (a "fortress"). Chess doesn't call those dead either; its 50-move rule ends them, and so does Elements' since v0.5.
- Limit: the search proves a win is possible when it finds one, and it found one every time. A few sequences were long (up to a few thousand half-moves, in spread-out positions where the short search gave up and a deep one took over), but over 99.8% fit inside the 50-move limit.

---

## What this means for the game

1. **The core is healthy.** It's fair, decisive, has real depth, has no unbeatable defence, and games end at a good length. All of this holds with the strong bot. The first-move edge is a little larger than in chess at the same level, and draws are more common (§12).
2. **Water leads, but every attacking piece matters** with strong play (§11). Formations can't change Water's lead (§8). Straight captures even the elements out (§9, §11), at the cost of longer games and a few more draws. Whether that's worth it is now a matter of taste.
3. **Both ways to win matter.** Checkmate decides about half the games between strong bots, and elimination a quarter to a third.
4. **Exact range makes the game slower and more drawish.** Keep it off by default, as it is now. (Not yet rechecked with the strong bot.)
5. **Formations matter a little and are hard to build well** (§14). Your default came last with strong play, and the new default and presets are clearly better. No formation wins by itself, and their mirror images are just as good. A strong formation is a finely tuned whole, so presets are worth offering, and the placement phase rewards experience.

6. **Leads matter, but one capture doesn't decide the game** (§16). Two elements up nearly always wins with strong play, and comebacks of one element are common. Earth's comeback works, but it gets used from the opening. Drawn games run very long, about 110 moves each.
7. **The setup's depth is in building well, not in reacting** (§17). Formations barely counter each other, so seeing the opponent's placements is worth a few points at most. Presets first (PRODUCT_BRIEF D15) fits this, and full games could build in secret at the same time without losing much.
8. **Draws come from too little attacking material at the end, not from Earth walls** (§18). Letting Earth stacks take Earth doesn't cut them. A rule against draws has to act on material (open question 13).
9. **Keeping the Wizard in a 3×3 castle halves the draws** (§19), with nothing to count. The game stays fair and gets shorter. It also punishes a careless defence harder, which beginners would feel most.
10. **The castle return does the same without that cost** (§20). A Wizard that walks into the enemy castle brings back a captured piece, once per visit. Draws fall just as far, games keep their length and quick losses don't rise. It works as a late-game plan for the side that's ahead and as a comeback for the side behind. It's the rule from v0.4.
11. **Rules v0.4 keep everything else** (§21). Fairness, the pieces' order, the styles, the presets and Earth's comeback all come out as under v0.3, with half the draws. Walking the Wizard to the enemy castle is a plan worth learning: a player who never does it gives away about 8–11 points.
12. **Chess's automatic draws change little** (§22). 50 moves each and the fifth repetition push the number of draws in opposite directions, and together leave it about where it was.
13. **Elements needs no dead-position rule** (§23). Because every attacker can be captured and the Wizard captures too, a win is always still possible while both sides have attackers. Hopeless endings are left to the 50-move rule, as in chess. The designer dropped the rule (GAME_SPEC §6 Draws).

The questions these raise are recorded in [GAME_SPEC.md](../GAME_SPEC.md) (open questions 2, 6–16) and [PRODUCT_BRIEF.md](../PRODUCT_BRIEF.md) (Open).

## Limits

- **Bot strength.** §11 shows how much this matters: "Fire is useless" was an artifact of weak bots. Deep is much stronger, but still looks only a few moves ahead and doesn't plan. A strong human might break things it can't, or avoid traps it falls into.
- **No placement phase.** Games start from finished formations. §17 measures what seeing the opponent's formation is worth, but no bot places pieces one at a time, and we know nothing about how people build their setups.
- **Sample sizes.** Most Thinker results are based on 50–100 games each, so differences under about 10 points there could be luck. §9 shows how easily that happens: 60 games said 37%, and 200 said 52%.
- **Bots repeat themselves.** A bot that always picks its best move can replay the same game. Careful games varied enough. For Thinker, §9 adds random first moves.
- **Piece values.** Careful and Thinker use guessed values. Deep's are learned from games (§10), which made it much stronger.

## Next steps worth doing

- Try the castle return (rules v0.4) at the table in the public prototype (§21 checked it).
- Rerun the v0.4 tests with the relearned bot (`WEIGHTS.v04`, §21): its numbers are about 120 points stronger at Deep 20k, which may move the handicap numbers a little.
- Recheck the exact-range variant and the cheat hunt (§6, §7) with the strong bot.
- Try straight captures at the table, and if it stays, rerun the formation search under it: the best formations may change once Water strikes straight.
- A catalogue of strong formations in different styles (a quality-diversity search, `catalogue.mjs`), so the presets can cover more ways to play.
- Recheck the lead from §17 (Wind 3 held back with the Fires swapped and Earth 1 on i2) with fresh games against the presets.

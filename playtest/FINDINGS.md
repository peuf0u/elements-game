# Playtest findings: the computer plays Elements

Easier-to-read version with drawn boards: [FINDINGS.html](FINDINGS.html) (open in a browser), also online at https://claude.ai/artifact/V6KKL4vWUm7FLFiqehXhEJ (private until shared from the page's Share menu).

*Run on 2026-10-28 (GAME_SPEC v0.2), about 120,000 games in total, 10,000 of them chess. §1–§9 were played on the spike's rules and replay move for move on the real engine (`packages/engine`); §10–§15 were played on the real engine. §1–§14 use the v0.2 Water rule; §15 checks rules v0.3, with the new Water. How the players work and where the methods come from: [README.md](README.md) and [docs/research/automated-playtesting.md](../docs/research/automated-playtesting.md). Every number below comes from `results/<experiment>.summary.json` or `node analyze.mjs <experiment>`.*

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

---

## What this means for the game

1. **The core is healthy.** It's fair, decisive, has real depth, has no unbeatable defence, and games end at a good length. All of this holds with the strong bot. The first-move edge is a little larger than in chess at the same level, and draws are more common (§12).
2. **Water leads, but every attacking piece matters** with strong play (§11). Formations can't change Water's lead (§8). Straight captures even the elements out (§9, §11), at the cost of longer games and a few more draws. Whether that's worth it is now a matter of taste.
3. **Both ways to win matter.** Checkmate decides about half the games between strong bots, and elimination a quarter to a third.
4. **Exact range makes the game slower and more drawish.** Keep it off by default, as it is now. (Not yet rechecked with the strong bot.)
5. **Formations matter a little and are hard to build well** (§14). Your default came last with strong play, and the new default and presets are clearly better. No formation wins by itself, and their mirror images are just as good. A strong formation is a finely tuned whole, so presets are worth offering, and the placement phase rewards experience.

The questions these raise are recorded in [GAME_SPEC.md](../GAME_SPEC.md) (open questions 6–9) and [PRODUCT_BRIEF.md](../PRODUCT_BRIEF.md) (Open).

## Limits

- **Bot strength.** §11 shows how much this matters: "Fire is useless" was an artifact of weak bots. Deep is much stronger, but still looks only a few moves ahead and doesn't plan. A strong human might break things it can't, or avoid traps it falls into.
- **No placement phase.** Games start from finished formations. We know nothing yet about how players choose their setups or react to each other's placements.
- **Sample sizes.** Most Thinker results are based on 50–100 games each, so differences under about 10 points there could be luck. §9 shows how easily that happens: 60 games said 37%, and 200 said 52%.
- **Bots repeat themselves.** A bot that always picks its best move can replay the same game. Careful games varied enough. For Thinker, §9 adds random first moves.
- **Piece values.** Careful and Thinker use guessed values. Deep's are learned from games (§10), which made it much stronger.

## Next steps worth doing

- If draws still bother at the table, look at the endgame: Earth walls that a few attackers can't break (§13).
- Recheck the exact-range variant and the cheat hunt (§6, §7) with the strong bot.
- Try straight captures at the table, and if it stays, rerun the formation search under it: the best formations may change once Water strikes straight.
- A catalogue of strong formations in different styles (a quality-diversity search, `catalogue.mjs`), so the presets can cover more ways to play.
- A formation-builder player for the alternating placement phase.

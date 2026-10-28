# Elements: the methods behind computer playtesting

*Research date: 2026-10-28. Scope: where the ideas in [`playtest/`](../../playtest/README.md) come from, and which parts are our own judgment. It answers the designer's question: "Are these well-known methods, or did you just come up with them? Is there a framework or theory?" Every sourced claim has an inline link. Every link was opened or confirmed on the research date. Passages marked "assessment" are my own judgment, not a sourced claim.*

Easier-to-read web version: [automated-playtesting.html](automated-playtesting.html) (open it in a browser), also online at https://claude.ai/artifact/3L5kTG3e5jcMsxM3mjurMn (private until shared from the page's Share menu).

Inputs: [GAME_SPEC.md](../../GAME_SPEC.md), [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md) (D12), `playtest/players.mjs`, `playtest/experiments.mjs` and `playtest/stats.mjs`.

---

## TL;DR

1. **Yes, these are established methods.** The players are textbook game-playing programs. The way they look ahead (minimax with alpha-beta pruning), the way they score a position (an evaluation function), and the "try captures first" trick all go back to [Shannon (1950)](https://doi.org/10.1080/14786445008521796) and [Knuth & Moore (1975)](https://doi.org/10.1016/0004-3702(75)90019-3), and are standard in chess programs today ([Chess Programming Wiki](https://www.chessprogramming.org/Alpha-Beta)).
2. **The experiments follow a small research field** that uses simulated players to balance games before (or alongside) human playtesting. Style players are "restricted play" ([Jaffe et al. 2012](https://doi.org/10.1609/aiide.v8i1.12513)). The skill ladder is a "strategy ladder" ([Lantz et al. 2017](https://cdn.aaai.org/ocs/ws/ws0340/15142-68464-1-PB.pdf)) and Browne's "depth" test ([thesis, 2008](https://eprints.qut.edu.au/17025/)). The exact-range re-run mirrors how DeepMind tested chess rule changes with AlphaZero ([Tomašev et al. 2020](https://arxiv.org/abs/2009.04374)). Counting endings, draws, length and White's advantage is what Browne's game-design system and its successor Ludii measure ([Ludii portal](https://ludii.games/conceptsAB.php?gameId=200)).
3. **The theory underneath** is [Zermelo (1913)](https://www.math.harvard.edu/~elkies/FS23j.03/zermelo.pdf). In a finite game with no hidden information and no dice, like Elements, the result under perfect play is fixed in principle. Elements is far too big to work that answer out, so we estimate balance from many games between imperfect players.
4. **The judgment calls are ours:** the piece-value tables, the style players' habits, the fortress formations, the warning thresholds, and how strong the bots are. Results only hold for bots of the strength we used. Weak bots can hide an imbalance or invent one.

---

## 1. The theory: Elements has an answer, we just can't compute it

**Zermelo's theorem.** In 1912 Ernst Zermelo asked whether a chess player can be "in a winning position" in an exact mathematical sense. His paper ("Über eine Anwendung der Mengenlehre auf die Theorie des Schachspiels", *Proceedings of the Fifth International Congress of Mathematicians*, Cambridge, vol. 2, 1913, pp. 501–504) is usually read as: *in chess, either White can force a win, or Black can force a win, or both sides can force a draw*. A historical study with an English translation notes that this modern statement "bears only a partial relationship to what Zermelo really did", and that later work by König and Kalmár finished the job ([Schwalbe & Walker 2001](https://doi.org/10.1006/game.2000.0794), [author PDF](https://www.math.harvard.edu/~elkies/FS23j.03/zermelo.pdf)). The modern statement is the one that matters for us.

*In board-game terms:* Elements has no dice and no hidden cards, and its draw rules (threefold repetition, the 50-move rule in GAME_SPEC §6) make every game finite. So the default formation is already, in principle, a White win, a Black win, or a draw with perfect play. "Is Elements balanced?" has a true answer. We can't reach it directly.

**Why we can't compute it.** Shannon worked through the same thought for chess: you could list every move, every reply and so on to the end, then work backwards from the results. He estimated about 10^120 possible games, so a machine checking one per microsecond "would require over 10^90 years to calculate the first move" ([Shannon 1950, full text](https://www.pi.infn.it/~carosi/chess/shannon.txt)).

**A solved game as a comparison.** Checkers has about 5 × 10^20 positions. Computers worked on it "almost continuously" from 1989 until 2007, when Schaeffer's team proved that perfect play by both sides is a draw ([Schaeffer et al. 2007, *Science*](https://doi.org/10.1126/science.1144079), [PDF](https://www.cse.sc.edu/~mgv/csce580sp17/gradPres/schaeffer_CheckersIsSolved_Science2007.pdf)). Checkers uses 32 squares and has two kinds of piece. Elements has 81 squares, four elements in three sizes, combining and a Wizard, so it is almost certainly far bigger than checkers (assessment, not computed). Solving it is out of reach. Measuring it statistically is the practical route.

---

## 2. The players

### 2.1 Looking ahead: minimax and negamax

*In board-game terms:* "If I play this, what is your best answer, and what is my best answer to that?" You assume the opponent always picks the reply that is worst for you, and you choose the move whose worst case is best. Careful does this 2 turns deep (my move, your reply). Thinker does it 3 turns deep. One "move" here means one player's turn.

- Shannon describes this backwards reasoning as the way to play perfectly "in principle", then proposes cutting it off after a few moves and scoring the position there ([Shannon 1950](https://doi.org/10.1080/14786445008521796), [full text](https://www.pi.infn.it/~carosi/chess/shannon.txt)). The Chess Programming Wiki calls this fixed-depth, look-at-everything approach Shannon's "Type A" strategy ([Type A Strategy](https://chessprogramming.org/Type_A_Strategy)).
- The name and the mathematics come from game theory. Von Neumann proved the minimax theorem for two-player zero-sum games in "Zur Theorie der Gesellschaftsspiele" ([*Mathematische Annalen* 100, 1928, pp. 295–320](https://doi.org/10.1007/BF01448847)). His theorem covers games with simultaneous or hidden choices. For a game like Elements, where you can see everything, the simpler backwards reasoning above (Zermelo's) is all that's needed.
- **Negamax** is just a shorter way to write minimax: "your score is minus my score", so one routine serves both players ([Chess Programming Wiki: Negamax](https://www.chessprogramming.org/Negamax)).
- **Where in playtest/:** `search()` and `searcher()` in [`players.mjs`](../../playtest/players.mjs). `careful` uses depth 2 and `thinker` uses depth 3.

### 2.2 Skipping hopeless lines: alpha-beta pruning

*In board-game terms:* once you've found that one of the opponent's replies already refutes your move, you stop checking their other replies to it. You can't do better by looking further, so the answer is the same as a full search, only faster.

- Alpha-beta finds the same move as full minimax "without any potential of overlooking a better move". Several researchers came up with it independently from the 1950s on ([Chess Programming Wiki: Alpha-Beta](https://www.chessprogramming.org/Alpha-Beta)). The standard analysis, with a correctness proof and running-time bounds, is [Knuth & Moore, "An analysis of alpha-beta pruning", *Artificial Intelligence* 6(4), 1975, pp. 293–326](https://doi.org/10.1016/0004-3702(75)90019-3).
- How much it saves depends on looking at the best moves first. With perfect ordering, a 4-turn search over 40 moves per turn looks at about 3,199 end positions instead of 2,560,000 ([Chess Programming Wiki: Alpha-Beta](https://www.chessprogramming.org/Alpha-Beta)).
- **Where in playtest/:** the `alpha`/`beta` window in `search()`. At the top level, `choose()` searches each move against a window just below the best score so far. That way near-best moves get real scores, and the bot can pick among them (§2.5).

### 2.3 Scoring a position: the evaluation function

*In board-game terms:* when the bot stops looking ahead, it needs a rule of thumb for "who's ahead here?". Ours adds up piece values (element × size), adds a little for mobility (how many moves your pieces have) and for capturing pieces near the enemy Wizard, and adds a bonus when the opponent is down to their last few capturing pieces.

- This is exactly Shannon's proposal. His example for chess counts material with the 9-5-3-3-1 piece values, takes off a bit for weak pawns, and adds 0.1 per legal move for mobility ([Shannon 1950, full text](https://www.pi.infn.it/~carosi/chess/shannon.txt)). Modern engines still start from material and mobility, plus king safety and more ([Chess Programming Wiki: Evaluation](https://www.chessprogramming.org/Evaluation)).
- Shannon was clear that such values "are only generalizations from empirical evidence" and "only have a kind of statistical validity" ([full text](https://www.pi.infn.it/~carosi/chess/shannon.txt)). That is why we keep two tables (`standard` and `flat`) and run the ladder with both.
- **Where in playtest/:** `VALUES`, `pieceValue()` and `evaluate()` in [`players.mjs`](../../playtest/players.mjs).

### 2.4 Trying captures first: move ordering (MVV-LVA)

*In board-game terms:* look at "take their biggest piece" moves before quiet moves, because they're the likeliest to be best. This makes alpha-beta skip more.

- "For the alpha-beta algorithm to perform well, the best moves need to be searched first" ([Chess Programming Wiki: Move Ordering](https://www.chessprogramming.org/Move_Ordering)). The classic rule for captures is **MVV-LVA**, "Most Valuable Victim – Least Valuable Aggressor": take the biggest piece first, preferably with your smallest one ([Chess Programming Wiki: MVV-LVA](https://www.chessprogramming.org/MVV-LVA)).
- **Where in playtest/:** `orderMoves()` sorts captures by the value of the piece taken, then combines, then everything else. That is the "most valuable victim" half of MVV-LVA. It doesn't use the "least valuable attacker" tie-break, which is a small simplification (assessment).

### 2.5 Baselines and variety: Random, Greedy, and near-best moves

- **Random and Greedy** are the standard reference points in the balance literature. Jaffe et al. list "Random" (no look-ahead) and "Greedy" (looks one move ahead and "optimizes for some score function of the subsequent state, like health or piece count") as two of their restricted players ([Jaffe et al. 2012, PDF](https://ojs.aaai.org/index.php/AIIDE/article/view/12513/12366)). Our Greedy is that player, with piece value as the score.
- Random games are cheap and useful for catching broken rules, such as games that never end. Browne warns that random playouts "are not realistic" and "don't give much insight into actual quality" ([Browne, *Measuring Games*, DLP workshop slides, 2022](https://ludii.games/TalksWorkshop/Metrics.pdf)). That is why the `ends` experiment uses Random and Greedy, and the balance experiments use Careful and Thinker.
- **Variety.** A look-ahead bot plays the same game every time unless something varies. DeepMind had the same problem with AlphaZero and solved it by sampling the first 20 turns of each game at random, weighted by how good the moves looked ([Tomašev et al. 2020, Fig. 2](https://arxiv.org/abs/2009.04374)). Our bots instead pick at random among all moves within `margin` (0.1 points) of the best, on every turn. Same idea, our own tuning.

---

## 3. The measuring: automated playtesting as a field

Using simulated players to balance a game is a recognised research topic, usually called *automated playtesting* or *simulation-based game balancing* (assessment: the field uses several names). Two short papers set out the idea:

- [Nelson, "Game Metrics Without Players: Strategies for Understanding Game Artifacts" (AIIDE 2011 workshop)](https://doi.org/10.1609/aiide.v7i3.12479) lists seven ways to learn about a game without human testers. Strategy 6, "hypothetical player-testing", tests the game with simple, extreme player models: "what happens when the game is played by a player who always attacks… If that player does very well, the game might be a bit too simple" ([PDF](https://ojs.aaai.org/index.php/AIIDE/article/view/12479/12338)).
- [Jaffe et al. 2012](https://doi.org/10.1609/aiide.v8i1.12513) say win rates between bots can act as "an 'early warning system', that illuminates certain flagrant imbalances upfront, saving playtesting time" for human tests ([PDF](https://ojs.aaai.org/index.php/AIIDE/article/view/12513/12366)). That is also the role D12 gives `playtest/`.

| Our experiment (`experiments.mjs`) | Established method | Source |
|---|---|---|
| `styles`: Turtle, Rusher, Combiner, Never-combiner, Hunter vs Careful | Restricted play; hypothetical players | Jaffe 2012; Nelson 2011 |
| `ladder`: each player vs the next one up | Strategy ladder; Browne's "depth (skill level)" | Lantz 2017; Browne 2008 |
| `colours`: equal players, White vs Black | First-player advantage ("Player 1", "Advantage") | Jaffe 2012; Browne 2008; Ludii |
| `exact`: re-run with the exact-range variant | Comparing rule variants by self-play | Tomašev 2020 |
| `ends`, `formations`: endings, draws, length | Whole-game measures: completion, drawishness, duration | Browne 2008; Ludii |
| `handicap`: default formation minus one piece | Piece values from results; odds games | Kaufman 1999; Tomašev 2020 |
| Win-rate ranges in `stats.mjs` | Wilson score interval | Wilson 1927 |

### 3.1 Style players = restricted play

Jaffe et al. measure a game feature by playing a bot that is *restricted* (for example "never plays action a") against a normal bot. If the restricted bot barely loses, that feature doesn't matter much. Their tool includes "Omit a" (never do it), "Prefer a" (always do it), "Random", "Greedy" and "Player 1" (always take the first seat) ([Jaffe et al. 2012, PDF](https://ojs.aaai.org/index.php/AIIDE/article/view/12513/12366)).

*In board-game terms:* **Never-combiner** is "Omit combining" and **Combiner** is close to "Prefer combining". If Never-combiner does as well as Careful, combining isn't pulling its weight. If **Turtle** (never crosses the middle) beats Careful, defence is too strong. **Where:** `turtle`, `rusher`, `combiner`, `neverCombiner`, `hunter` in `players.mjs`.

One difference: in Jaffe's setup the normal bot knows about the restriction and exploits it. Our Careful doesn't know it's playing a Turtle. So our test is gentler. A style that wins against Careful might still lose to a bot that adapts (assessment).

### 3.2 The skill ladder = strategy ladder and "depth"

- Lantz et al. define a game's depth through a **strategy ladder**: a sequence of playing programs, each using more thinking and each beating the one below. "The more discrete ranks in such a population, the greater the degree of" depth. They connect this to the older *skill chain* idea, the chain of human players of rising skill (Bill Robertie's "complexity number"). ([Lantz, Isaksen, Jaffe, Nealen, Togelius, "Depth in Strategic Games", AAAI-17 Workshop *What's Next for AI in Games?*, WS-17-15](https://cdn.aaai.org/ocs/ws/ws0340/15142-68464-1-PB.pdf), [author copy](http://julian.togelius.com/Lantz2017Depth.pdf).)
- Browne's thesis measures "Depth (Skill Level)" by "reducing the search depth of one of the players by one ply". If the deeper searcher doesn't win clearly, "the game is most certainly devoid of depth" ([Browne 2008, pp. 121–122](https://eprints.qut.edu.au/17025/1/Cameron_Browne_Thesis.pdf)). Our Thinker vs Careful match is exactly this test: 3 turns of look-ahead against 2. In 2022 Browne showed the same idea with Monte Carlo bots, each with twice the thinking of the last ([slides](https://ludii.games/TalksWorkshop/Metrics.pdf)).
- *In board-game terms:* if each step up the ladder wins clearly, thinking harder pays off in Elements, which is what players mean by "the game has depth". If a step barely wins, the extra thinking isn't worth much at that level. **Where:** `ladder` in `experiments.mjs`.

### 3.3 Rule variants = the AlphaZero chess study

DeepMind and former world champion Vladimir Kramnik used AlphaZero to compare nine chess variants with one rule changed each (no castling, pawns move one square only, stalemate counts as a win, and so on). For each variant they measured draw rates, White's expected score and piece values from self-play games ([Tomašev, Paquet, Hassabis, Kramnik 2020, arXiv:2009.04374](https://arxiv.org/abs/2009.04374); [DeepMind publication page](https://www.deepmind.com/publications/assessing-game-balance-with-alphazero-exploring-alternative-rule-sets-in-chess)). Our `exact` experiment does the same for Elements' "exact range" toggle (GAME_SPEC §3): same players, same measurements, one rule changed. The paper describes AlphaZero as "an alternative in silico means of game balance assessment". Our bots are far weaker, but the experiment design is the same.

### 3.4 Whole-game measures = Browne's Ludi and Ludii

- Browne's PhD thesis built **Ludi**, a system that describes board games, plays them against itself, measures them, and evolves new rule sets. Its automated measures correlated with human rankings of games ([Browne 2008, QUT](https://eprints.qut.edu.au/17025/); [Browne & Maire, "Evolutionary Game Design", *IEEE TCIAIG* 2(1), 2010, pp. 1–16](https://doi.org/10.1109/TCIAIG.2010.2041928)). One of its games, **Yavalath**, was published by nestorgames. Browne calls it "the first — and still only — computer-generated game to be commercially published" (with its sister game Pentalath) ([Browne's Yavalath page](https://www.cambolbro.com/games/yavalath/)).
- Several of Ludi's measures are the ones we report ([thesis pp. 119–122](https://eprints.qut.edu.au/17025/1/Cameron_Browne_Thesis.pdf)):
  - **Completion** (games that reach a win or loss)
  - **Balance** and **Advantage** (does one colour, or the first player, win more than its share; both count decisive games only, like our `whiteOfDecisive`)
  - **Drawishness** (share of draws)
  - **Timeouts**
  - **Duration** (are games trivially short or endlessly long)
  - **Drama** ("the tendency for players to recover from seemingly bad positions"; compare the comebacks count in `analyze.mjs`)
- Browne's 2022 slides summarise the first filter as: a typical game is **fair**, **decisive** ("win/loss results more often than draws") and of **good length** ([slides](https://ludii.games/TalksWorkshop/Metrics.pdf)).
- **Ludii** is the successor, "a general game system designed to play, evaluate and design a wide range of games" ([ludii.games](https://ludii.games/)), built in the Digital Ludeme Project, a five-year research project at Maastricht University ([Browne, "AI for Ancient Games: Report on the Digital Ludeme Project", *KI* 34, 2020](https://doi.org/10.1007/s13218-019-00600-6)). Its reference paper is [Piette, Soemers, Stephenson, Sironi, Winands, Browne, "Ludii – The Ludemic General Game System", ECAI 2020](https://doi.org/10.3233/FAIA200120). Ludii's portal publishes these measures for each game, computed from bot playouts. For one game they include `Balance`, `AdvantageP1`, `Drawishness`, `Completion`, `Timeouts`, `DurationTurns` and `BranchingFactorAverage`, computed with alpha-beta playouts, with UCT and random playouts also offered ([Ludii portal, Galatjang](https://ludii.games/conceptsAB.php?gameId=200)). That is the same kind of table `stats.mjs` produces.

### 3.5 The handicap test = piece values from results, and odds games

- Larry Kaufman's "The Evaluation of Material Imbalances" (*Chess Life*, March 1999) worked out chess piece values from results. He took "nearly 300,000 games" between players rated 2300+ and compared performance with rating when material was unbalanced. That gave pawn 1, knight 3¼, bishop 3¼, rook 5, queen 9¾, and +½ for the bishop pair ([reprint with permission, Dan Heisman](https://www.danheisman.com/evaluation-of-material-imbalances.html); [chess.com copy](https://www.chess.com/article/view/the-evaluation-of-material-imbalances-by-im-larry-kaufman)). He then turns piece values into handicaps. A pawn is worth "about 200 points" of rating, so he estimates what rating would be a fair match for Kasparov at knight odds.
- The AlphaZero variants study also estimated piece values for each variant from self-play ([Tomašev et al. 2020, §3.8](https://arxiv.org/abs/2009.04374)).
- *In board-game terms:* our handicap test is an odds game. Careful plays the full formation against Careful missing one piece. The bigger the drop in score, the more that piece is worth in practice. This checks our guessed value tables against results, the way Kaufman checked the 1-3-3-5-9 rule of thumb. **Where:** `handicap` in `experiments.mjs`, `without()` in `formations.mjs`.

### 3.6 Uncertainty ranges = the Wilson interval

A win rate from 100 games is only an estimate. The range we print (for example "54%, range 44–63%" after 100 games) is a 95% **Wilson score interval**. That is the standard formula for "how far off could this percentage be, given how many games we played" ([Wilson, "Probable Inference, the Law of Succession, and Statistical Inference", *JASA* 22(158), 1927, pp. 209–212](https://doi.org/10.1080/01621459.1927.10502953)). Draws count as half a win, as in chess scoring. Jaffe et al. do the same, "treating a tie as a 50% chance of a win" ([PDF](https://ojs.aaai.org/index.php/AIIDE/article/view/12513/12366)). **Where:** `interval()` in [`stats.mjs`](../../playtest/stats.mjs).

*In board-game terms:* if the range includes 50%, the games can't tell the two sides apart yet. Play more games, or accept that any difference is small.

### 3.7 White's advantage: what chess gives as a yardstick

Chess has a first-move advantage, so a little imbalance between White and Black is normal. The usual figures:

- **Human games:** the ChessGames.com database (2,175,681 games, all time controls) shows White wins 37.61%, Black wins 28.43% and draws 33.96%. That makes White's score (draws as half) about **54.6%**, my calculation from their figures ([ChessGames.com statistics](https://www.chessgames.com/chessstats.html), read 2026-10-28). Wikipedia summarises the literature as White scoring "between 52 and 56 percent" ([First-move advantage in chess](https://en.wikipedia.org/wiki/First-move_advantage_in_chess), a summary, not a primary source).
- **Strong engines:** in AlphaZero's own games of classical chess, White scored 51.8% at 1 second per move and 50.8% at 1 minute per move. About 88% and 98% of those games were draws ([Tomašev et al. 2020, Fig. 2 and Table 2](https://arxiv.org/abs/2009.04374)).
- Kaufman puts a tempo (one free move) at "about 80 points" of rating in the opening ([reprint](https://www.danheisman.com/evaluation-of-material-imbalances.html)).

Our White-vs-Black thresholds use these as a reference (assessment). Between equal players, a White score of 50–56% looks healthy, because that's chess-like. Above about 60%, or Black scoring that much, counts as a problem, provided the uncertainty range is clear of 56% too. Chess is a reference, not a rule. Elements could be fine with a different number.

---

## 4. What is our own judgment

These parts are not taken from any source. They are reasonable guesses that the experiments partly test:

- **Piece values.** Both tables (`standard`: Fire 3, Water 3, Wind 2.5, Earth 1, sizes 1 / 1.6 / 2.1; `flat`) are guesses. The handicap test is how we check them.
- **The other evaluation weights:** mobility 0.02 per move, Wizard pressure (capturers within 3 squares of the enemy Wizard), the extra weight once a side is down to its last three capturing pieces, and the 0.3 check term.
- **Look-ahead depths** (2 and 3) and the 0.1 "near-best" margin. These were chosen so thousands of games run in minutes on a laptop.
- **The style players' habits.** Turtle's "never cross the middle, keep Earth beside the Wizard", Rusher's push forward, Hunter's "squeeze the Wizard's escape squares". The method (restricted play) is established. Which restrictions to test is a design guess about where cheats might hide.
- **The fortress and bunker formations.** These are hand-built "worst cases" for defence, not derived from anything.
- **Warning thresholds and game counts.** How far from 50% counts as a problem, and how many games each matchup gets, are our choices. The chess figures in §3.7 are a yardstick, not a standard.

---

## 5. Limitations

- **Results depend on bot strength.** The study above shows this even for chess. In AlphaZero's classical chess games, draws rose and White's score fell as the bots thought longer ([Tomašev et al. 2020](https://arxiv.org/abs/2009.04374)). A 2- or 3-turn look-ahead is far weaker than a good human. Weak bots can **hide** an imbalance: they may never find the winning attack a strong player would. They can also **invent** one: they may walk into a trap any human would see. Browne's own advice is that game measurement doesn't need perfect play, and "may not even want strong play" ([slides](https://ludii.games/TalksWorkshop/Metrics.pdf)). Still, every finding in FINDINGS.md should be read as "for players of about this strength".
- **The evaluation steers the bots.** A bot that thinks Earth is worth 1 will play as if it is. The two value tables only partly guard against that.
- **Bots don't learn or adapt.** A human who loses to a Turtle twice will change plans. Careful won't.
- **No placement phase.** Games start from finished formations (see `playtest/README.md`), so we learn nothing yet about how players choose formations.
- **Stronger options and their cost:**
  - **Monte Carlo tree search (MCTS)** judges a move by playing many quick games from it and favouring moves that win more often. In its basic form it needs no hand-made piece values, only the rules ([Chess Programming Wiki: MCTS](https://www.chessprogramming.org/Monte-Carlo_Tree_Search)). The key papers are [Coulom, "Efficient Selectivity and Backup Operators in Monte-Carlo Tree Search" (Computers and Games 2006, published 2007)](https://doi.org/10.1007/978-3-540-75538-8_7) ([author page](https://www.remi-coulom.fr/CG2006/)), [Kocsis & Szepesvári, "Bandit Based Monte-Carlo Planning" (ECML 2006, the UCT algorithm)](https://doi.org/10.1007/11871842_29), and the survey [Browne et al., "A Survey of Monte Carlo Tree Search Methods", *IEEE TCIAIG* 4(1), 2012](https://doi.org/10.1109/TCIAIG.2012.2186810). Ludii's portal offers its measures from UCT (an MCTS bot) as well as alpha-beta and random playouts ([example](https://ludii.games/conceptsAB.php?gameId=200)). Cost: it's slower per move than our search, but it could be added as another player in `players.mjs` (assessment).
  - **Self-play learning (AlphaZero)** starts from random play and learns only by playing itself ([Silver et al. 2018, *Science* 362, pp. 1140–1144](https://doi.org/10.1126/science.aar6404); [DeepMind blog](https://deepmind.google/blog/alphazero-shedding-new-light-on-chess-shogi-and-go/)). It is the strongest option and the one used for the chess-variants study. It is also expensive: the original training used "5,000 first-generation TPUs" (Google's AI chips) to generate self-play games ([Silver et al. 2017 preprint](https://arxiv.org/abs/1712.01815)), and took about 9 hours for chess ([blog](https://deepmind.google/blog/alphazero-shedding-new-light-on-chess-shogi-and-go/)). A home-scale version for Elements is possible but would be a project of its own (assessment).
- **Human playtests still decide.** Bots measure fairness, length and dominant strategies. They don't measure fun, clarity or tension the way people feel them. Nelson presents his methods as a complement to human playtesting, not a replacement ([Nelson 2011](https://doi.org/10.1609/aiide.v7i3.12479)).

---

## 6. Further reading (plain-language, not citations)

These are friendly introductions. The citations are the inline links above.

- Wikipedia: [Zermelo's theorem](https://en.wikipedia.org/wiki/Zermelo%27s_theorem_(game_theory)) · [Solved game](https://en.wikipedia.org/wiki/Solved_game) · [Chinook, the checkers program](https://en.wikipedia.org/wiki/Chinook_(computer_program)) · [Shannon number](https://en.wikipedia.org/wiki/Shannon_number)
- Wikipedia: [Minimax](https://en.wikipedia.org/wiki/Minimax) · [Alpha–beta pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning) · [Evaluation function](https://en.wikipedia.org/wiki/Evaluation_function) · [Chess piece relative value](https://en.wikipedia.org/wiki/Chess_piece_relative_value)
- Wikipedia: [Monte Carlo tree search](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search) · [AlphaZero](https://en.wikipedia.org/wiki/AlphaZero) · [Game balance](https://en.wikipedia.org/wiki/Game_balance) · [Confidence intervals for a win rate](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval) · [First-move advantage in chess](https://en.wikipedia.org/wiki/First-move_advantage_in_chess)
- Chess Programming Wiki, [Point Value](https://www.chessprogramming.org/Point_Value): piece-value tables from Shannon, Kaufman and others side by side.
- Cameron Browne, [*Measuring Games: Typicality, Novelty and Quality*](https://ludii.games/TalksWorkshop/Metrics.pdf) (workshop slides, 2022): short and visual. It covers fairness, decisiveness, length and the strategy ladder.
- DeepMind, [AlphaZero: Shedding new light on chess, shogi and Go](https://deepmind.google/blog/alphazero-shedding-new-light-on-chess-shogi-and-go/) (blog, 2018).
- Chess.com news, [New AlphaZero paper explores chess variants](https://www.chess.com/news/view/new-alphazero-paper-explores-chess-variants): a chess-player's summary of the rule-variants study.
- Browne, [Yavalath](https://www.cambolbro.com/games/yavalath/): the computer-designed game, with rules you can try on paper.

**Notes on the sources** (details that are often quoted wrongly): Coulom's MCTS paper was presented at Computers and Games 2006 but published in the proceedings in 2007. The AlphaZero *Science* paper (2018) has a 2017 preprint with a different title, "Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm". "Depth in Strategic Games" is in the AAAI-17 workshop *What's Next for AI in Games?* (WS-17-15). Kaufman's article is correctly dated (*Chess Life*, March 1999). I found no separate DeepMind blog post about the chess-variants paper, only its publication page. Zermelo's original 1913 text wasn't found online. The linked translation and history (Schwalbe & Walker) stand in for it.

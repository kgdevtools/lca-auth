# Lichess API — cURL Testing Reference

All endpoints hit `https://lichess.org`. Authenticated endpoints require a personal API token — replace `YOUR_TOKEN` throughout.

```bash
# Set once in your shell session to reuse across commands
TOKEN="YOUR_TOKEN"
```

---

## Puzzles

### Daily Puzzle (no auth)

```bash
curl -s https://lichess.org/api/puzzle/daily | jq .
```

---

### Get a Specific Puzzle by ID (no auth)

```bash
curl -s https://lichess.org/api/puzzle/PUZZLE_ID | jq .
```

---

### Next Puzzle — Default (auth)

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://lichess.org/api/puzzle/next | jq .
```

---

### Next Puzzle — By Theme / Angle (auth)

Replace `THEME` with any value from the themes section below.

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/next?angle=THEME" | jq .
```

---

### Next Puzzle — By Difficulty (auth)

`difficulty` options: `easiest` `easier` `normal` `harder` `hardest`

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/next?difficulty=DIFFICULTY" | jq .
```

---

### Next Puzzle — Theme + Difficulty Combined (auth)

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/next?angle=THEME&difficulty=DIFFICULTY" | jq .
```

---

### Puzzle Batch — By Theme, 20 results (auth)

`nb` controls how many puzzles are returned (max ~50 per request).

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/THEME?nb=20" | jq .
```

---

### Puzzle Batch — Specific Theme Examples

**Fork:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/fork?nb=20" | jq .
```

**Pin:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/pin?nb=20" | jq .
```

**Skewer:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/skewer?nb=20" | jq .
```

**Discovered Attack:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/discoveredAttack?nb=20" | jq .
```

**Double Check:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/doubleCheck?nb=20" | jq .
```

**Back Rank Mate:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/backRankMate?nb=20" | jq .
```

**Smothered Mate:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/smotheredMate?nb=20" | jq .
```

**Deflection:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/deflection?nb=20" | jq .
```

**Sacrifice:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/sacrifice?nb=20" | jq .
```

**Interference:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/interference?nb=20" | jq .
```

---

### Puzzle Batch — By Mate-in-N Motif

**Mate in 1:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mateIn1?nb=20" | jq .
```

**Mate in 2:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mateIn2?nb=20" | jq .
```

**Mate in 3:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mateIn3?nb=20" | jq .
```

**Mate in 4:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mateIn4?nb=20" | jq .
```

**Mate in 5+:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mateIn5?nb=20" | jq .
```

---

### Puzzle Batch — By Game Phase

**Opening:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/opening?nb=20" | jq .
```

**Middlegame:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/middlegame?nb=20" | jq .
```

**Endgame:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/endgame?nb=20" | jq .
```

**Rook Endgame:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/rookEndgame?nb=20" | jq .
```

**Queen Endgame:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/queenEndgame?nb=20" | jq .
```

**Pawn Endgame:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/pawnEndgame?nb=20" | jq .
```

---

### Puzzle Batch — By Opening (ECO / Name)

These use opening family names as the angle. Replace `OPENING_KEY` with a Lichess opening key.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/OPENING_KEY?nb=20" | jq .
```

**Common opening keys:**
| Opening | Key |
|---|---|
| Sicilian Defense | `sicilianDefense` |
| French Defense | `frenchDefense` |
| Caro-Kann | `caroKann` |
| Italian Game | `italianGame` |
| Ruy Lopez | `ruyLopez` |
| King's Indian | `kingsIndian` |
| Queen's Gambit | `queensGambit` |
| English Opening | `englishOpening` |

---

### Puzzle Batch — Mixed (no angle filter)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/mix?nb=20" | jq .
```

---

### Puzzle Batch — With Difficulty Filter

Combine `difficulty` with any theme. Available values: `easiest` `easier` `normal` `harder` `hardest`

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/THEME?nb=20&difficulty=DIFFICULTY" | jq .
```

**Example — Easy forks:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/fork?nb=20&difficulty=easiest" | jq .
```

**Example — Hard endgames:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/batch/endgame?nb=20&difficulty=hardest" | jq .
```

---

## Puzzle Activity & Dashboard

### Puzzle Activity — Recent (auth)

Returns a stream of puzzle results. `max` limits the number of entries.

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/activity?max=20" | jq .
```

---

### Puzzle Dashboard (auth)

Replace `DAYS` with a number (e.g. `30`).

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/puzzle/dashboard/DAYS" | jq .
```

---

### Puzzle Storm Dashboard — By Username (no auth)

```bash
curl -s \
  "https://lichess.org/api/storm/dashboard/USERNAME" | jq .
```

---

## Study Data

### Get a Study Chapter as PGN — Single Chapter (no auth for public studies)

```bash
curl -s \
  "https://lichess.org/api/study/STUDY_ID/CHAPTER_ID.pgn"
```

---

### Export Full Study as PGN — All Chapters (no auth for public studies)

```bash
curl -s \
  "https://lichess.org/api/study/STUDY_ID.pgn"
```

---

### Export Study with Clocks and Comments

```bash
curl -s \
  "https://lichess.org/api/study/STUDY_ID.pgn?clocks=true&comments=true&variations=true"
```

---

### List All Studies by a User (no auth for public)

Returns NDJSON — one study object per line.

```bash
curl -s \
  "https://lichess.org/api/study/by/USERNAME" | jq -s .
```

---

### List Studies by User — With Auth (includes private studies)

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/study/by/USERNAME" | jq -s .
```

---

### Export All Studies by User as PGN

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://lichess.org/api/study/by/USERNAME/export.pgn"
```

---

## Reference

### All Puzzle Theme Keys

```
# Tactics
fork, pin, skewer, discoveredAttack, doubleCheck, deflection,
interference, sacrifice, attraction, clearance, overloading,
trappedPiece, zugzwang, quietMove, bodenMate, arabianMate,
anastasiasMate, hookMate, doubleBishopMate, dovetailMate,
suffocationMate, backRankMate, smotheredMate

# Mate in N
mateIn1, mateIn2, mateIn3, mateIn4, mateIn5

# Game phase
opening, middlegame, endgame, rookEndgame, queenEndgame,
bishopEndgame, knightEndgame, pawnEndgame, queenRookEndgame

# Piece patterns
advancedPawn, capturingDefender, castling, enPassant,
exposedKing, hangingPiece, kingsideAttack, queensideAttack,
promotion, underPromotion

# Misc
equality, advantage, crushing, oneMove, short, long, veryLong,
master, masterVsMaster, superGM, mix
```

### Difficulty Values

```
easiest  →  ~600–1200 rating
easier   →  ~1000–1400 rating
normal   →  ~1200–1600 rating
harder   →  ~1400–1800 rating
hardest  →  ~1600–2400+ rating
```

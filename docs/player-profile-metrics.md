# Player Profile — Metrics & Formulas

Reference for every number shown on `/player-rankings/[key]`. All metrics derive from two
sources already available to the page:

- **Per-tournament aggregates** — one row per appearance: `perf` (performance rating),
  `seed` (the event's `tournament_rating` for the player), `rank` (final standing),
  `points`, `gap` (= `perf − seed`), `date`, `type`, `district`, `province`.
- **Resolved round games** — each round token (`"35b1"`) resolved to an opponent via the
  tournament roster (`rs_local_active_players`, indexed by final-standings `rank`):
  `{ color, result (win|loss|draw|bye), opponentName, opponentRating }`.

Notation: `n` = number of rated events (`perf ≠ null`); `G` = resolved decisive/drawn games
(byes excluded); `S` = the player's per-event seed; `R` = an opponent's rating.

---

## Base performance stats

- **Avg performance** — `mean(perf)` over rated events.
- **Best / Worst** — `max(perf)` / `min(perf)`.
- **Avg gap** — `mean(perf − seed)` over events with both present. Positive ⇒ outperforming seed.

---

## Record block

- **Games played (G)** — `W + L + D` (byes excluded).
- **W / L / D (overall)** — counts of `result` across all resolved games.
- **W / L / D by colour** — same counts filtered by `color === 'white' | 'black'`.
- **Win percentage** — `(W + D/2) / G × 100`. *(Displayed label: "Win percentage".)*
- **Top-3 finishes** — see metric E below (`podiumRate`). *(Displayed label: "Top-3 finishes".)*
- **Top tournament ranking** — best (lowest) `rank` achieved across events, shown as an
  ordinal; if that rank occurred more than once, an `×N` occurrence count is appended.
  - `bestRank = min(rank)` ; `bestRankCount = count(rank === bestRank)`.
- **Byes** — count of rounds with no opponent / `result === 'bye'`.

### Form (sport-table style)
- The final standings of the player's **last 3 tournaments**, newest first, each shown as an
  ordinal (e.g. `1st · 3rd · 3rd`). Missing ranks render as `—`.
- `recentFinishes = appearances.slice(0, 3).map(a => a.rank)` (appearances are newest-first).

---

## Derived insight metrics

### A. Consistency (σ)
- Population standard deviation of performance across rated events.
- `μ = mean(perf)`  →  `σ = sqrt( Σ(perf_i − μ)² / n )`.
- **Display:** `±round(σ)` · "consistency". Lower = steadier.
- **Guard:** needs `n ≥ 2`, else `—`.

### B. Strength of schedule
- Average rating of opponents actually faced (per game).
- `SoS = mean(R)` over all resolved games (repeated opponents counted once per game).
- **Display:** `round(SoS)` · "avg opponent".
- **Guard:** no resolved opponents ⇒ `—`.

### C. Expected vs actual (Elo)
- How the player scored relative to what the rating gaps predicted.
- Per resolved game: `expected = 1 / (1 + 10^((R − S) / 400))`.
- `expectedScore = Σ expected`  ;  `actualScore = Σ result` (win = 1, draw = 0.5, loss = 0).
- `Δ% = (actualScore − expectedScore) / G × 100`.
- **Display:** `+Δ%` / `−Δ%` (1 dp) · "vs expected". Positive ⇒ over-performing.
- **Guard:** only games with both `S` and `R` present; none ⇒ `—`.

### D. Recent form
- Momentum: recent results vs career baseline.
- Order rated events newest→oldest. `recent = mean(perf of last 3)`  ;  `career = avgPerf`.
- `form = round(recent − career)`.
- **Display:** `+form ▲` / `−form ▼` · "form".
- **Guard:** needs `n ≥ 2` (uses up to last 3), else `—`.

### I. Trend slope
- Trajectory: ordinary-least-squares slope of `perf` over time, in points per year.
- `x_i` = event date in fractional years, `y_i = perf_i`.
- `b = Σ((x_i − x̄)(y_i − ȳ)) / Σ((x_i − x̄)²)`.
- **Display:** `+round(b)/yr` / `−round(b)/yr` · "trajectory".
- **Guard:** needs `n ≥ 2` distinct dates, else `—`.

### E. Podium rate
- Share of tournaments finishing top 3.
- `podium = count(rank ≤ 3) / count(rank ≠ null) × 100`.
- **Display:** `round(podium)%` · "podium".

### F. Upset rate
- How often the player beats higher-rated opponents.
- Higher-rated games = resolved games where `R > S`.
- `upsetRate = count(win AND R > S) / count(resolved game AND R > S) × 100`
  (draws/losses vs higher-rated count in the denominator, not the numerator).
- **Display:** `round(upsetRate)%` · "upsets".
- **Guard:** no games vs higher-rated ⇒ `—`.

### G. Best win
- Strongest opponent beaten.
- `bestWin = max(R)` over games with `result === 'win'` and resolved opponent rating.
- **Display:** `bestWin` · "best win".
- **Guard:** no resolved wins ⇒ `—`.

---

## Display wording (plain-language)

Three analytics metrics are shown as a **plain-language headline + small precise sub-figure**,
each with a tap-to-toggle ⓘ tooltip. The underlying numbers (above) are unchanged; only the
display is humanised.

Boundaries below are stated exactly as the code applies them (inclusive/exclusive matters).

**Consistency** (from σ) — headline word, sub-figure `±σ` (e.g. `±224`):

| σ band (exact) | word |
|---|---|
| σ < 60 | Very consistent |
| 60 ≤ σ < 110 | Fairly consistent |
| 110 ≤ σ ≤ 180 | Somewhat erratic |
| σ > 180 | Unpredictable |

**Trajectory** (from `recentForm` = last-3 avg perf − career avg, in rating points; **not** the
slope, which is too often null) — headline word, sub-figure the signed delta (e.g. `+23`):

| form Δ band (exact) | word |
|---|---|
| Δ > 40 | On a tear |
| 15 ≤ Δ ≤ 40 | On the rise |
| −15 < Δ < 15 | Holding steady |
| −40 ≤ Δ ≤ −15 | Cooling off |
| Δ < −40 | In a slump |

Tone: green when Δ > 15, red when Δ < −15, neutral otherwise.

**Upsets** (from `upsetRate`) — the tier word is shown **only when `upsetSampleSize ≥ 5`** games
vs higher-rated; below that the fraction shows alone with no word. Headline = word (or the
fraction when ungated), sub-figure = `wins of games` (e.g. `5 of 15`). Label: "vs stronger".

| rate band (exact) | word |
|---|---|
| rate ≥ 50% | Giant-killer |
| 30% ≤ rate < 50% | Punches up |
| 15% ≤ rate < 30% | Occasional upsets |
| rate < 15% | Plays to rating |

**Tooltips** (tap-to-toggle ⓘ, mobile-friendly; no jargon):
- consistency — "How much their results swing between tournaments. Steadier means more predictable."
- trajectory — "Whether their recent results are above or below their career average."
- upsets — "How often they beat opponents rated higher than themselves."
- avg gap — "How much they beat (or fell short of) their own rating each event, on average."
- avg opponent — "The average rating of the opponents they have faced."
- vs expected — "How they scored versus what the rating gaps predicted. Positive means over-performing."

Worked example (Mailula Matsobane): **Unpredictable** `±224` · **On the rise** `+23` ·
**Punches up** `5 of 15`.

## Caveats (apply throughout)

- **Opponent resolution** uses `rs_local_active_players` (active/local players) indexed by
  final-standings rank. ~10% of opponents (non-local/inactive) don't appear in that view and
  are excluded from B, C, F, G — they still render as "Opponent #N" in the games list.
- **Per-event seed `S`** is that appearance's `tournament_rating`; events missing a seed are
  excluded from C and F.
- **Minimum-sample guards** above mean low-activity players show `—` rather than a noisy or
  undefined value.

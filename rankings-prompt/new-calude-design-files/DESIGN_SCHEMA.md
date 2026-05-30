# Player Rankings — Design & UX Schema

A reference spec to reproduce the `/player-rankings` page: a chess performance‑rankings
table with filters and click‑to‑expand tournament history. Aesthetic: modern, minimal,
compact, near‑square, with strong typographic hierarchy.

---

## 1. Foundations

### 1.1 Type
| Role | Family | Notes |
|---|---|---|
| UI / labels / names | **IBM Plex Sans** (400/500/600/700) | headings, names, event titles |
| All numbers / stats | **IBM Plex Mono** (400/500/600) | `font-variant-numeric: tabular-nums` — columns must align |

Rule: **every numeric value uses the mono face with tabular figures.** Text never does.

Type sizes (px): page title 24 / 600; page sub 13.5; table body `--table-font` 13;
column header 11/600; group-band label 9.5/600 uppercase `letter-spacing .1em`; player
name 14/600; name meta 11.5 mono; hero stat (Avg pill) 14.5/600; profile name 17/600;
profile big number 34/600 mono; profile stat value 15/500.

### 1.2 Color (oklch tokens; light default, dark via `html[data-theme="dark"]`)
| Token | Light | Role |
|---|---|---|
| `--bg` | `oklch(.985 .004 95)` | warm paper page bg |
| `--surface` | `oklch(1 0 0)` | cards, table, sticky cells |
| `--surface-2` | `oklch(.975 .004 95)` | inputs |
| `--raised` | `oklch(.995 .003 95)` | active segment |
| `--text-strong` | `oklch(.20 .014 70)` | names, hero values |
| `--text` | `oklch(.26 .012 70)` | body |
| `--muted` | `oklch(.56 .012 70)` | secondary numbers, labels |
| `--faint` | `oklch(.70 .01 70)` | meta, captions, group labels |
| `--border` | `oklch(.915 .005 85)` | hairlines |
| `--border-strong` | `oklch(.86 .006 85)` | header underline, scrollbar |
| `--hover` | `oklch(.965 .006 90)` | row hover |
| `--expand-bg` | `oklch(.978 .005 92)` | open row + panel bg |

Accent is **hue‑swappable** via a single var `--accent-h` (gold 74 default; emerald 152,
azure 250, rose 12). Derived:
- `--accent: oklch(.74 .135 h)` · `--accent-strong: oklch(.62 .14 h)` · `--accent-soft: <accent>/0.12`

Semantic deltas: `--pos: oklch(.60 .13 152)` (green), `--neg: oklch(.585 .17 27)` (red).
Dark mode lightens text/accents and darkens surfaces; same token names, overridden values.

Warm neutrals only (chroma ≤ 0.014 on all greys). No pure black/white.

### 1.3 Shape, spacing, elevation
- **Radius: 2px everywhere** (cards, inputs, dropdowns, pills). Near‑square is the signature.
  Only true circles stay round (status dots, sparkline node).
- Card padding 14–18px. Card border `1px solid --border` + soft shadow
  `0 1px 2px /.04, 0 8px 24px -12px /.18`.
- Page: `max-width 1240px`, centered, padding `44px 28px 120px` (shrinks responsively).
- Density tokens drive row height: `--row-pad-y` 6 (default) / 3 (compact) / 11 (comfy);
  `--cell-pad-x` 14/11/16; `--table-font` 13/12.5/13.5.

---

## 2. Layout

```
.page (≤1240, centered)
├─ .page-head      ← H1 "Player Rankings" + sub "<n> players · ranked by average performance rating"
├─ .filters        ← filter card
└─ .table-wrap     ← table card
   └─ .table-scroll (overflow-x:auto)  ← horizontal scroll on narrow screens
      └─ table.rk
```

---

## 3. The Table

### 3.1 Two‑tier header
- **Group band** (`tr.grp`): uppercase 9.5px faint labels spanning column groups; thin
  inset left‑rule separates groups. First cell is an empty spacer over rank+player.
- **Column row** (`tr.col`): 11px labels, all **click‑to‑sort** (arrow ▼/▲ on active field).

Column schema (left→right):

| # | Player | **Performance** | | **No. Tournaments** | | **Tournament Rating** | | **Rating** | |
|---|---|---|---|---|---|---|---|---|---|
| rank | name cell | Avg | Best | Rated | Played | Avg | Δ | FIDE | Chess SA |
| `i+1` | identity | `avgPerf` (hero) | `bestPerf` | `ratedTournaments` | `totalAppearances` | `avgSeed` | `avgGap` | `fideRating` | `currentRating` |

Group‑starting columns carry an inset left hairline (`box-shadow: inset 1px 0 0 border`).

### 3.2 Cell treatments
- **Rank**: mono, centered, fixed `--rank-w` 54px. Top‑3 tinted: #1 gold, #2 silver, #3 bronze.
- **Player** (rich identity cell, left‑aligned): caret ▸ + name (14/600) + optional **title
  badge** (mono 10px, accent‑soft pill — the one place a filled pill remains) + meta line
  `FED · Sex · b.YYYY` (mono faint).
- **Avg** = hero: accent‑soft **pill**, accent‑strong bold.
- Other numbers: mono, `--muted` (dim) for secondary stats, strong for emphasis.
- **Δ (avgGap)**: green/red with ▲/▼ tri‑marker; `+`‑signed.
- Sticky left columns: rank + player stay pinned during horizontal scroll
  (`position: sticky; left: 0 / var(--rank-w)`), bg repaints to match row state.

### 3.3 Row states
default → `:hover` bg `--hover` (cursor pointer) → `.open` bg `--expand-bg`, bottom border
suppressed so the row visually merges into its panel.

---

## 4. Expand interaction (click player → tournament history)

- **Trigger**: click anywhere on the player row. Single‑open accordion — opening one closes
  the previous (`openKey` state; `null` = none).
- **Animation**: CSS grid‑rows trick — wrapper `grid-template-rows: 0fr → 1fr`, 0.26s
  `cubic-bezier(.4,0,.2,1)`, inner `overflow:hidden`. Caret rotates 90°.
- **Panel** spans all columns (`<td colSpan=10>`), bg `--expand-bg`. Two‑column grid
  `300px / 1fr`, `align-items: stretch`:

  **Left — profile card** (`.profile`, fills row height via `height:100%` flex column):
  - name (17/600)
  - sub badges: title · FED · Sex · b.YYYY — **plain text, no background**, separated by
    middot via `::after`
  - big stat: `avgPerf` 34px mono accent + "avg performance" label
  - 2‑col stat grid: Best · Tournament rating (`avgSeed`) · Δ vs rating (`avgGap`, colored)
    · FIDE · Chess SA (`currentRating`)
  - identity badge pinned to bottom (`margin-top:auto`): colored dot + provenance
    (Verified · unique no. / Matched · FIDE id / Fuzzy name match)

  **Right — history**:
  - header: "Tournament history · N rated" + **perf sparkline** (chronological polyline +
    gradient area + end node + min–max caption)
  - sub‑table `table.hist`, newest first: **Date · Event** (name + location subline) **·
    Rank · Pts · Rating** (`seed`) **· Perf · Δ**. No Match column.

---

## 5. Filters (`.filters` card)

Controls are dropdowns / ranges only — **no chip groups**.

| Control | Type | Field | Behavior |
|---|---|---|---|
| Search | text + magnifier | `search` | case‑insensitive name substring |
| Category | `<select>` | `category` | `all` / `seniors` / `juniors` |
| Age group | `<select>` | `ageGroup` | **disabled until Category = Juniors**; then `all juniors` + U08…U20 |
| Min events | number | `minTournaments` | `ratedTournaments ≥ n`; spinners hidden |
| Show rows | number | `limit` | slice top N |
| Reset filters | text button | — | appears only when a filter is active; restores defaults |

Defaults: `{ minTournaments: 1, limit: 50, category: "all" }`.

**Category math** (reference year 2026): Seniors = `birthYear ≤ 1985`; Juniors =
`birthYear ≥ 2006`. Age group UNN further requires `birthYear ≥ 2026 − NN` (cumulative
"under N"). Changing Category away from Juniors clears `ageGroup`.

Control styling: 34px tall, 2px radius, `--surface-2` bg, focus → accent border. Select has
a custom inline‑SVG chevron; `:disabled` → 0.4 opacity.

---

## 6. Sorting

State `{ field, dir }`, default `{ avgPerf, desc }` (= rank order). Click a column header:
same field → toggle dir; new field → `desc` (numbers) / `asc` (name). Null values sort last.
Rank number always reflects the current sorted position (`i+1`), so sorting re‑ranks live.

---

## 7. Responsive

| Breakpoint | Changes |
|---|---|
| ≤1024 | page padding 36/22; expand grid `248px/1fr`, gap 20 |
| ≤768 | padding 28/16; expand grid **single column**; profile un‑stickies; head stacks |
| ≤600 | padding 20/12; filter top **stacks full‑width**; selects 100%; fields space‑between; history cell pad tightens; event location hidden |
| ≤420 | meta + badge type nudged down |

Table always scrolls horizontally inside `.table-scroll`; rank + player stay pinned.

---

## 8. Data contract

Renders the `RankedPlayer` / `Appearance` shapes from `rankings.ts` unchanged. Demo data is
deterministic (seeded RNG, 22 Southern‑African players, 12 events) so reloads are stable —
swap in real rows and nothing else changes.

Key consumed fields: `name, title, sex, federation, birthYear, fideRating, currentRating,
avgPerf, bestPerf, ratedTournaments, totalAppearances, avgSeed, avgGap, identityKind,
appearances[{ date, tournamentName, district, province, rank, points, seed, perf, gap }]`.

---

## 9. Tweaks panel
Live controls (persisted): **Dark mode** toggle, **Density** (Compact/Cosy/Comfy →
`html[data-density]`), **Accent hue** (gold/emerald/azure/rose → sets `--accent-h`).

## 10. File map
- `Player Rankings.html` — shell, all CSS tokens + component styles, script loads
- `data.jsx` — seeded sample data (`window.RANKINGS_DATA`, `window.TOURNAMENTS`)
- `filterbar.jsx` — `FilterBar`
- `table.jsx` — `RankingsTable`, `PlayerRow`, `ExpandedPanel`, `Sparkline`
- `app.jsx` — state, filtering, sorting, Tweaks wiring
- `tweaks-panel.jsx` — host‑protocol shell + controls

---

### Principles (the "feel")
1. Numbers are mono + tabular; text is sans. Never mix.
2. 2px radius — almost square, never rounded.
3. One accent, hue‑swappable; greens/reds reserved for signed deltas only.
4. Hierarchy by weight/size/color, not boxes — minimal fills (only the title badge + Avg
   hero pill are filled).
5. Compact by default; density is a knob, not a redesign.

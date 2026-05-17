# CDC Rankings Enhancement Plan

## Overview
Add junior indicator icons and CDC selection criteria to the /rankings page, with phased implementation and UI improvements matching the academy theme.

---

## Phases

### Phase 1: Data Layer Enhancement
- [x] 1.1 Update types in server-actions.ts (add SelectionStats interface)
- [x] 1.2 Fetch tournament details (location, tournament_type) from tournaments table
- [x] 1.3 Calculate selection stats per player (open count, junior count, Capricorn check)
- [x] 1.4 Add isJunior flag based on age_group

### Phase 2: Table UI - Junior Indicator
- [x] 2.1 Add junior indicator icon next to player name in RankingsTable.tsx
- [x] 2.2 Style icon to match academy theme (minimal, themed colors)

### Phase 3: Modal - Selection Criteria Details
- [x] 3.1 Enhance PerformanceDetailsModal with selection stats breakdown
- [x] 3.2 Add visual progress indicators for requirements
- [x] 3.3 Show tournament lists by type (Open vs Junior)

### Phase 4: UI Revamp (Academy-Style)
- [x] 4.1 Update RankingsTable styling to match academy leaderboard
- [x] 4.2 Update SearchFilters styling (existing style matches)
- [x] 4.3 Update PerformanceDetailsModal styling (existing style matches)

### Phase 5: Filter/Sort Enhancement (Optional)
- [x] 5.1 Add "Juniors Only" filter toggle
- [x] 5.2 Add "Qualified" filter

---

## CDC Selection Criteria (2025-2026)
- 6 tournaments total
- At least 4 Open Tournaments (that COUNT)
- At least 2 Junior Qualifying Tournaments
- At least 1 Open Tournament in Capricorn District

## Period
- 1 October 2025 - 30 September 2026 (2025-2026)

---

## Current Status
**ALL PHASES COMPLETE**
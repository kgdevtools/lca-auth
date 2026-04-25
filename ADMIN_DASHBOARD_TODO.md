# Admin Dashboard Overhaul — Task Checklist

Reference plan: `.claude/plans/binary-wandering-hennessy.md`

---

## Phase 0 — Junior Classification Removal

- [x] Delete `src/app/admin/junior-classification/` (page, layout, components — entire directory)
- [x] Remove Junior Classification nav item from `AdminSidebar.tsx` (done in Phase 2)

---

## Phase 1 — Dead Code Cleanup

- [x] Delete `src/app/admin/admin-dashboard/components/DashboardSidebar.tsx`
- [x] Delete `src/app/admin/admin-dashboard/active-players/components/ActivePlayersTable.tsx` (old version)
- [x] Delete `src/app/admin/admin-dashboard/components/TournamentsChart.tsx`
- [x] Delete `src/app/admin/admin-dashboard/performance/page.tsx`
- [x] Delete `src/app/admin/admin-dashboard/performance/server-actions.ts`
- [x] Delete `src/app/admin/admin-dashboard/performance/components/PlayersPerformanceTable.tsx`
- [x] Delete `src/app/admin/admin-dashboard/performance/components/PerformanceStatsSummary.tsx`
- [x] Delete `src/app/admin/admin-dashboard/performance/components/PerformanceDetailsModal.tsx`
- [x] Remove `getPlayersWithPerformanceStats`, `getPlayerPerformanceDetails`, `getPerformanceStatsSummary` from `src/app/admin/admin-dashboard/server-actions.ts`

---

## Phase 2 — Sidebar + Layout

- [x] Rewrite `src/components/admin/AdminSidebar.tsx`
  - New nav items: Overview, Tournaments, All Players, Active Players, Profiles, Contacts, Registrations
  - Token update: `bg-card border-r border-border`, active `bg-primary/10 text-primary`, hover `hover:bg-accent/50`
  - Keep collapsible + mobile overlay
- [x] Update `src/app/admin/admin-dashboard/layout.tsx`
  - Outer div: `bg-background` (replaces `bg-gray-50 dark:bg-gray-900`)

---

## Phase 3 — Overview Page

- [x] Update `src/app/admin/admin-dashboard/components/DashboardOverview.tsx`
  - Cards: `bg-card border border-border rounded-sm shadow-sm`
  - Icon bg: `bg-primary/10`
  - Add 5th stat card: **Pending Registrations** (count from `player_registrations`)
- [x] Update `src/app/admin/admin-dashboard/page.tsx`
  - Remove `ContactSubmissionsTable` import + usage (moving to its own route)

---

## Phase 4 — Contacts Route (enhanced)

- [x] Create `src/app/admin/admin-dashboard/contacts/page.tsx`
- [x] Create `src/app/admin/admin-dashboard/contacts/ContactsTable.tsx` (rewrite of old ContactSubmissionsTable)
  - Fix bug: status enum must be `new | read | responded` (not `resolved`)
  - Add status filter dropdown
  - Add search by name/email
  - Add export (CSV/Excel/JSON) via `useExport` hook
  - Row actions: Mark Read, Mark Responded, Delete
  - Detail panel (slide-in or modal) with all fields

---

## Phase 5 — Existing Table Token Updates

- [x] Update `src/app/admin/admin-dashboard/tournaments/TournamentsTable.tsx`
  - Replace hardcoded gray classes with `bg-card border-border rounded-sm shadow-sm` tokens
- [x] Update `src/app/admin/admin-dashboard/all-players/components/AllPlayersTable.tsx`
  - Token update
  - Add delete action (new `deletePlayer` server action in `all-players/server-actions.ts`)
- [x] Update `src/app/admin/admin-dashboard/active-players/components/ActivePlayersTableRefactored.tsx`
  - Token update only (read-only table, no structural change)

---

## Phase 6 — Profiles Table (new actions)

- [x] Update `src/app/admin/admin-dashboard/profiles/components/ProfilesTable.tsx`
  - Token update
  - Add role badge + **Change Role** dropdown (uses existing `updateProfile` server action)
  - Add **Confirm / Edit Tournament Name** action (admin-only override)
  - Add role filter dropdown
  - Display columns: Avatar, Full Name, Role, Tournament Full Name, ChessA ID, Created At (Email omitted — not in Profile type)
- [x] Add `adminUpdateTournamentFullname(profileId, newName)` to `src/app/admin/admin-dashboard/profiles/server-actions.ts`

---

## Phase 7 — Registrations (new section)

- [x] Create `src/app/admin/admin-dashboard/registrations/server-actions.ts`
  - `getRegistrations(page, itemsPerPage, filters?)`
  - `getRegistrationById(id)`
  - `deleteRegistration(id)`
  - `getAllRegistrationsForExport()`
  - Reuse: `checkAdminRole`, `createClient`
- [x] Create `src/app/admin/admin-dashboard/registrations/page.tsx`
- [x] Create `src/app/admin/admin-dashboard/registrations/components/RegistrationsTable.tsx`
  - Reuse: `useExport`, `usePagination`, `useTableFilters`
  - Display JSONB `data_entry` in detail dialog as key-value pairs
  - Actions: View, Delete
  - Export (CSV + JSON)

---

## Phase 8 — Verification

- [ ] `tsc --noEmit` — no new type errors
- [ ] Navigate to `/admin/admin-dashboard` — overview loads with 5 stat cards
- [ ] Click each sidebar item — no 404s
- [ ] Contacts page — status cycle works (new → read → responded), export downloads
- [ ] Registrations page — JSONB data displays in detail modal, export works
- [ ] Profiles page — role change works, tournament name editable by admin
- [ ] Tournaments / All Players / Active Players — existing functionality intact, tokens updated

---

## Notes
- **Export**: Reuse `src/services/exportService.ts` → `exportData()` + `src/hooks/useExport.ts` — do not create new export logic
- **Auth guard**: Reuse `src/utils/auth/adminAuth.ts` → `checkAdminRole()` in all new server actions
- **Name matching feature** (profile ↔ active player): deferred to a future session
- **Content / Blog section**: leave as-is, not in scope
- **Junior Classification**: leave at its standalone `/admin/junior-classification` route

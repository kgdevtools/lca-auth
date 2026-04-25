# Feature-Based Architecture Refactoring Plan

## Context

The codebase is a Next.js (App Router) chess academy platform with Supabase, React 19, TypeScript strict mode, Zod, Framer Motion, chess.js, and Contentful. The 3-tier separation (actions → services → repositories) already exists and is largely clean. The goal is to reorganize around feature modules so related code lives together, fix a few concrete bugs in the process, and eliminate unnecessary API routes.

This is a reorganization + targeted fixes — not a rewrite. The app stays fully functional after each phase.

---

## What Is Already Good (Do Not Touch)

- 3-tier architecture (`actions → services → repositories`) — sound pattern, just needs colocation
- `src/utils/supabase/` — three correct client factories (browser, server, admin); leave them
- `src/middleware.ts` — must stay at root, do not move
- `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/` — correctly colocated with their route
- `src/app/academy/lesson/add/actions.ts` — large route-specific file, leave colocated
- Lichess OAuth routes (`/api/auth/lichess/`) — requires HTTP redirect dance with cookies, cannot become Server Actions
- `'use client'` on `AcademyLayoutClient` and admin-dashboard layout — correct, sidebar collapse needs state

---

## Target Structure

```
src/
├── shared/
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (unchanged)
│   │   ├── animations/            # FadeIn, PageTransition, StaggerChildren
│   │   └── (ScrollNavbar, nav-links, footer-nav, mobile-nav, theme-toggle, logo-mark, ErrorBoundary, warning-banner)
│   ├── lib/
│   │   ├── utils.ts               # cn(), formatters
│   │   ├── dateUtils.ts
│   │   └── contentful.ts
│   ├── hooks/
│   │   ├── usePagination.ts
│   │   └── useTableFilters.ts
│   └── utils/
│       ├── supabase/              # client.ts, server.ts, admin.ts
│       └── auth/                  # academyAuth.ts, adminAuth.ts
│
└── features/
    ├── academy/
    │   ├── actions/               # lessonActions.ts, coachActions.ts, progressActions.ts (new thin wrapper)
    │   ├── services/              # lessonService.ts, blockService.ts, progressService.ts, gamificationService.ts
    │   ├── repositories/          # lessonRepository.ts, blockRepository.ts, studentRepository.ts
    │   ├── components/            # AcademySidebar, AcademyDashboardClient, ProgressOverview, StudentProgressTable, etc.
    │   └── lib/
    │       ├── lessonSchema.ts
    │       ├── blockRegistry.ts
    │       ├── pointsFormula.ts   # NEW — extracted from both gamificationService and studentRepository
    │       └── constants/         # achievements.ts, lessonBlocks.ts
    │
    ├── admin/
    │   ├── actions/               # playerActions.ts, profileAdminActions.ts, registrationActions.ts, contactActions.ts, rankingsActions.ts
    │   ├── services/              # exportService.ts
    │   ├── repositories/          # playerRepo.ts
    │   └── components/            # AdminSidebar, all admin table components, blog management components
    │
    ├── tournaments/
    │   ├── actions/               # uploadActions.ts, tournamentViewActions.ts
    │   ├── services/              # parserService.ts, parserService-2.ts, roundRobinParser.ts, teamTournamentParser.ts, gameService.ts
    │   ├── repositories/          # tournamentRepo.ts, teamTournamentRepo.ts, upcomingTournamentRepo.ts
    │   └── lib/                   # teamTournamentUtils.ts, tieBreakUtils.ts
    │
    ├── lichess/
    │   ├── services/              # lichess.service.ts, lichessOauth.service.ts, lichessSync.service.ts, studyParser.ts
    │   ├── repositories/          # lichessConnectionRepo.ts
    │   └── hooks/                 # useLichessSync.ts
    │
    ├── blog/
    │   ├── actions/               # categoryActions.ts, tagActions.ts (replacing some API routes)
    │   ├── services/              # blogService.ts, blogEnhancementService.ts
    │   └── components/            # BlogPostsTable, BlogPostPreview, blog-preview-card, blog-skeletons
    │
    ├── chess/
    │   ├── services/              # chess-puzzle.service.ts, pgnService.ts, opponentLookupService.ts, stockfish.ts
    │   ├── components/            # AnalysisBoard, AnalysisPanel, ChessPuzzleBoard, ChessPuzzleStatusBar, game-viewer
    │   └── hooks/                 # useStockfish.ts
    │
    ├── auth/
    │   └── actions/               # authActions.ts (login, signup, reset-password)
    │
    └── user/
        ├── actions/               # userActions.ts, playerMatchActions.ts, registrationActions.ts, contactActions.ts
        └── components/            # UserSidebar, OnboardingModal, tournament-player-search
```

---

## Phase 1: Fix `'use server'` Placement Bug ⚡ (Highest Priority — 1 hour)

**Problem:** `gamificationService.ts` and `progressService.ts` both have `'use server'` at the top. These are service-layer files containing business logic — not action endpoints. The directive is semantically wrong and bundles service functions as React action endpoints.

**Fix for `gamificationService.ts`:**
- File: `src/services/gamificationService.ts`
- Remove `'use server'` directive — this file is only ever called from `progressService.ts`, never directly from components. No directive needed.

**Fix for `progressService.ts`:**
- File: `src/services/progressService.ts`
- Remove `'use server'` directive from the service itself
- Create `src/features/academy/actions/progressActions.ts` with `'use server'` that imports and re-exports the functions (adding `revalidatePath` calls at the action layer where they belong)
- Update all import sites to use the new actions file instead of the service directly

---

## Phase 2: Eliminate `computeLessonPoints` Duplication (30 min)

**Problem:** The points formula exists in both `src/services/gamificationService.ts` AND `src/repositories/lesson/studentRepository.ts` as `computeLessonPoints()`. The repo comment even says "mirrors the formula in gamificationService."

**Fix:**
- Create `src/features/academy/lib/pointsFormula.ts` as a pure function file with no imports
- Both files import from there
- Single source of truth

```ts
// pointsFormula.ts
export function computeLessonPoints(type: 'puzzle' | 'study', difficulty: string, quizScore?: number, firstAttempt?: boolean): number { ... }
```

---

## Phase 3: Fix AcademySidebar Client Data Fetch (2 hours)

**Problem:** Current flow:
```
app/academy/layout.tsx (Server, async) → AcademyLayoutClient ('use client') → AcademySidebar ('use client' + useEffect fetchUser)
```
`AcademySidebar` calls Supabase browser client in a `useEffect` to get user+profile, causing a flash of unauthenticated state on every navigation. The academy page (`app/academy/page.tsx`) already fetches the same data server-side.

**Files:**
- `src/app/academy/layout.tsx`
- `src/app/academy/AcademyLayoutClient.tsx`
- `src/components/academy/AcademySidebar.tsx`

**Fix:**
1. Make `app/academy/layout.tsx` a proper `async` Server Component that calls `getCurrentUserWithProfile()` and passes `{ user, profile }` as props to `AcademyLayoutClient`
2. `AcademyLayoutClient` forwards props to `AcademySidebar`
3. Remove `useEffect` + `useState` for user/profile from `AcademySidebar` — it becomes a pure display component receiving props
4. `'use client'` stays on `AcademyLayoutClient` (sidebar collapse state is still there — correct)

**Check:** Does `AdminSidebar` have the same pattern? If yes, apply same fix to `src/app/admin/admin-dashboard/layout.tsx`.

---

## Phase 4: Centralize Scattered Server Actions (6 hours total, per-feature)

Server actions are currently colocated in `app/*/server-actions.ts` files. Move them into feature modules. One feature at a time — app stays working after each sub-phase.

**Workflow per file:**
1. Create `src/features/<feature>/actions/<name>Actions.ts`
2. Move (cut, not copy) functions from colocated file
3. Update all import sites (`grep` for old path)
4. Delete the colocated file

### 4a. Admin Actions (highest value)
| From | To |
|------|-----|
| `app/admin/admin-dashboard/server-actions.ts` | `features/admin/actions/tournamentActions.ts` + `features/admin/actions/contactActions.ts` |
| `app/admin/admin-dashboard/active-players/server-actions.ts` | `features/admin/actions/playerActions.ts` |
| `app/admin/admin-dashboard/all-players/server-actions.ts` | `features/admin/actions/playerActions.ts` (merge) |
| `app/admin/admin-dashboard/profiles/server-actions.ts` | `features/admin/actions/profileAdminActions.ts` |
| `app/admin/admin-dashboard/registrations/server-actions.ts` | `features/admin/actions/registrationActions.ts` |
| `app/admin/upload-tournament/server-actions.ts` | `features/tournaments/actions/uploadActions.ts` |
| `app/admin/upload-team-tournament/server-actions.ts` | `features/tournaments/actions/uploadActions.ts` (merge) |

### 4b. Auth Actions
| From | To |
|------|-----|
| `app/login/server-actions.ts` | `features/auth/actions/authActions.ts` |
| `app/signup/server-actions.ts` | `features/auth/actions/authActions.ts` (merge) |
| `app/reset-password/server-actions.ts` | `features/auth/actions/authActions.ts` (merge) |
| `app/reset-password/confirm/server-actions.ts` | `features/auth/actions/authActions.ts` (merge) |

### 4c. Rankings Actions
| From | To |
|------|-----|
| `app/junior-rankings/server-actions.ts` | `features/admin/actions/rankingsActions.ts` |
| `app/rankings/server-actions.ts` | `features/admin/actions/rankingsActions.ts` (merge) |

### 4d. Tournament Actions
| From | To |
|------|-----|
| `app/tournaments/server-actions.ts` | `features/tournaments/actions/tournamentViewActions.ts` |
| `app/tournaments/[id]/team-server-actions.ts` | `features/tournaments/actions/teamTournamentActions.ts` |

### 4e. User & Forms Actions
| From | To |
|------|-----|
| `app/user/actions.ts` | `features/user/actions/userActions.ts` |
| `app/user/tournament-actions.ts` | `features/user/actions/playerMatchActions.ts` |
| `app/forms/contact-us/server-actions.ts` | `features/user/actions/contactActions.ts` |
| `app/forms/register-player/server-actions.ts` | `features/user/actions/registrationActions.ts` |
| `app/forms/tournament-registration/server-actions.ts` | `features/user/actions/tournamentRegistrationActions.ts` |
| `app/view/actions.ts` | `features/chess/actions/viewActions.ts` |

### 4f. Academy src/actions/ (already centralized, just relocate)
| From | To |
|------|-----|
| `src/actions/lesson/lessonActions.ts` | `features/academy/actions/lessonActions.ts` |
| `src/actions/academy/coachActions.ts` | `features/academy/actions/coachActions.ts` |

---

## Phase 5: Move Services + Repositories (3–4 hours)

Move feature-owned services and their paired repositories into feature modules. Update all import sites.

### Academy
| From | To |
|------|-----|
| `src/services/lesson/lessonService.ts` | `features/academy/services/lessonService.ts` |
| `src/services/lesson/blockService.ts` | `features/academy/services/blockService.ts` |
| `src/services/gamificationService.ts` | `features/academy/services/gamificationService.ts` |
| `src/services/progressService.ts` | `features/academy/services/progressService.ts` |
| `src/repositories/lesson/` | `features/academy/repositories/` |

### Lichess
| From | To |
|------|-----|
| `src/services/lichess.service.ts` | `features/lichess/services/lichessService.ts` |
| `src/services/lichessOauth.service.ts` | `features/lichess/services/lichessOauth.service.ts` |
| `src/services/lichessSync.service.ts` | `features/lichess/services/lichessSync.service.ts` |
| `src/services/lichess/studyParser.ts` | `features/lichess/services/studyParser.ts` |
| `src/repositories/lichessConnectionRepo.ts` | `features/lichess/repositories/lichessConnectionRepo.ts` |

### Tournaments
| From | To |
|------|-----|
| `src/services/parserService.ts` | `features/tournaments/services/parserService.ts` |
| `src/services/parserService-2.ts` | `features/tournaments/services/parserService-2.ts` |
| `src/services/roundRobinParser.ts` | `features/tournaments/services/roundRobinParser.ts` |
| `src/services/teamTournamentParser.ts` | `features/tournaments/services/teamTournamentParser.ts` |
| `src/services/gameService.ts` | `features/tournaments/services/gameService.ts` |
| `src/repositories/tournamentRepo.ts` | `features/tournaments/repositories/tournamentRepo.ts` |
| `src/repositories/teamTournamentRepo.ts` | `features/tournaments/repositories/teamTournamentRepo.ts` |
| `src/repositories/upcomingTournamentRepo.ts` | `features/tournaments/repositories/upcomingTournamentRepo.ts` |
| `src/repositories/playerRepo.ts` | `features/admin/repositories/playerRepo.ts` |

### Blog
| From | To |
|------|-----|
| `src/services/blogService.ts` | `features/blog/services/blogService.ts` |
| `src/services/blogEnhancementService.ts` | `features/blog/services/blogEnhancementService.ts` |

### Chess
| From | To |
|------|-----|
| `src/services/chess-puzzle.service.ts` | `features/chess/services/chessPuzzleService.ts` |
| `src/services/pgnService.ts` | `features/chess/services/pgnService.ts` |
| `src/services/opponentLookupService.ts` | `features/chess/services/opponentLookupService.ts` |
| `src/services/stockfish.ts` | `features/chess/services/stockfish.ts` |

### Shared/Infrastructure
| From | To |
|------|-----|
| `src/services/email.service.ts` | `src/shared/services/emailService.ts` |
| `src/services/testService.ts` | **Delete** (dev scaffold) |
| `src/services/exportService.ts` | `features/admin/services/exportService.ts` |

---

## Phase 6: API Route Audit

### Keep as API Routes (must stay HTTP)
| Route | Reason |
|-------|--------|
| `/api/auth/lichess/` + `/api/auth/lichess/callback/` | OAuth redirect requires HTTP response with cookies |
| `/api/puzzles/lichess/[puzzleId]/` | Proxies Lichess API, needs HTTP |
| `/api/study/lichess/[studyId]/` | Proxies Lichess API, needs HTTP |
| `/api/tournaments/[tableName]/games/` | Dynamic table param, used by client-side game viewer |
| `/api/tournaments/list/` | Check: if used by client-side fetch, keep |
| `/api/blog/posts/` | Needs `Cache-Control: public` response headers (Server Actions can't set HTTP headers) |
| `/api/blog/media/upload/` | Multipart file upload, Server Actions have size limits |
| `/api/players/search/` | Combobox keystroke-triggered fetch, must be HTTP |
| `/api/upload-poster/` | File upload |
| `/api/lichess/sync/` | Called from `useLichessSync` hook via fetch — leave (clean, 25 lines) |

### Convert to Server Actions
| Route | New Location |
|-------|--------------|
| `/api/blog/categories/` (POST) + `/api/blog/categories/[id]/` (PUT/DELETE) | `features/blog/actions/categoryActions.ts` |
| `/api/blog/tags/` + `/api/blog/tags/[id]/` | `features/blog/actions/tagActions.ts` |
| `/api/blog/enhancements/` + `/api/blog/enhancements/publish/` | `features/blog/actions/enhancementActions.ts` (if only called from admin UI forms) |
| `/api/profile/` (POST upsert on signup) | Call a Server Action from the auth callback route instead; removes the body-injection security smell |

After conversion, delete the replaced API route files.

---

## Phase 7: Move Lib Files (1 hour)

| From | To |
|------|-----|
| `src/lib/lessonSchema.ts` | `features/academy/lib/lessonSchema.ts` |
| `src/lib/blockRegistry.ts` | `features/academy/lib/blockRegistry.ts` |
| `src/lib/constants/achievements.ts` | `features/academy/lib/constants/achievements.ts` |
| `src/lib/constants/lessonBlocks.ts` | `features/academy/lib/constants/lessonBlocks.ts` |
| `src/lib/teamTournamentUtils.ts` | `features/tournaments/lib/teamTournamentUtils.ts` |
| `src/lib/tieBreakUtils.ts` | `features/tournaments/lib/tieBreakUtils.ts` |
| `src/lib/pgnParser.ts` | `features/chess/lib/pgnParser.ts` |
| `src/lib/utils.ts` | `src/shared/lib/utils.ts` |
| `src/lib/dateUtils.ts` | `src/shared/lib/dateUtils.ts` |
| `src/lib/contentful.ts` | `src/shared/lib/contentful.ts` |

---

## Phase 8: Move Components + Hooks (2 hours)

| From | To |
|------|-----|
| `src/components/academy/` | `features/academy/components/` |
| `src/components/lessons/` | `features/academy/components/lessons/` |
| `src/components/admin/` | `features/admin/components/` |
| `src/components/analysis/` | `features/chess/components/` |
| `src/components/chess-puzzles/` | `features/chess/components/` |
| `src/components/blog/` | `features/blog/components/` |
| `src/components/user/` | `features/user/components/` |
| `src/components/home/` | `src/shared/components/home/` |
| `src/components/animations/` | `src/shared/components/animations/` |
| `src/components/forms/` | `features/user/components/forms/` |
| `src/components/ui/` | `src/shared/components/ui/` |
| Site-wide nav/layout components | `src/shared/components/` |
| `src/hooks/useLichessSync.ts` | `features/lichess/hooks/` |
| `src/hooks/useStockfish.ts` | `features/chess/hooks/` |
| `src/hooks/useExport.ts` | `features/admin/hooks/` |
| `src/hooks/usePagination.ts` | `src/shared/hooks/` |
| `src/hooks/useTableFilters.ts` | `src/shared/hooks/` |

---

## tsconfig.json — Add Path Aliases

After creating `src/features/` and `src/shared/`, add to `tsconfig.json` `paths`:

```json
"@/features/*": ["./src/features/*"],
"@/shared/*": ["./src/shared/*"]
```

The existing `@/*` → `./src/*` alias continues to work for everything during the migration.

---

## What This Plan Deliberately Does NOT Include

- **Monorepo / Turborepo** — not warranted at this scale. One app, one deployment.
- **TanStack Query** — RSC + Server Actions is the right caching layer. Client data fetching is minimal and well-handled by existing hooks. The sidebar fix (Phase 3) removes the main pain point without adding a dependency.
- **Zustand** — no cross-component state-sharing problem exists. Sidebar collapse is local; user data is server-driven.
- **XState for lesson state machines** — current imperative approach works. Add only if lesson viewer logic becomes significantly more complex.
- **Supabase generated types** — worthwhile eventually but a separate task.

---

## Phase Ordering Summary

| Phase | Task | Est. Time | Risk |
|-------|------|-----------|------|
| 1 | Remove `'use server'` from services, create `progressActions.ts` | 1h | Low |
| 2 | Extract `computeLessonPoints` to `pointsFormula.ts` | 30m | Low |
| 3 | Fix `AcademySidebar` to receive props from server layout | 2h | Medium |
| 4a | Admin server-actions → feature actions | 3h | Low |
| 4b–4f | Auth, rankings, tournaments, user, forms actions | 3h | Low |
| 5 | Move services + repositories | 3–4h | Medium |
| 6 | API route audit + convert blog mutations | 2h | Medium |
| 7 | Move lib files | 1h | Low |
| 8 | Move components + hooks | 2h | Low |

Each phase leaves the app in a compiling, working state. Do not proceed to the next phase until the current one builds cleanly (`npm run build` zero errors).

---

## Verification Checklist (After Each Phase)

1. `npm run build` — must complete with zero errors
2. Start dev server and exercise the affected feature
3. **Phase 1 specifically:** Complete a lesson as a student and verify points are still awarded
4. **Phase 3 specifically:** Navigate to academy pages and confirm sidebar renders without a flash of unauthenticated state
5. **Phase 6 specifically:** Use admin blog UI to create/edit a category and tag via the converted Server Actions

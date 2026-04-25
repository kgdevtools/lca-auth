# Lesson Builder Revamp - Task Phases

> Phased implementation plan based on LESSON_BUILDER_REVAMP.md requirements

---

## Phase 1: Foundation & Infrastructure

### 1.1 Database & Schema ✅ DONE
- [x] Update `lessons` table - add `blocks` column (JSONB) to store block data
- [x] Create database migration for new schema (`supabase/migrations/20260327_lesson_builder_revamp.sql`)
- [x] Add RLS policies for coaches/students
- [x] Created `lichess_puzzles` table

### 1.2 Core Libraries ✅ DONE
- [x] Create `src/lib/constants/lessonBlocks.ts` - Block type enums
- [x] Create `src/lib/blockRegistry.ts` - Block registry map
- [x] Create `src/lib/pgnParser.ts` - PGN/FEN parsing utility
- [x] Create `src/lib/lessonSchema.ts` - Zod validation schemas

### 1.3 Repository Layer ✅ DONE
- [x] Create `src/repositories/lesson/lessonRepository.ts` - DB operations
- [x] Create `src/repositories/lesson/blockRepository.ts` - Block CRUD

### 1.4 Service Layer ✅ DONE
- [x] Create `src/services/lesson/lessonService.ts` - Business logic
- [x] Create `src/services/lesson/blockService.ts` - Block operations

---

## Phase 2: Builder UI (Coach Side)

### 2.1 Layout & Shell ✅ DONE
- [x] Create `src/app/academy/lesson/add/page.tsx` - Lesson builder entry

### 2.2 Editor Components ✅ DONE
- [x] StudyEditorBoard component for PGN/chapter editing
- [x] Board with piece manipulation
- [x] Chapter management (add, edit, delete)
- [x] PGN parsing and display

---

## Phase 3: Viewer UI (Student Side)

### 3.1 Layout & Shell ✅ DONE
- [x] Create `src/app/academy/lesson/[lessonId]/page.tsx` - RSC entry
- [x] Create `src/app/academy/lesson/[lessonId]/_components/LessonViewerShell.tsx`
- [x] Create `src/app/academy/lesson/[lessonId]/_components/BlockProgressDots.tsx`
- [x] Create `src/app/academy/lesson/[lessonId]/_components/LessonCompleteScreen.tsx`

### 3.2 Viewer Blocks ✅ DONE
- [x] PuzzleViewerBlock
- [x] StudyViewerBlock with:
  - Inline PGN display with horizontal wrap
  - Text comments inline after moves
  - NAG annotations on moves
  - Square clicking for highlighting
  - Last move highlighting (orange)
  - PGN move highlights (yellow)
  - Chapter dropdown selector
  - Move navigation controls
  - Auto-scroll to active move

---

## Study Lesson Implementation (Academy /academy/lesson/add)

### Core Files Updated/Created

**PGN Parser (`src/lib/pgnParser.ts`)**
- Added `nag` field to `ParsedPgnMove` - extracts NAG annotations like `!?`, `!!`, `??`
- Added `parsePgnStudy()` function - parses multi-chapter Lichess studies
- Added `ParsedPgnStudy` interface with `chapters[]` and `studyName`
- Fixed regex error with arrow/highlight parsing
- Added comment preservation with Lichess annotation format

**Block Registry (`src/lib/constants/lessonBlocks.ts`)**
- Added `STUDY` block type to `BLOCK_TYPES`
- Added `study` default data to `DEFAULT_BLOCK_DATA`

**Block Registry (`src/lib/blockRegistry.ts`)**
- Added `BLOCK_TYPES.STUDY` definition

**Lesson Schema (`src/lib/lessonSchema.ts`)**
- Added `studyBlockDataSchema` with chapters and displaySettings

### Editor Component (`src/components/lessons/StudyEditorBoard.tsx`)

**Features Implemented:**
- Board syncs with PGN moves in real-time
- Drag and drop piece manipulation
- Click to place pieces
- Square highlighting (draw mode)
- Arrow drawing between squares (draw mode)
- Flip board orientation
- Move navigation with clickable move buttons
- NAG display on moves (e.g., `Nf3!?`)
- Chapters as collapsible dropdown with Add button
- Display settings integrated into chapter form (Eval, Clocks, Arrows, Highlights)
- Editable PGN textarea for selected chapter

### Academy Add Page (`src/app/academy/lesson/add/page.tsx`)

- Success message component after lesson creation
- Links to view created lesson
- Clears form after successful creation
- Uses content_type: 'block'

---

## Session Updates (April 2026)

### Route Consolidation
- **Removed duplicate `/user/lesson` route** - consolidated all lesson functionality to `/academy/lesson`
- Deleted entire `/user/lesson/` folder (was duplicate of academy)
- Updated all references from `/user/lessons` → `/academy/lessons`
- Updated all references from `/user/lesson/[id]` → `/academy/lesson/[id]`
- Updated service files: `lessonActions.ts`, `lessonService.ts`, `academy/lesson/add/actions.ts`

### Study Viewer Block Updates (`/academy/lesson/[id]`)
- Created new StudyViewerBlock with enhanced features:
  - Inline PGN display with horizontal wrap (like /view page)
  - Text comments displayed inline after moves (amber italic text)
  - NAG annotations displayed on moves (e.g., `Nf3!?`)
  - Square clicking for custom highlighting (toggle on/off)
  - Last move highlighting (orange on from/to squares)
  - PGN move highlights (yellow)
  - Chapter dropdown selector
  - Reduced padding/margins
  - Board at 58% width, PGN section at 42%
  - Progress dots moved below board (removed from sidebar)
  - Previous/Finish buttons inline with progress dots

- Updated LessonViewerShell.tsx:
  - Added StudyViewerBlock import
  - Added block type check for 'study'
  - Removed sidebar for progress dots
  - Reduced padding from py-8 to py-4
  - Updated back links to /academy/lessons

- Updated BlockProgressDots.tsx:
  - Removed blue dot styling
  - Amber for current, green for completed

### Lesson Creation Success Flow
- Added success message component (green banner)
- Shows "View Study" link to created lesson
- Clears form after successful creation (chapters, inputs, selections)
- Links to `/academy/lesson/[id]`

### Database
- Added 'study' to content_type_check constraint (for future use)
- Currently using 'block' as content_type for study lessons

### Navbar Refactor Attempt (REVERTED)
- Created new unified Navbar component at `/src/components/navbar/Navbar.tsx`
- Attempted structure:
  - Logo + Dashboard + Learn dropdown (Tournaments, Events, Rankings, Blog) + Games
  - Right side: Theme toggle + User dropdown with profile links + Login/Join buttons
  - Mobile: Hamburger menu with slide-down drawer
  - Hidden on /academy, /user, /admin routes
- **ISSUE**: Navbar rendered nothing - component was not displaying
- **REVERTED**: Restored original inline navbar in layout.tsx

### UI Fixes (Reverted)
- Academy layout: reverted to h-screen overflow-hidden
- StudyEditorBoard: reverted to original width patterns
- Lesson add page: reverted min-height and padding

---

## Known Issues

- `/user/lesson` route no longer exists but phantom LSP errors still showing

---

## Student Lesson Assignment (April 2026)

### Feature: Assign lessons to students

Coaches/admins can now assign students to lessons via a multi-select dropdown on the add lesson page. Students can only see and access lessons assigned to them.

### Database Migration (`supabase/migrations/20260401_lesson_students.sql`)
- Created `lesson_students` junction table
  - `lesson_id` → `lessons.id` (CASCADE delete)
  - `student_id` → `profiles.id` (CASCADE delete)
  - `assigned_at`, `assigned_by`
  - Unique constraint on `(lesson_id, student_id)`
- RLS policies:
  - Coaches/admins: SELECT, INSERT, DELETE on `lesson_students`
  - Students: SELECT on own assignments
  - Students: SELECT on `lessons` where assigned via `lesson_students`

### Repository (`src/repositories/lesson/lessonRepository.ts`)
- `getLessonsAssignedToStudent(studentId)` - fetches lessons via `lesson_students` join
- `assignStudentsToLesson(lessonId, studentIds, assignedBy)` - upserts assignments
- `isLessonAssignedToStudent(lessonId, studentId)` - checks assignment exists
- `getStudentsForDropdown()` - fetches all profiles with role='student'

### Server Actions (`src/app/academy/lesson/add/actions.ts`)
- `fetchStudentsForAssignment()` - calls `getStudentsForDropdown()` (coach role required)
- `createPuzzleLesson()` - added `studentIds[]` param, assigns after creation
- `createStudyLesson()` - added `studentIds[]` param, assigns after creation

### Add Lesson Page (`src/app/academy/lesson/add/page.tsx`)
- Added `StudentMultiSelect` component:
  - Searchable popover using `Command` + `Popover` from shadcn
  - Plain `div` items with `onMouseDown` to prevent popover close on select
  - Selected students shown as `Badge` components with remove button
- Fetches students on mount via `fetchStudentsForAssignment()`
- Passes `selectedStudentIds` to both puzzle and study creation flows

### Lessons List Page (`src/app/academy/lesson/page.tsx`)
- Removed student redirect to `/user/overview`
- Students see only lessons assigned to them (via `getLessonsAssignedToStudent`)
- Role-based page titles and descriptions
- "Add Lesson" button hidden for students
- Edit/delete buttons hidden for students (`showActions={false}`)

### Lesson Viewer (`src/app/academy/lesson/[lessonId]/page.tsx`)
- Students can only view lessons where `isLessonAssignedToStudent()` returns true
- Unassigned lessons redirect to `/academy/lesson`
- Coach/admin can still view all lessons (published and draft)

### LessonCard (`src/components/lessons/LessonCard.tsx`)
- Added `showActions` prop (default `true`)
- Edit/delete buttons conditionally rendered based on prop
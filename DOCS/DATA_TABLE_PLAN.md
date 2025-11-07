# Data Tables Implementation Plan - Admin Dashboard

## Executive Summary

This plan outlines the implementation of comprehensive data tables for the admin dashboard with export functionality (CSV, Excel), pagination for large datasets, and future CRUD operation support.

## Current Architecture Analysis

### Tech Stack
- **Framework**: Next.js 15.4.4 with React 19
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Excel Export**: xlsx library (v0.18.5)
- **Data Fetching**: Server Actions pattern

### Existing Patterns

#### 1. Component Structure
- **Location**: `src/app/admin/admin-dashboard/[feature]/components/`
- **Pattern**: Client components with `"use client"` directive
- **State Management**: React hooks (useState, useEffect)
- **Reference**: `TournamentRegistrationsTable.tsx`, `TournamentsTable.tsx`, `PlayersTable.tsx`

#### 2. Data Fetching Pattern
- **Location**: `src/app/admin/admin-dashboard/[feature]/server-actions.ts`
- **Pattern**: Server actions using Supabase client
- **Error Handling**: Try-catch with error objects `{ data, error }`
- **Reference**: `src/app/admin/admin-dashboard/server-actions.ts`

```typescript
// Pattern Example
export async function getData() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('table').select('*')
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: 'Unexpected error occurred' }
  }
}
```

#### 3. Export Pattern
- **Service**: `src/services/exportToExcel.ts`
- **Pattern**:
  1. Map data to Excel-friendly format
  2. Use xlsx library to create workbook
  3. Return Buffer/Uint8Array
  4. Client creates Blob and triggers download
- **Reference**: `exportRegistrationsToExcel()` function

#### 4. Pagination Pattern
- **Implementation**: Server-side pagination with `.range(from, to)`
- **UI**: Custom pagination component with page numbers
- **Reference**: `TournamentsTable.tsx` (lines 213-244)

#### 5. Loading States
- **Pattern**: Skeleton loaders with `animate-pulse`
- **Error States**: Error message with retry button
- **Empty States**: Centered message in table

## Tables to Implement

### 1. Active Players Table (HIGH PRIORITY - Large Dataset)
**Table**: `active_players_august_2025_profiles`
**Estimated Rows**: ~5,000
**Special Considerations**: Requires pagination and load button

**Schema Highlights**:
- Player identification: UNIQUE_NO, SURNAME, FIRSTNAME, name
- Chess data: RATING, TITLE, FED, player_rating
- Performance: performance_rating, confidence, classifications
- Tournament linkage: tournament_id, tournament_name
- Metadata: created_at

**Key Features**:
- Default: Load first 100 rows with pagination
- "Load More" button to increase page size
- Search/filter by name, federation, rating range
- Export current view vs. full dataset option

### 2. Tournaments Table (ALREADY EXISTS - Enhancement)
**Table**: `tournaments`
**Current Status**: Implemented in `src/app/admin/admin-dashboard/tournaments/TournamentsTable.tsx`

**Enhancements Needed**:
- Add CSV export functionality
- Add Excel export functionality
- Enhance existing pagination

### 3. Players Table (Enhancement Required)
**Table**: `players`
**Current Status**: Different implementation in `src/app/admin/admin-dashboard/players/components/PlayersTable.tsx` (focused on reconciliation)

**New Implementation**:
- General players view with tournament linkage
- Foreign key: tournament_id → tournaments(id)
- JSONB fields: rounds, tie_breaks
- Pagination required

### 4. Profiles Table
**Table**: `profiles`
**Estimated Rows**: Moderate (user accounts)

**Schema Highlights**:
- User data: full_name, avatar_url, role
- Chess data: tournament_fullname, chessa_id
- Authentication: id (links to auth.users)
- Role constraint: student, coach, admin

**Key Features**:
- Role-based filtering
- User management capabilities
- Avatar preview in table

### 5. Player Registrations Table (ALREADY EXISTS - Enhancement)
**Table**: `playerRegistrations`
**Current Status**: Implemented as `lca_open_2025_registrations` in `TournamentRegistrationsTable.tsx`

**Enhancements Needed**:
- Add CSV export (currently only Excel)
- Add download/print view
- Already has: Excel export, edit, delete

## Implementation Plan

### Phase 0: Security Fix (Day 1) 🔴 CRITICAL

#### 0.1 Create Admin Layout with Role Check
**File**: `src/app/admin/layout.tsx` (NEW)
**Priority**: HIGHEST - Security vulnerability

**Implementation**:
```typescript
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectedFrom=/admin')
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/?error=unauthorized')
  }

  return <>{children}</>
}
```

#### 0.2 Create Admin Authorization Utility
**File**: `src/utils/auth/adminAuth.ts` (NEW)

**Implementation**:
```typescript
'use server'

import { createClient } from '@/utils/supabase/server'

export async function checkAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  return { user, profile }
}
```

#### 0.3 Update Existing Server Actions
**Files to update**:
- `src/app/admin/admin-dashboard/server-actions.ts`
- `src/app/admin/admin-dashboard/players/server-actions.ts`
- `src/app/admin/admin-dashboard/performance/server-actions.ts`

**Add to beginning of sensitive actions**:
```typescript
import { checkAdminRole } from '@/utils/auth/adminAuth'

export async function deleteSomething(id: string) {
  try {
    await checkAdminRole() // ✅ Verify admin first

    // ... rest of implementation
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Install Dependencies
**Required**:
```bash
npm install @tanstack/react-virtual
```

**Verify existing**:
- xlsx ✅ (already installed v0.18.5)
- lucide-react ✅
- All shadcn/ui components ✅

#### 1.2 Export Service Enhancement
**File**: `src/services/exportService.ts` (NEW)

**Features**:
```typescript
// Generic export functions
export function exportToCSV(data: any[], filename: string, options?: ExportOptions): void
export function exportToExcel(data: any[], sheetName: string, filename: string, options?: ExportOptions): Buffer
export function exportToJSON(data: any[], filename: string, options?: ExportOptions): void
export function prepareDataForExport(data: any[], excludeFields?: string[]): any[]

interface ExportOptions {
  excludeFields?: string[]
  fieldMapping?: Record<string, string>
  includeMetadata?: boolean // For JSON exports
}
```

**Why New File?**:
- Consolidate all export logic
- Reusable across all tables
- Keep `exportToExcel.ts` for backward compatibility

#### 1.2 Data Table Base Component
**File**: `src/components/admin/DataTable.tsx` (NEW)

**Features**:
- Generic table component with TypeScript generics
- Built-in pagination controls
- Search/filter capabilities
- Export toolbar (CSV, Excel, JSON)
- Loading, error, and empty states
- Responsive design (mobile-friendly)

**Props Interface**:
```typescript
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  isLoading?: boolean
  error?: string | null
  pagination?: PaginationConfig
  searchable?: boolean
  exportable?: boolean
  exportFilename?: string
  onRefresh?: () => void
}
```

#### 1.3 Pagination Hook
**File**: `src/hooks/usePagination.ts` (NEW)

**Features**:
- Client-side and server-side pagination support
- Dynamic page size adjustment
- Page navigation helpers
- Loading state management

### Phase 2: Table Implementations (Week 2-3)

#### 2.1 Active Players Table
**Files**:
- `src/app/admin/admin-dashboard/active-players/page.tsx`
- `src/app/admin/admin-dashboard/active-players/components/ActivePlayersTable.tsx`
- `src/app/admin/admin-dashboard/active-players/server-actions.ts`

**Implementation Details**:

**Server Actions**:
```typescript
// Get active players with pagination
export async function getActivePlayers(
  page: number = 1,
  itemsPerPage: number = 100,
  search?: string,
  filters?: {
    minRating?: number,
    maxRating?: number,
    federation?: string,
    tournament?: string
  }
)

// Get total count for pagination
export async function getActivePlayersCount(filters?: any)

// Export functionality
export async function exportActivePlayersToExcel(filters?: any)
export async function exportActivePlayersToCSV(filters?: any)
```

**Component Features**:
- Default load: 100 rows
- Load controls: [100, 250, 500, 1000, All]
- Search by name (indexed field)
- Filter by: federation, rating range, tournament
- Export options:
  - Current page only
  - Filtered results
  - Full dataset (with confirmation for 5000 rows)
- Column sorting
- Performance rating highlighting (color-coded)

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Active Players                          [Search...    ] │
│                                                          │
│ Filters: [Federation▼] [Rating: __ to __] [Clear]      │
│                                                          │
│ Showing 1-100 of 5,000 | Load: [100▼] [Load More]      │
│                                                          │
│ Actions: [📊 Export Excel] [📄 Export CSV] [🔄 Refresh] │
├─────────────────────────────────────────────────────────┤
│ Name          │ Rating │ Federation │ Performance │... │
├─────────────────────────────────────────────────────────┤
│ [Table Data]                                            │
└─────────────────────────────────────────────────────────┘
│ ◄ Previous | 1 2 3 ... 50 | Next ►                    │
└─────────────────────────────────────────────────────────┘
```

#### 2.2 General Players Table
**Files**:
- `src/app/admin/admin-dashboard/all-players/page.tsx`
- `src/app/admin/admin-dashboard/all-players/components/AllPlayersTable.tsx`
- `src/app/admin/admin-dashboard/all-players/server-actions.ts`

**Implementation Details**:

**Server Actions**:
```typescript
export async function getAllPlayers(page: number, itemsPerPage: number, search?: string)
export async function getPlayersByTournament(tournamentId: string)
export async function exportPlayersToExcel()
export async function exportPlayersToCSV()
```

**Component Features**:
- Tournament grouping option
- Tie-breaks JSON display (formatted)
- Rounds visualization
- Points and ranking display
- Export by tournament or all

#### 2.3 Profiles Table
**Files**:
- `src/app/admin/admin-dashboard/profiles/page.tsx`
- `src/app/admin/admin-dashboard/profiles/components/ProfilesTable.tsx`
- `src/app/admin/admin-dashboard/profiles/server-actions.ts`

**Implementation Details**:

**Server Actions**:
```typescript
export async function getProfiles(page: number, itemsPerPage: number, role?: string)
export async function updateProfile(id: string, updates: Partial<Profile>)
export async function deleteProfile(id: string)
export async function exportProfilesToExcel()
export async function exportProfilesToCSV()
```

**Component Features**:
- Avatar preview column
- Role badges (student/coach/admin)
- Role filtering dropdown
- Edit inline or modal
- Delete with cascade warning
- Export with role filter

#### 2.4 Enhanced Tournament Registrations Table
**Files** (Existing - Enhancement):
- `src/app/admin/admin-dashboard/components/TournamentRegistrationsTable.tsx`

**Enhancements**:
```typescript
// Add to server-actions.ts
export async function exportRegistrationsToCSV()
```

**New Features**:
- CSV export button alongside Excel
- Print-friendly view
- Section filtering (A, B, C)
- Bulk operations (future: bulk delete, bulk edit)

#### 2.5 Enhanced Tournaments Table
**Files** (Existing - Enhancement):
- `src/app/admin/admin-dashboard/tournaments/TournamentsTable.tsx`

**Enhancements**:
```typescript
// Add to server-actions.ts
export async function exportTournamentsToExcel()
export async function exportTournamentsToCSV()
```

**New Features**:
- Excel export
- CSV export
- Date range filtering
- Location filtering
- Players count per tournament

### Phase 3: Export Functionality (Week 3)

#### 3.1 CSV Export Implementation
**File**: `src/services/exportService.ts`

**Function**:
```typescript
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string> // Rename fields
    dateFormat?: string
  }
): void {
  // 1. Prepare data (exclude IDs, format dates)
  // 2. Convert to CSV string
  // 3. Create Blob
  // 4. Trigger download
}
```

**CSV Format**:
- UTF-8 encoding with BOM for Excel compatibility
- Proper escaping of commas and quotes
- Date formatting: ISO 8601 or custom
- Null handling: empty string or "N/A"

#### 3.2 JSON Export Implementation
**File**: `src/services/exportService.ts`

**Function**:
```typescript
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
    includeMetadata?: boolean
    pretty?: boolean
  }
): void {
  // 1. Prepare data (exclude IDs)
  // 2. Optionally add metadata
  // 3. Convert to JSON string
  // 4. Create Blob
  // 5. Trigger download
}
```

**JSON Format**:
```json
{
  "metadata": {
    "exportedAt": "2025-11-07T10:30:00Z",
    "totalRecords": 5000,
    "source": "Limpopo Chess Academy Admin Dashboard",
    "version": "1.0"
  },
  "data": [
    {
      "name": "Player Name",
      "rating": 1500,
      // ... fields
    }
  ]
}
```

**Features**:
- Pretty print option (2-space indent)
- Metadata section (optional)
- Proper date serialization
- MIME type: `application/json`

#### 3.3 Excel Export Enhancement
**File**: `src/services/exportService.ts`

**Generic Function**:
```typescript
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  sheetName: string,
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
    autoWidth?: boolean
    headerStyle?: boolean
  }
): Buffer {
  // 1. Prepare data
  // 2. Create workbook with xlsx
  // 3. Apply styling
  // 4. Auto-size columns
  // 5. Return buffer
}
```

**Features**:
- Column auto-sizing
- Header row styling (bold, background color)
- Frozen header row
- Date formatting
- Number formatting for ratings

#### 3.4 Export Confirmation Modal
**File**: `src/components/admin/ExportModal.tsx` (NEW)

**Purpose**: Confirm large exports and provide options

**Features**:
- Export format selection: 📊 Excel | 📄 CSV | 🔧 JSON
- Export scope:
  - Current page only (100 rows)
  - Filtered results (X rows)
  - All data (Y rows - show warning if > 5000)
- Field selection (checkboxes for columns to include/exclude)
- JSON-specific options:
  - Pretty print toggle
  - Include metadata toggle
- Progress indicator for large exports (> 1000 rows)
- Cancel option
- Preview first 5 rows (optional)

**UI Example**:
```
┌─────────────────────────────────────────┐
│ Export Active Players Data              │
├─────────────────────────────────────────┤
│ Format: ○ CSV  ● Excel  ○ JSON          │
│                                          │
│ Scope:  ○ Current page (100 rows)       │
│         ● Filtered results (1,234 rows) │
│         ○ All data (5,000 rows) ⚠️      │
│                                          │
│ ☑️ Exclude internal IDs                 │
│ ☑️ Format dates as readable             │
│ ☐ Include metadata (JSON only)          │
│                                          │
│ [Cancel]  [Export (1,234 rows)]         │
└─────────────────────────────────────────┘
```

### Phase 4: Load Management for Large Tables (Week 4)

#### 4.1 Progressive Loading Component
**File**: `src/components/admin/ProgressiveTable.tsx` (NEW)

**Features**:
- Initial load: First page (100 rows)
- Load More button
- Infinite scroll option (toggle)
- Performance monitoring
- Virtual scrolling for very large datasets

#### 4.2 Data Virtualization
**Library**: Consider `react-virtual` or `@tanstack/react-virtual` (NEW DEPENDENCY)

**Use Case**: Active Players Table with 5000+ rows

**Implementation**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// Only render visible rows
// Smooth scrolling performance
// Memory efficient
```

**Note**: Add to package.json if needed

### Phase 5: Future CRUD Operations (Not Implemented Yet - Planning)

#### 5.1 Edit Operations
**Pattern** (Already exists in TournamentRegistrationsTable):
- Inline editing with state management
- Save/Cancel buttons
- Validation before save
- Optimistic UI updates
- Error handling with rollback

#### 5.2 Delete Operations
**Pattern** (Already exists in multiple tables):
- Confirmation dialog
- Cascade warning for foreign keys
- Soft delete option (add `deleted_at` column)
- Undo functionality (30 seconds window)

#### 5.3 Bulk Operations (Future)
**Features**:
- Row selection checkboxes
- Bulk delete
- Bulk export
- Bulk update (e.g., change tournament for multiple players)

#### 5.4 Real-time Updates (Future)
**Technology**: Supabase Realtime subscriptions
**Use Case**: See registrations appear in real-time
**Implementation**: Subscribe to table changes in useEffect

## File Structure

```
src/
├── app/
│   └── admin/
│       └── admin-dashboard/
│           ├── page.tsx (Dashboard overview)
│           ├── server-actions.ts (Shared actions)
│           │
│           ├── active-players/
│           │   ├── page.tsx
│           │   ├── server-actions.ts
│           │   └── components/
│           │       └── ActivePlayersTable.tsx
│           │
│           ├── all-players/
│           │   ├── page.tsx
│           │   ├── server-actions.ts
│           │   └── components/
│           │       └── AllPlayersTable.tsx
│           │
│           ├── profiles/
│           │   ├── page.tsx
│           │   ├── server-actions.ts
│           │   └── components/
│           │       └── ProfilesTable.tsx
│           │
│           ├── tournaments/ (Existing - Enhance)
│           │   ├── page.tsx
│           │   ├── TournamentsTable.tsx
│           │   └── TournamentFormModal.tsx
│           │
│           └── components/ (Existing - Enhance)
│               ├── TournamentRegistrationsTable.tsx
│               ├── DashboardOverview.tsx
│               └── DashboardSidebar.tsx
│
├── components/
│   ├── admin/ (NEW)
│   │   ├── DataTable.tsx (Generic table component)
│   │   ├── ExportModal.tsx (Export confirmation)
│   │   ├── ProgressiveTable.tsx (Load more functionality)
│   │   └── TableFilters.tsx (Reusable filter components)
│   │
│   └── ui/ (Existing shadcn components)
│       ├── table.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
│
├── services/
│   ├── exportToExcel.ts (Existing - Keep for compatibility)
│   └── exportService.ts (NEW - Generic export utilities)
│
├── hooks/
│   ├── usePagination.ts (NEW)
│   ├── useTableFilters.ts (NEW)
│   └── useExport.ts (NEW)
│
└── types/
    └── admin.ts (NEW - TypeScript interfaces for admin tables)
```

## Technical Specifications

### 1. TypeScript Interfaces
**File**: `src/types/admin.ts` (NEW)

```typescript
// Active Players
export interface ActivePlayer {
  UNIQUE_NO: string | null
  SURNAME: string | null
  FIRSTNAME: string | null
  BDATE: string | null
  SEX: string | null
  TITLE: string | null
  RATING: string | null
  FED: string | null
  name: string | null
  player_rating: string | null
  tie_breaks: string | null
  performance_rating: string | null
  confidence: string | null
  classifications: string | null
  tournament_id: string | null
  tournament_name: string | null
  created_at: string | null
}

// Tournaments
export interface Tournament {
  id: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  tournament_director: string | null
  chief_arbiter: string | null
  deputy_chief_arbiter: string | null
  arbiter: string | null
  time_control: string | null
  rate_of_play: string | null
  location: string | null
  rounds: number | null
  tournament_type: string | null
  rating_calculation: string | null
  date: string | null
  average_elo: number | null
  average_age: number | null
  source: string | null
  created_at: string
}

// Players
export interface Player {
  id: string
  tournament_id: string | null
  rank: number | null
  name: string | null
  federation: string | null
  rating: number | null
  points: number | null
  rounds: Record<string, any> | null
  tie_breaks: Record<string, any> | null
  created_at: string
}

// Profiles
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'coach' | 'admin'
  created_at: string
  tournament_fullname: string | null
  chessa_id: string | null
}

// Player Registrations
export interface PlayerRegistration {
  id: number
  created_at: string
  data_entry: Record<string, any> | null
}

// Generic table response
export interface TableResponse<T> {
  data: T[] | null
  error: string | null
  count?: number
  totalPages?: number
}

// Pagination config
export interface PaginationConfig {
  page: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (items: number) => void
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'excel' | 'json'
  scope: 'current' | 'filtered' | 'all'
  excludeFields?: string[]
  filename?: string
}
```

### 2. Server Actions Pattern
**Standard Structure**:
```typescript
'use server'

import { createClient } from '@/utils/supabase/server'

export async function getTableData(
  page: number = 1,
  itemsPerPage: number = 10,
  search?: string
) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('table_name')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('search_field', `%${search}%`)
    }

    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error:', error)
      return { data: null, error: error.message, count: 0, totalPages: 0 }
    }

    return {
      data,
      error: null,
      count: count || 0,
      totalPages: count ? Math.ceil(count / itemsPerPage) : 0
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { data: null, error: 'Unexpected error occurred', count: 0, totalPages: 0 }
  }
}
```

### 3. Export Service Implementation
**CSV Export**:
```typescript
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
  } = {}
): void {
  // Prepare headers
  const sampleRow = data[0]
  const fields = Object.keys(sampleRow).filter(
    field => !options.excludeFields?.includes(field)
  )

  // Map field names
  const headers = fields.map(
    field => options.fieldMapping?.[field] || field
  )

  // Build CSV
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      fields.map(field => {
        const value = row[field]
        if (value === null || value === undefined) return ''
        // Escape commas and quotes
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ]

  const csvContent = '\uFEFF' + csvRows.join('\n') // BOM for Excel

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

### 4. Pagination Hook
**File**: `src/hooks/usePagination.ts`
```typescript
import { useState, useCallback } from 'react'

interface UsePaginationProps {
  initialPage?: number
  initialItemsPerPage?: number
  totalItems: number
}

export function usePagination({
  initialPage = 1,
  initialItemsPerPage = 10,
  totalItems
}: UsePaginationProps) {
  const [page, setPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const nextPage = useCallback(() => {
    setPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(prev - 1, 1))
  }, [])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)))
  }, [totalPages])

  const changeItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setPage(1) // Reset to first page
  }, [])

  return {
    page,
    itemsPerPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    changeItemsPerPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }
}
```

## Performance Considerations

### 1. Database Optimization
- **Indexes**: Already exist on key fields (active_players_name, tournaments_query_optimization, etc.)
- **Query Optimization**:
  - Use `.select()` to only fetch needed columns
  - Limit initial loads to 100 rows
  - Use `.range()` for efficient pagination
- **Caching**: Consider Redis for frequently accessed data (future)

### 2. Client-Side Performance
- **Virtual Scrolling**: For tables with 1000+ rows
- **Debounced Search**: Wait 300ms before searching
- **Memoization**: Use React.memo for table rows
- **Code Splitting**: Lazy load table components
- **Bundle Size**: xlsx library is ~300KB, ensure proper tree-shaking

### 3. Export Performance
- **Large Exports**: Show progress indicator
- **Streaming**: For exports > 10,000 rows (future)
- **Background Jobs**: Consider server-side export for massive datasets (future)
- **Client-Side Limits**: Warn if export > 10,000 rows

## Security Considerations

### 1. Authorization
- **Row-Level Security**: Supabase RLS policies
- **Role-Based Access**: Admin-only routes
- **Server Actions**: Verify user role before data access

### 2. Data Sanitization
- **Export**: Exclude sensitive fields (IDs, internal metadata)
- **SQL Injection**: Parameterized queries (Supabase handles this)
- **XSS**: React escapes by default, but be careful with JSONB rendering

### 3. Rate Limiting
- **Export Frequency**: Limit to 10 exports per minute per user
- **Large Queries**: Monitor and log expensive queries

## Testing Strategy

### 1. Unit Tests
- Export functions (CSV, Excel)
- Pagination hook
- Data transformation utilities

### 2. Integration Tests
- Server actions with mocked Supabase
- Table component rendering
- Export flow end-to-end

### 3. Performance Tests
- Load 5000 rows and measure render time
- Export 5000 rows and measure time
- Pagination speed test

### 4. Manual Testing Checklist
- [ ] All tables load correctly
- [ ] Pagination works forward and backward
- [ ] Search filters results
- [ ] CSV export downloads correctly
- [ ] Excel export opens in Excel/LibreOffice
- [ ] Large dataset (5000 rows) exports without crashing
- [ ] Edit functionality works (existing tables)
- [ ] Delete functionality works (existing tables)
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Loading states display correctly
- [ ] Error states display correctly

## Migration Path

### Step 0: Security Fix (Day 1) 🔴 CRITICAL
1. Create `src/app/admin/layout.tsx` with role check
2. Create `src/utils/auth/adminAuth.ts` with `checkAdminRole()`
3. Test: Try accessing /admin as non-admin user (should redirect)
4. Update existing server actions to include role checks for sensitive operations
5. Verify all admin routes are protected

### Step 1: Infrastructure (Day 2-3)
1. Install `@tanstack/react-virtual`: `npm install @tanstack/react-virtual`
2. Create `src/services/exportService.ts` with CSV, Excel, JSON functions
3. Create `src/hooks/usePagination.ts`
4. Create `src/types/admin.ts`
5. Test export functions with sample data (all three formats)

### Step 2: Active Players Table (Day 4-6)
1. Create directory structure
2. Implement server actions
3. Build table component
4. Add export functionality
5. Test with full 5000 rows
6. Optimize performance

### Step 3: Profiles Table (Day 7-8)
1. Similar to Step 2
2. Add role filtering
3. Add avatar preview

### Step 4: All Players Table (Day 9-10)
1. Similar to Step 2
2. Handle JSONB fields (rounds, tie_breaks)
3. Add tournament linkage

### Step 5: Enhance Existing Tables (Day 11-12)
1. Add CSV export to TournamentRegistrationsTable
2. Add JSON export to TournamentRegistrationsTable
3. Add Excel/CSV/JSON export to TournamentsTable
4. Test all enhanced features

### Step 6: Polish and Testing (Day 13-15)
1. Add loading skeletons
2. Error handling improvements
3. Mobile responsiveness
4. Dark mode testing
5. Performance optimization
6. Documentation

## Dependencies

### Current (Already Installed)
- `xlsx` (v0.18.5) - Excel export ✅
- `lucide-react` - Icons ✅
- `@radix-ui/*` - UI primitives ✅
- `tailwindcss` - Styling ✅

### New Dependencies Required
- `@tanstack/react-virtual` - Virtual scrolling for large tables ✅ REQUIRED
  - **Decision**: Implement virtual scrolling now for 5000+ row table
  - **Install**: `npm install @tanstack/react-virtual`
  - **Size**: ~20KB gzipped
  - **Use case**: Active Players Table

### No Additional Dependencies Needed
- CSV export: Implement natively ✅
- JSON export: Implement natively ✅
- Pagination: Custom hook ✅
- Filtering: Native React state ✅

## Dashboard Integration

### Navigation Menu
**File**: `src/app/admin/admin-dashboard/components/DashboardSidebar.tsx` (If using sidebar)

**Menu Items**:
```typescript
const menuItems = [
  { label: 'Overview', href: '/admin/admin-dashboard', icon: Home },
  { label: 'Tournaments', href: '/admin/admin-dashboard/tournaments', icon: Trophy },
  { label: 'Registrations', href: '/admin/admin-dashboard', icon: Users }, // Current page
  { label: 'Active Players', href: '/admin/admin-dashboard/active-players', icon: Star },
  { label: 'All Players', href: '/admin/admin-dashboard/all-players', icon: Users },
  { label: 'Profiles', href: '/admin/admin-dashboard/profiles', icon: UserCircle },
]
```

### Dashboard Overview Enhancement
**File**: `src/app/admin/admin-dashboard/components/DashboardOverview.tsx`

**Add Stats Cards**:
- Total Active Players (from active_players_august_2025_profiles)
- Total Tournaments (from tournaments)
- Total Players Across All Tournaments (from players)
- Total User Profiles (from profiles)

## Future Enhancements (Beyond Scope)

### 1. Advanced Filtering
- Multi-select filters
- Date range pickers
- Saved filter presets
- Filter by JSONB fields (tie_breaks, classifications)

### 2. Data Visualization
- Charts for rating distribution
- Tournament timeline
- Performance trends
- Geographic distribution (by federation)

### 3. Bulk Import
- CSV/Excel import for new data
- Validation before import
- Duplicate detection
- Preview before commit

### 4. Audit Logging
- Track all edits and deletes
- User attribution
- Rollback capability
- Compliance reporting

### 5. Real-time Collaboration
- See other admins viewing the same data
- Lock rows being edited
- Live updates when data changes

### 6. API Endpoints
- REST API for external access
- Rate limiting
- API key management
- Documentation with Swagger

## Conclusion

This plan provides a comprehensive roadmap for implementing data tables in the admin dashboard while adhering to the existing architecture and patterns. The phased approach ensures incremental value delivery and allows for adjustments based on feedback.

**Key Principles**:
1. Consistency with existing patterns
2. Performance optimization for large datasets
3. Reusable components and utilities
4. Type safety with TypeScript
5. User-friendly export functionality
6. Future-proof architecture for CRUD operations

**Estimated Timeline**: 3 weeks (15 working days)
**Developer Resources**: 1 developer
**Priority Order**:
1. 🔴 Security Fix (Day 1) - CRITICAL
2. Active Players Table (largest dataset)
3. Enhance existing tables
4. New tables (Profiles, All Players)

## Decisions Made

### 1. Virtual Scrolling
**Decision**: ✅ Implement now
- Will use `@tanstack/react-virtual` for Active Players table
- Install: `npm install @tanstack/react-virtual`

### 2. JSON Export
**Decision**: ✅ Yes, include JSON export
- Export formats: CSV, Excel, JSON
- JSON useful for data migration and API integration

### 3. ID Fields in Exports
**Decision**: ❌ Exclude all ID fields from exports
- Security: Don't expose internal IDs
- User-friendly: IDs not useful for end users
- Exception: Can include custom IDs like CHESSA_ID, tournament names (not UUIDs)

### 4. Delete Strategy
**Decision**: ⚖️ Mixed approach (use best judgment)
- **Hard Delete**: For data that should be permanently removed
  - Tournament registrations (after tournament is over)
  - Duplicate/test data
- **Soft Delete**: For critical data that may need recovery
  - Tournaments (users might want to restore)
  - Profiles (user account recovery)
  - Players data (preserve historical records)
- Implementation: Add `deleted_at` timestamp column where needed
- Admin UI: "Trash" view to restore soft-deleted items

### 5. Real-time Subscriptions
**Decision**: ❌ Not now, defer to future
- Focus on core functionality first
- Can add later without major refactoring
- Listed in "Future Enhancements" section

### 6. Role-Based Access
**Decision**: 🔒 Admin-only for now
- All data tables only accessible to admins
- Authorization pattern: `profile.role === 'admin'`
- Current pattern found in `src/app/layout.tsx` (lines 51-60)

## Authentication & Authorization Pattern

### Current Implementation
**Middleware** (`src/middleware.ts`):
```typescript
// Only checks if user is authenticated for /admin routes
if ((pathname.startsWith('/admin') || pathname.startsWith('/user')) && !user) {
  // Redirect to login
}
```

**Root Layout** (`src/app/layout.tsx:51-60`):
```typescript
// Fetch user role from profiles table
let isAdmin = false
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  isAdmin = profile?.role === 'admin'
}
```

### ⚠️ Security Gap Identified
**Issue**: Admin pages don't verify user role at page level
- Middleware only checks authentication, not authorization
- Any authenticated user can access `/admin` routes by typing the URL
- Role check only controls navigation link visibility

### 🔧 Fix Required: Admin Layout
**Create**: `src/app/admin/layout.tsx`

```typescript
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectedFrom=/admin')
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/?error=unauthorized')
  }

  return <>{children}</>
}
```

**Priority**: 🔴 HIGH - Implement this FIRST before any table work

### Authorization in Server Actions
**Pattern to use**:
```typescript
'use server'

import { createClient } from '@/utils/supabase/server'

async function checkAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  return user
}

export async function sensitiveAdminAction() {
  try {
    await checkAdminRole() // Verify admin role first

    // Proceed with admin action
    const supabase = await createClient()
    // ... rest of logic
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**Apply to**: All server actions in admin dashboard (delete, update, export)


---

## 📋 Executive Summary & Quick Start

### Final Decisions Recap

| Decision | Choice | Impact |
|----------|--------|--------|
| Virtual Scrolling | ✅ Implement Now | Better performance for 5000+ rows |
| JSON Export | ✅ Yes | CSV, Excel, JSON all supported |
| ID Fields in Exports | ❌ No | Exclude internal UUIDs for security |
| Delete Strategy | ⚖️ Mixed | Soft delete for critical data, hard delete otherwise |
| Real-time Updates | ❌ Defer | Focus on core functionality first |
| Access Control | 🔒 Admin Only | All tables restricted to admin role |

### Security Alert 🔴

**CRITICAL**: Current admin routes lack role-based authorization
- **Risk**: Any authenticated user can access `/admin` routes
- **Fix**: Implement `src/app/admin/layout.tsx` on Day 1
- **Status**: NOT IMPLEMENTED YET - HIGHEST PRIORITY

### Tables Implementation Status

| Table | Rows | Status | Priority | Features |
|-------|------|--------|----------|----------|
| `active_players_august_2025_profiles` | ~5,000 | 🔴 New | HIGH | Virtual scroll, 3 exports, pagination |
| `tournaments` | Moderate | 🟡 Enhance | MEDIUM | Add CSV/JSON exports |
| `players` | Moderate | 🔴 New | MEDIUM | JSONB handling, tournament links |
| `profiles` | Small | 🔴 New | LOW | Role filtering, avatar preview |
| `playerRegistrations` | Small | 🟡 Enhance | LOW | Add CSV/JSON exports |

### Implementation Timeline

```
Week 1: Security + Infrastructure
├─ Day 1: 🔴 Security fix (admin layout + auth utils)
├─ Day 2-3: Core infrastructure (export service, hooks, types)
└─ Install: @tanstack/react-virtual

Week 2: Tables Implementation
├─ Day 4-6: Active Players Table (largest dataset)
├─ Day 7-8: Profiles Table
└─ Day 9-10: All Players Table

Week 3: Enhancement + Polish
├─ Day 11-12: Enhance existing tables (Tournaments, Registrations)
└─ Day 13-15: Testing, polish, mobile responsiveness
```

### Quick Start Guide

#### Step 1: Security Fix (REQUIRED FIRST)
```bash
# Create admin layout
touch src/app/admin/layout.tsx

# Create auth utility
mkdir -p src/utils/auth
touch src/utils/auth/adminAuth.ts

# Test: Access /admin as non-admin user (should redirect)
```

#### Step 2: Install Dependencies
```bash
npm install @tanstack/react-virtual
```

#### Step 3: Create Infrastructure
```bash
# Export service
touch src/services/exportService.ts

# Hooks
mkdir -p src/hooks
touch src/hooks/usePagination.ts
touch src/hooks/useTableFilters.ts
touch src/hooks/useExport.ts

# Types
mkdir -p src/types
touch src/types/admin.ts

# Admin components
mkdir -p src/components/admin
touch src/components/admin/DataTable.tsx
touch src/components/admin/ExportModal.tsx
touch src/components/admin/ProgressiveTable.tsx
```

#### Step 4: Create Active Players Table
```bash
# Create directory structure
mkdir -p src/app/admin/admin-dashboard/active-players/components

# Create files
touch src/app/admin/admin-dashboard/active-players/page.tsx
touch src/app/admin/admin-dashboard/active-players/server-actions.ts
touch src/app/admin/admin-dashboard/active-players/components/ActivePlayersTable.tsx
```

### Export Functionality Summary

**Supported Formats**:
1. **CSV** - Universal compatibility, Excel-friendly
   - UTF-8 with BOM
   - Comma-escaped
   - Best for: Spreadsheet analysis

2. **Excel** - Professional reports
   - Styled headers
   - Auto-width columns
   - Best for: Presentations, reports

3. **JSON** - Data integration
   - Metadata included (optional)
   - Pretty print (optional)
   - Best for: API integration, backups

**ID Field Handling**:
- ❌ Internal UUIDs excluded
- ✅ Custom IDs included (e.g., CHESSA_ID)
- ✅ Human-readable identifiers kept

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Initial Load (100 rows) | < 500ms | Server-side pagination |
| Initial Load (5000 rows) | < 2s | Virtual scrolling |
| Export CSV (5000 rows) | < 3s | Native JS implementation |
| Export Excel (5000 rows) | < 5s | xlsx library, buffered |
| Export JSON (5000 rows) | < 2s | Native JSON.stringify |
| Search/Filter | < 300ms | Debounced input, indexed fields |

### File Structure Summary

```
src/
├── app/admin/
│   ├── layout.tsx                    # 🔴 NEW - Security layer
│   └── admin-dashboard/
│       ├── active-players/           # 🔴 NEW
│       ├── all-players/              # 🔴 NEW
│       ├── profiles/                 # 🔴 NEW
│       ├── tournaments/              # 🟡 ENHANCE
│       └── components/
│           └── TournamentRegistrationsTable.tsx  # 🟡 ENHANCE
│
├── components/admin/                 # 🔴 NEW
│   ├── DataTable.tsx
│   ├── ExportModal.tsx
│   └── ProgressiveTable.tsx
│
├── services/
│   ├── exportToExcel.ts             # ✅ EXISTS
│   └── exportService.ts              # 🔴 NEW
│
├── hooks/                            # 🔴 NEW
│   ├── usePagination.ts
│   ├── useTableFilters.ts
│   └── useExport.ts
│
├── types/
│   └── admin.ts                      # 🔴 NEW
│
└── utils/auth/
    └── adminAuth.ts                  # 🔴 NEW - Security
```

### Testing Checklist

Before considering implementation complete:

**Security Tests**:
- [ ] Non-admin users cannot access `/admin` routes
- [ ] Admin users can access all admin routes
- [ ] Server actions verify admin role
- [ ] Exports require admin role

**Functionality Tests**:
- [ ] All 5 tables load correctly
- [ ] Pagination works in both directions
- [ ] Search filters results accurately
- [ ] CSV export downloads and opens
- [ ] Excel export downloads and opens
- [ ] JSON export downloads and parses
- [ ] Large dataset (5000 rows) exports successfully
- [ ] Virtual scrolling performs smoothly

**UI/UX Tests**:
- [ ] Mobile responsive on all tables
- [ ] Dark mode works correctly
- [ ] Loading states display properly
- [ ] Error states display with retry options
- [ ] Empty states show helpful messages

**Performance Tests**:
- [ ] 100-row load < 500ms
- [ ] 5000-row load < 2s
- [ ] Export 5000 rows < 5s
- [ ] Search responds < 300ms

### Known Limitations & Future Work

**Current Limitations**:
1. No real-time updates (refresh required)
2. No bulk edit operations
3. No audit trail for changes
4. No data import functionality
5. No advanced filtering (multi-select, ranges)

**Planned Future Enhancements** (Beyond Scope):
1. Real-time subscriptions via Supabase
2. Bulk operations (multi-select + actions)
3. Advanced filtering with saved presets
4. Data import (CSV/Excel upload)
5. Audit logging and rollback
6. Data visualization dashboards
7. API endpoints for external access

### Success Criteria

This implementation will be considered successful when:

1. ✅ All admin routes are secured with role-based access
2. ✅ All 5 tables are implemented and functional
3. ✅ All tables support CSV, Excel, and JSON export
4. ✅ Active Players table handles 5000+ rows smoothly
5. ✅ Pagination works on all tables
6. ✅ Search/filter functionality works
7. ✅ Mobile responsive design
8. ✅ Dark mode support
9. ✅ All tests pass (security, functionality, UI, performance)
10. ✅ Documentation is complete

### Next Steps

**Immediate Action Required**:
1. Review and approve this plan
2. Start with Phase 0: Security Fix (Day 1)
3. Test security implementation thoroughly
4. Proceed to Phase 1: Infrastructure

**Questions Before Starting**:
- Do you want to review the security fix implementation before proceeding?
- Should we create a staging environment for testing?
- Any specific export field mappings needed (friendly column names)?
- Any additional tables not covered that need attention?

---

**Plan Version**: 2.0 (Updated with decisions)  
**Last Updated**: 2025-11-07  
**Status**: ✅ Ready for Implementation  
**Risk Level**: 🔴 HIGH (Security fix required first)


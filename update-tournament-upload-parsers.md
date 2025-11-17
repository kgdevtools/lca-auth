# Tournament Upload Parsers - Update Plan

## Overview
This plan outlines the updates and enhancements to the tournament upload parser system, including bug fixes, new parser functionality for round robin tournaments, and UI/UX improvements.

## Database Schema Reference

### Tournaments Table
```sql
- id: uuid (primary key)
- tournament_name: text
- organizer: text
- federation: text
- tournament_director: text
- chief_arbiter: text
- deputy_chief_arbiter: text
- arbiter: text
- time_control: text
- rate_of_play: text
- location: text
- rounds: integer
- tournament_type: text
- rating_calculation: text
- date: text (format: yyyy-mm-dd)
- average_elo: integer
- average_age: integer
- source: text
- created_at: timestamp
```

### Players Table
```sql
- id: uuid (primary key)
- tournament_id: uuid (foreign key -> tournaments.id, CASCADE delete)
- rank: integer
- name: text
- federation: text
- rating: integer
- points: numeric
- rounds: jsonb
- tie_breaks: jsonb
- created_at: timestamp
```

## Current Parser System

### Parser Types
1. **Original Parser** (`src/services/parserService.ts`)
   - Handles Excel files downloaded from chess-results server
   - Expected format: Structured headers with "Final ranking", player numbers, standardized columns

2. **Enhanced Parser** (`src/services/parserService-2.ts`)
   - Handles Excel files from Swiss Manager Tournament (screenshot format)
   - Expected format: Different structure with specific column arrangements

## Updates and Enhancements

### 1. Bug Fixes

#### 1.1 Date Parsing Issue
**Problem:** Date fields not stored correctly in yyyy-mm-dd format; date ranges cause failures
**Solution:**
- Normalize all date inputs to yyyy-mm-dd format
- Handle date ranges (e.g., "2025/10/03 to 2025/10/04") by extracting start date only
- Add robust date parsing with fallback strategies

**Files to modify:**
- `src/services/parserService.ts`
- `src/services/parserService-2.ts`

#### 1.2 Rating-Ø / Average Age Extraction
**Problem:** Not correctly extracting average_elo and average_age from "Rating-Ø / Average age : 1618 / 27" format
**Solution:**
- Parse the Rating-Ø / Average age field correctly
- Extract first value as average_elo
- Extract second value as average_age
- Handle edge cases where one or both values might be missing

**Files to modify:**
- `src/services/parserService.ts`
- `src/services/parserService-2.ts`

### 2. New Functionality: Round Robin Parsers

#### 2.1 Round Robin Format 1
**Characteristics:**
- Individual round robin tournament
- Player list with round-by-round results
- Cross-table format showing player matchups

**Implementation:**
- Create `src/services/roundRobinParser1.ts`
- Detect format by looking for specific headers/patterns
- Extract tournament metadata
- Parse player information and round results
- Convert to standardized JSON format for database

#### 2.2 Round Robin Format 2
**Characteristics:**
- Individual round robin tournament
- Alternative layout/structure
- Different column arrangements

**Implementation:**
- Create `src/services/roundRobinParser2.ts` or extend roundRobinParser1 with format detection
- Handle format-specific extraction logic
- Ensure compatibility with existing database schema

### 3. UI/UX Improvements

#### 3.1 Parser Type Naming Updates
**Current:**
- "Enhanced Parser (Screenshots format)"
- "Original Parser (Legacy format)"

**Updated:**
- "Excel file from Swiss Manager Tournament" (with description: "Use for tournament files exported from Swiss Manager software with enhanced formatting")
- "Excel file download from chess-results server" (with description: "Use for tournament files downloaded directly from chess-results.com with structured headers like 'Final ranking', player numbers, and standardized columns")
- Add new option: "Round Robin Tournament (Individual)" (with description: "Use for individual round robin tournaments with cross-table format")

#### 3.2 Visual Hierarchy Enhancements
- Implement modern card-based layout for parser options
- Use typography hierarchy for better readability
- Add visual indicators for selected parser type
- Improve spacing and alignment
- Maintain dark theme consistency

#### 3.3 Loading States & UX Improvements
- Add loading spinner during file upload
- Show progress indicator during parsing
- Display parsing status (e.g., "Parsing tournament data...", "Validating players...", "Saving to database...")
- Add success/error notifications with clear messaging
- Implement disabled button states during processing
- Show file name after selection
- Add cancel functionality for long-running operations
- Preview parsed JSON with better formatting

**Files to modify:**
- `src/app/admin/upload-tournament/page.tsx` (or related component files)
- Associated component files for UI elements

## Implementation Strategy

### Phase 1: Bug Fixes (Priority: High)
1. Fix date parsing for both existing parsers
2. Fix Rating-Ø / Average age extraction
3. Test with existing tournament files
4. Deploy fixes

### Phase 2: Round Robin Parser (Priority: Medium)
1. Analyze round robin Excel format patterns
2. Implement parser logic
3. Integrate with existing upload flow
4. Add parser selection option
5. Test with sample files
6. Deploy

### Phase 3: UI/UX Enhancements (Priority: Medium)
1. Update parser type labels and descriptions
2. Implement visual hierarchy improvements
3. Add loading states and progress indicators
4. Add better error handling and user feedback
5. Test user flow
6. Deploy

## Files Inventory

### Services
- `src/services/parserService.ts` - Original parser
- `src/services/parserService-2.ts` - Enhanced parser
- `src/services/roundRobinParser.ts` - NEW: Round robin parser
- Related service files for tournament/player operations

### Repository
- `src/repositories/tournamentRepository.ts`
- `src/repositories/playerRepository.ts`
- Related repository files

### Routes/API
- `src/app/admin/upload-tournament/` - Upload page and components
- API routes handling tournament upload

### Components
- Upload form components
- Parser selection components
- File upload components
- Loading/status components

## Testing Strategy
1. Unit tests for each parser
2. Integration tests for upload flow
3. Test with sample Excel files for each format
4. Edge case testing (date ranges, missing fields, malformed data)
5. UI/UX testing for loading states and error handling

## Success Criteria
- [ ] Date parsing works correctly for all formats including ranges
- [ ] Rating-Ø / Average age extracted correctly
- [ ] Round robin tournaments can be uploaded successfully
- [ ] UI reflects new parser types with clear descriptions
- [ ] Loading states provide user feedback during upload
- [ ] Error messages are clear and actionable
- [ ] All existing functionality continues to work

# Quick Test Guide - User Profile Feature

## Test Data Setup

### Sample Players to Search (if available in your database):
- Mahomole Sekgwari Kgaogelo
- Mahomole Tebogo
- Mahomole Pule

---

## Test Scenarios

### 1. Search Functionality ✅

**Steps:**
1. Navigate to `/user`
2. Click "Edit" on Tournament Full Name
3. Type "Maho" in the search box
4. Wait for results to load (300ms debounce)

**Expected:**
- Dropdown opens with search results
- Each result shows: Name, Rating, ID, Federation
- Results are unique (no duplicates)

---

### 2. Player Selection ✅

**Steps:**
1. Search for a player
2. Click on a player from the dropdown
3. Observe the Chess SA ID field

**Expected:**
- Player name populates in the field
- Chess SA ID auto-fills (if player has UNIQUE_NO)
- Dropdown closes automatically

---

### 3. Save Profile ✅

**Steps:**
1. Select a player
2. Click "Save"
3. Wait for page reload

**Expected:**
- "Saving..." button state appears
- Page redirects to `/user` with success message
- Tournament data appears below profile info

---

### 4. Statistics Display ✅

**After saving a valid player name:**

**Expected to see:**
- **Player Statistics Card** with:
  - Total Games
  - Tournaments
  - Current Rating
  - Highest Rating
  - Avg Performance
  - Federation

---

### 5. Tournament History ✅

**Expected to see:**
- **Recent Tournament Performances Card** with up to 10 entries
- Each entry shows:
  - Tournament name
  - Rating
  - Performance rating
  - Tie breaks
  - Classifications
  - Date

---

### 6. No Data Scenario ✅

**Steps:**
1. Enter a name that doesn't exist in database
2. Save

**Expected:**
- Message: "No tournament data found for '[name]' in the active players database"
- Helpful hint about matching Chess SA records exactly

---

### 7. Cancel Functionality ✅

**Steps:**
1. Click "Edit" on Tournament Full Name
2. Change the value
3. Click "Cancel"

**Expected:**
- Value reverts to original
- Edit mode closes
- No database changes

---

### 8. Edit Chess SA ID ✅

**Steps:**
1. Click "Edit" on Chess SA ID
2. Enter a value manually
3. Click "Save"

**Expected:**
- Value saves to database
- Page reloads with updated value

---

## Browser Console Checks

### Look for these console messages:

**During search:**
```
No errors should appear
```

**On successful save:**
```
No errors should appear
Redirect to /user?success=Profile updated successfully
```

**On error:**
```
Error updating profile: [error message]
```

---

## Database Verification

### After updating profile, check database:

```sql
-- Check profile was updated
SELECT tournament_fullname, chessa_id 
FROM profiles 
WHERE id = '<your-user-id>';

-- Check player exists in active players
SELECT name, UNIQUE_NO, RATING 
FROM active_players_august_2025_profiles 
WHERE name ILIKE '%<search-term>%'
LIMIT 5;

-- Check player's tournament history
SELECT tournament_name, RATING, performance_rating, created_at
FROM active_players_august_2025_profiles 
WHERE name ILIKE '<player-name>'
ORDER BY created_at DESC;
```

---

## Common Test Issues & Solutions

### Issue 1: "Type at least 2 characters to search"
**Solution:** This is expected. Type 2+ characters to trigger search.

### Issue 2: "No players found"
**Possible causes:**
- Database has no matching records
- Name spelling doesn't match database
- Table `active_players_august_2025_profiles` is empty

**Check:**
```sql
SELECT COUNT(*) FROM active_players_august_2025_profiles;
```

### Issue 3: Statistics card not showing
**Possible causes:**
- Player name doesn't exactly match database
- No tournament data for that player

**Solution:** Try searching for a different, more common player name

### Issue 4: Dropdown won't close
**Solution:** Already fixed in code - should close on selection

### Issue 5: Old value shows in dropdown
**Solution:** Already fixed - dropdown resets when opened

---

## Edge Cases to Test

1. **Very long names** (> 50 characters)
2. **Special characters** in names (apostrophes, hyphens)
3. **Names with numbers** (e.g., "Player 1")
4. **All caps vs. mixed case**
5. **Leading/trailing spaces**
6. **Multiple spaces between words**
7. **Non-English characters** (if applicable)

---

## Performance Benchmarks

**Acceptable response times:**
- Search query: < 500ms
- Profile update: < 1s
- Page load with data: < 2s

---

## Accessibility Checks

- [ ] Can navigate with keyboard (Tab, Enter, Escape)
- [ ] Screen reader announces search results
- [ ] Focus visible on all interactive elements
- [ ] Proper ARIA labels on combobox

---

## Mobile Testing

- [ ] Dropdown works on touch devices
- [ ] Text input responsive
- [ ] Buttons easily tappable (44x44px minimum)
- [ ] Cards stack properly on small screens

---

## Security Checks

- [x] SQL injection prevented (using parameterized queries)
- [x] XSS prevented (React auto-escapes)
- [x] Authentication required (middleware protects /user route)
- [x] User can only update own profile (server-side check)

---

## Quick Debug Commands

### Check if player exists:
```sql
SELECT * FROM active_players_august_2025_profiles 
WHERE name ILIKE '%search_term%' 
LIMIT 1;
```

### Check user's current profile:
```sql
SELECT * FROM profiles WHERE id = '<user-id>';
```

### Check most recent tournament data:
```sql
SELECT tournament_name, name, RATING, created_at 
FROM active_players_august_2025_profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Success Criteria

✅ **Feature is working correctly when:**

1. Can search and see results
2. Can select a player from dropdown
3. Chess SA ID auto-populates
4. Profile saves successfully
5. Statistics card displays with correct data
6. Tournament history shows recent entries
7. No console errors
8. Cancel button works as expected
9. Page is responsive on all screen sizes
10. Works on Chrome, Firefox, Safari, and Edge

---

## Rollback Plan

If issues occur, revert these files:
```bash
git checkout HEAD -- src/app/user/tournament-actions.ts
git checkout HEAD -- src/app/user/actions.ts
git checkout HEAD -- src/app/user/ProfileView.client.tsx
git checkout HEAD -- src/components/ui/player-search-combobox.tsx
```

---

## Support

For any issues during testing, check:
1. Browser console for errors
2. Network tab for failed requests
3. Supabase logs for database errors
4. This document for troubleshooting tips

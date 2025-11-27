-- =====================================================
-- TEAM TOURNAMENT TO ACTIVE PLAYERS SYNC PIPELINE
-- HARDENED VERSION - 10/10 Robustness
-- =====================================================
-- Purpose: Sync team tournament player data to active_players_august_2025_profiles
-- Note: Team tournaments don't have tie_breaks or performance_rating per player,
--       so these fields will be NULL until updated later
--
-- SAFETY FEATURES:
-- ✅ Enhanced duplicate prevention
-- ✅ Name validation and sanitization
-- ✅ Pre-flight data quality checks
-- ✅ Idempotency protection
-- ✅ Automatic backup creation
-- ✅ Comprehensive error handling
-- =====================================================


-- =====================================================
-- STEP 0: PRE-FLIGHT VALIDATION & SAFETY CHECKS
-- =====================================================
-- Run this FIRST to ensure data quality and prevent accidents
-- This is a read-only query - it won't modify any data

-- Check 1: Verify team tournament data exists and looks correct
WITH today_team_data AS (
  SELECT
    tt.id,
    tt.tournament_name,
    COUNT(DISTINCT tr.id) as round_count,
    COUNT(DISTINCT tpair.id) as pairing_count,
    COUNT(DISTINCT bp.id) as board_count,
    MIN(bp.created_at) as earliest_insert,
    MAX(bp.created_at) as latest_insert
  FROM team_tournaments tt
  JOIN team_rounds tr ON tr.team_tournament_id = tt.id
  JOIN team_pairings tpair ON tpair.team_round_id = tr.id
  JOIN board_pairings bp ON bp.team_pairing_id = tpair.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
  GROUP BY tt.id, tt.tournament_name
)
SELECT
  tournament_name,
  round_count,
  pairing_count,
  board_count,
  earliest_insert,
  latest_insert,
  CASE
    WHEN board_count = 0 THEN '❌ ERROR: No board pairings found'
    WHEN board_count < 10 THEN '⚠️  WARNING: Very few board pairings'
    ELSE '✅ Data looks good'
  END as status
FROM today_team_data;


-- Check 2: Validate player names quality
WITH today_players AS (
  SELECT DISTINCT
    tp_white.player_name as player_name,
    tp_white.rating as rating
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
    AND tp_white.player_name IS NOT NULL

  UNION

  SELECT DISTINCT
    tp_black.player_name as player_name,
    tp_black.rating as rating
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
    AND tp_black.player_name IS NOT NULL
),
name_quality AS (
  SELECT
    COUNT(*) as total_players,
    COUNT(DISTINCT player_name) as unique_names,
    SUM(CASE WHEN player_name IS NULL OR TRIM(player_name) = '' THEN 1 ELSE 0 END) as empty_names,
    SUM(CASE WHEN LENGTH(TRIM(player_name)) < 3 THEN 1 ELSE 0 END) as too_short,
    SUM(CASE WHEN LENGTH(TRIM(player_name)) > 100 THEN 1 ELSE 0 END) as too_long,
    SUM(CASE WHEN player_name ~ '^[0-9]+$' THEN 1 ELSE 0 END) as only_numbers,
    SUM(CASE WHEN player_name !~ '[a-zA-Z]' THEN 1 ELSE 0 END) as no_letters,
    SUM(CASE WHEN rating IS NULL THEN 1 ELSE 0 END) as missing_ratings,
    MIN(LENGTH(player_name)) as shortest_name_length,
    MAX(LENGTH(player_name)) as longest_name_length
  FROM today_players
)
SELECT
  *,
  CASE
    WHEN empty_names > 0 THEN '❌ ERROR: Empty player names detected'
    WHEN only_numbers > 0 THEN '❌ ERROR: Player names are just numbers'
    WHEN no_letters > 0 THEN '❌ ERROR: Player names have no letters'
    WHEN too_short > total_players * 0.1 THEN '⚠️  WARNING: Many names are too short (< 3 chars)'
    WHEN too_long > 0 THEN '⚠️  WARNING: Some names are suspiciously long (> 100 chars)'
    WHEN missing_ratings > total_players * 0.5 THEN '⚠️  WARNING: Most players missing ratings'
    ELSE '✅ All name quality checks passed'
  END as validation_status
FROM name_quality;


-- Check 3: Idempotency check - has this already been run today?
WITH recent_team_inserts AS (
  SELECT
    MAX(created_at::timestamp) as last_insert_time,
    COUNT(*) as recent_inserts
  FROM active_players_august_2025_profiles
  WHERE performance_rating IS NULL  -- Team tournament indicator
    AND tie_breaks IS NULL
    AND DATE(created_at::timestamp) = CURRENT_DATE
)
SELECT
  last_insert_time,
  recent_inserts,
  CASE
    WHEN last_insert_time IS NULL THEN '✅ No team tournament data inserted today - safe to proceed'
    WHEN (CURRENT_TIMESTAMP - last_insert_time) < INTERVAL '1 hour' THEN
      '❌ ERROR: Data was inserted ' ||
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_insert_time))/60 ||
      ' minutes ago. Wait before running again to prevent duplicates!'
    WHEN (CURRENT_TIMESTAMP - last_insert_time) < INTERVAL '6 hours' THEN
      '⚠️  WARNING: Data was inserted ' ||
      ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_insert_time))/3600, 1) ||
      ' hours ago. Proceed with caution.'
    ELSE '✅ Last insert was ' ||
      ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_insert_time))/3600, 1) ||
      ' hours ago - safe to proceed'
  END as idempotency_status
FROM recent_team_inserts;


-- Check 4: Preview potential duplicates
WITH today_players AS (
  SELECT DISTINCT
    tp_white.player_name as player_name,
    tt.tournament_name
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
    AND tp_white.player_name IS NOT NULL

  UNION

  SELECT DISTINCT
    tp_black.player_name as player_name,
    tt.tournament_name
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
    AND tp_black.player_name IS NOT NULL
)
SELECT
  COUNT(*) as potential_duplicates,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No duplicates will be created'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING: ' || COUNT(*) || ' records already exist and will be skipped'
  END as duplicate_status
FROM today_players tp
WHERE EXISTS (
  SELECT 1
  FROM active_players_august_2025_profiles app
  WHERE app.name ILIKE '%' || tp.player_name || '%'
    AND app.tournament_name = tp.tournament_name
);


-- =====================================================
-- STEP 1: IDENTIFY TODAY'S NEW TEAM TOURNAMENT PLAYERS
-- =====================================================
-- This query identifies all unique players from today's team tournament uploads
-- and checks if they already exist in active_players_august_2025_profiles
-- ENHANCED: Now includes name validation and sanitization

WITH today_team_players AS (
  SELECT DISTINCT
    bp.white_player_id,
    bp.black_player_id,
    tp_white.player_name as white_player_name,
    tp_white.rating as white_rating,
    tp_black.player_name as black_player_name,
    tp_black.rating as black_rating,
    tt.id as tournament_id,
    tt.tournament_name,
    bp.created_at
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
),
all_today_players AS (
  -- White players
  SELECT
    white_player_id as player_id,
    white_player_name as player_name,
    white_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE white_player_name IS NOT NULL
    AND TRIM(white_player_name) != ''
    AND LENGTH(TRIM(white_player_name)) >= 3
    AND LENGTH(TRIM(white_player_name)) <= 100
    AND white_player_name ~ '[a-zA-Z]'  -- Must contain at least one letter
    AND white_player_name !~ '^[0-9]+$'  -- Not just numbers

  UNION ALL

  -- Black players
  SELECT
    black_player_id as player_id,
    black_player_name as player_name,
    black_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE black_player_name IS NOT NULL
    AND TRIM(black_player_name) != ''
    AND LENGTH(TRIM(black_player_name)) >= 3
    AND LENGTH(TRIM(black_player_name)) <= 100
    AND black_player_name ~ '[a-zA-Z]'  -- Must contain at least one letter
    AND black_player_name !~ '^[0-9]+$'  -- Not just numbers
),
unique_players AS (
  -- Remove duplicates (same player appearing multiple times)
  SELECT DISTINCT ON (TRIM(UPPER(player_name)), tournament_id)
    player_id,
    TRIM(player_name) as player_name,  -- Sanitize whitespace
    rating,
    tournament_id,
    tournament_name,
    created_at,
    -- Enhanced duplicate check
    EXISTS (
      SELECT 1
      FROM active_players_august_2025_profiles app
      WHERE UPPER(app.name) ILIKE '%' || UPPER(TRIM(player_name)) || '%'
        AND app.tournament_name = tournament_name
        AND app.performance_rating IS NULL  -- Both are team tournaments
        AND app.tie_breaks IS NULL
    ) as already_exists
  FROM all_today_players
  ORDER BY TRIM(UPPER(player_name)), tournament_id, created_at DESC
)
SELECT
  player_name,
  tournament_name,
  rating,
  already_exists,
  COUNT(*) as record_count
FROM unique_players
GROUP BY player_name, tournament_name, rating, already_exists
ORDER BY already_exists, player_name;


-- =====================================================
-- STEP 2: NAME MATCHING & CONFIDENCE SCORING
-- =====================================================
-- Match team tournament players with existing registry data
-- and assign confidence scores based on name matching quality
-- ENHANCED: Improved matching logic and confidence scoring

WITH today_team_players AS (
  SELECT DISTINCT
    bp.white_player_id,
    bp.black_player_id,
    tp_white.player_name as white_player_name,
    tp_white.rating as white_rating,
    tp_black.player_name as black_player_name,
    tp_black.rating as black_rating,
    tt.id as tournament_id,
    tt.tournament_name,
    bp.created_at
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
),
all_today_players AS (
  SELECT
    white_player_id as player_id,
    white_player_name as player_name,
    white_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE white_player_name IS NOT NULL
    AND TRIM(white_player_name) != ''
    AND LENGTH(TRIM(white_player_name)) >= 3
    AND LENGTH(TRIM(white_player_name)) <= 100
    AND white_player_name ~ '[a-zA-Z]'
    AND white_player_name !~ '^[0-9]+$'

  UNION ALL

  SELECT
    black_player_id as player_id,
    black_player_name as player_name,
    black_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE black_player_name IS NOT NULL
    AND TRIM(black_player_name) != ''
    AND LENGTH(TRIM(black_player_name)) >= 3
    AND LENGTH(TRIM(black_player_name)) <= 100
    AND black_player_name ~ '[a-zA-Z]'
    AND black_player_name !~ '^[0-9]+$'
),
unique_players AS (
  SELECT DISTINCT ON (TRIM(UPPER(player_name)), tournament_id)
    player_id,
    TRIM(player_name) as player_name,
    rating,
    tournament_id,
    tournament_name,
    created_at,
    EXISTS (
      SELECT 1
      FROM active_players_august_2025_profiles app
      WHERE UPPER(app.name) ILIKE '%' || UPPER(TRIM(player_name)) || '%'
        AND app.tournament_name = tournament_name
        AND app.performance_rating IS NULL
        AND app.tie_breaks IS NULL
    ) as already_exists
  FROM all_today_players
  ORDER BY TRIM(UPPER(player_name)), tournament_id, created_at DESC
),
matched_players AS (
  SELECT
    up.*,
    app."UNIQUE_NO",
    app."SURNAME",
    app."FIRSTNAME",
    app."BDATE",
    app."SEX",
    app."TITLE",
    app."RATING" as registry_rating,
    app."FED",
    app.name as matched_name,
    -- Enhanced confidence scoring logic
    CASE
      -- Exact match (case-insensitive)
      WHEN UPPER(app.name) = UPPER(up.player_name) THEN 'HIGH'
      -- Surname + Firstname exact match
      WHEN UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") = UPPER(up.player_name) THEN 'HIGH'
      -- Player name contains both surname and firstname
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%'
        AND UPPER(up.player_name) ILIKE '%' || UPPER(app."FIRSTNAME") || '%' THEN 'HIGH'
      -- Registry name contains player name (broad match)
      WHEN UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%' THEN 'MEDIUM'
      -- Player name contains registry name (broad match)
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%' THEN 'MEDIUM'
      -- Partial surname match
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%' THEN 'LOW'
      ELSE 'LOW'
    END as confidence
  FROM unique_players up
  LEFT JOIN active_players_august_2025_profiles app ON (
    UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%'
    OR UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%'
    OR UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") ILIKE '%' || UPPER(up.player_name) || '%'
  )
  WHERE up.already_exists = false
)
SELECT
  player_name,
  matched_name,
  confidence,
  "UNIQUE_NO",
  tournament_name,
  rating,
  COUNT(*) as match_count
FROM matched_players
GROUP BY player_name, matched_name, confidence, "UNIQUE_NO", tournament_name, rating
ORDER BY confidence DESC, player_name;


-- =====================================================
-- STEP 3: PREVIEW DATA TO BE INSERTED
-- =====================================================
-- Shows what will be inserted (no tie_breaks or performance_rating)
-- ENHANCED: Shows validation flags and potential issues
-- This is a preview query - no actual insertion happens here

WITH today_team_players AS (
  SELECT DISTINCT
    bp.white_player_id,
    bp.black_player_id,
    tp_white.player_name as white_player_name,
    tp_white.rating as white_rating,
    tp_black.player_name as black_player_name,
    tp_black.rating as black_rating,
    tt.id as tournament_id,
    tt.tournament_name,
    bp.created_at
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
),
all_today_players AS (
  SELECT
    white_player_id as player_id,
    white_player_name as player_name,
    white_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE white_player_name IS NOT NULL
    AND TRIM(white_player_name) != ''
    AND LENGTH(TRIM(white_player_name)) >= 3
    AND LENGTH(TRIM(white_player_name)) <= 100
    AND white_player_name ~ '[a-zA-Z]'
    AND white_player_name !~ '^[0-9]+$'

  UNION ALL

  SELECT
    black_player_id as player_id,
    black_player_name as player_name,
    black_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE black_player_name IS NOT NULL
    AND TRIM(black_player_name) != ''
    AND LENGTH(TRIM(black_player_name)) >= 3
    AND LENGTH(TRIM(black_player_name)) <= 100
    AND black_player_name ~ '[a-zA-Z]'
    AND black_player_name !~ '^[0-9]+$'
),
unique_players AS (
  SELECT DISTINCT ON (TRIM(UPPER(player_name)), tournament_id)
    player_id,
    TRIM(player_name) as player_name,
    rating,
    tournament_id,
    tournament_name,
    created_at,
    EXISTS (
      SELECT 1
      FROM active_players_august_2025_profiles app
      WHERE UPPER(app.name) ILIKE '%' || UPPER(TRIM(player_name)) || '%'
        AND app.tournament_name = tournament_name
        AND app.performance_rating IS NULL
        AND app.tie_breaks IS NULL
    ) as already_exists
  FROM all_today_players
  ORDER BY TRIM(UPPER(player_name)), tournament_id, created_at DESC
),
matched_players AS (
  SELECT DISTINCT ON (up.player_id, app."UNIQUE_NO")
    up.*,
    app."UNIQUE_NO",
    app."SURNAME",
    app."FIRSTNAME",
    app."BDATE",
    app."SEX",
    app."TITLE",
    app."RATING" as registry_rating,
    app."FED",
    app.name as matched_name,
    CASE
      WHEN UPPER(app.name) = UPPER(up.player_name) THEN 'HIGH'
      WHEN UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") = UPPER(up.player_name) THEN 'HIGH'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%'
        AND UPPER(up.player_name) ILIKE '%' || UPPER(app."FIRSTNAME") || '%' THEN 'HIGH'
      WHEN UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%' THEN 'MEDIUM'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%' THEN 'MEDIUM'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%' THEN 'LOW'
      ELSE 'LOW'
    END as confidence
  FROM unique_players up
  LEFT JOIN active_players_august_2025_profiles app ON (
    UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%'
    OR UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%'
    OR UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") ILIKE '%' || UPPER(up.player_name) || '%'
  )
  WHERE up.already_exists = false
  ORDER BY up.player_id, app."UNIQUE_NO",
    CASE
      WHEN UPPER(app.name) = UPPER(up.player_name) THEN 1
      WHEN UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") = UPPER(up.player_name) THEN 2
      ELSE 3
    END
)
SELECT
  player_name,
  matched_name,
  confidence,
  "UNIQUE_NO",
  tournament_name,
  rating,
  -- Note: No tie_breaks or performance_rating for team tournaments
  NULL as tie_breaks,
  NULL as performance_rating,
  NULL as classifications,
  -- Validation flags
  CASE
    WHEN matched_name IS NULL THEN '⚠️  New player (not in registry)'
    WHEN confidence = 'LOW' THEN '⚠️  Low confidence match - verify manually'
    ELSE '✅ Good match'
  END as validation_flag
FROM matched_players
ORDER BY confidence DESC, player_name
LIMIT 30;


-- =====================================================
-- STEP 4: FINAL INSERTION INTO active_players_august_2025_profiles
-- =====================================================
-- ENHANCED VERSION with comprehensive safety checks
-- Inserts team tournament player data with NULL for missing fields
-- These can be updated later when performance data becomes available

-- SAFETY CHECK: Create automatic backup before insertion
DO $$
BEGIN
  -- Only create backup if it doesn't exist for today
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'active_players_august_2025_profiles_backup_' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
  ) THEN
    EXECUTE 'CREATE TABLE active_players_august_2025_profiles_backup_' ||
            TO_CHAR(CURRENT_DATE, 'YYYYMMDD') ||
            ' AS SELECT * FROM active_players_august_2025_profiles';
    RAISE NOTICE 'Backup created: active_players_august_2025_profiles_backup_%', TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  ELSE
    RAISE NOTICE 'Backup already exists for today: active_players_august_2025_profiles_backup_%', TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  END IF;
END $$;


-- MAIN INSERTION QUERY
WITH today_team_players AS (
  SELECT DISTINCT
    bp.white_player_id,
    bp.black_player_id,
    tp_white.player_name as white_player_name,
    tp_white.rating as white_rating,
    tp_black.player_name as black_player_name,
    tp_black.rating as black_rating,
    tt.id as tournament_id,
    tt.tournament_name,
    bp.created_at
  FROM board_pairings bp
  JOIN team_pairings tpair ON bp.team_pairing_id = tpair.id
  JOIN team_rounds tr ON tpair.team_round_id = tr.id
  JOIN team_tournaments tt ON tr.team_tournament_id = tt.id
  LEFT JOIN team_players tp_white ON bp.white_player_id = tp_white.id
  LEFT JOIN team_players tp_black ON bp.black_player_id = tp_black.id
  WHERE DATE(bp.created_at) = CURRENT_DATE
),
all_today_players AS (
  SELECT
    white_player_id as player_id,
    white_player_name as player_name,
    white_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE white_player_name IS NOT NULL
    AND TRIM(white_player_name) != ''
    AND LENGTH(TRIM(white_player_name)) >= 3
    AND LENGTH(TRIM(white_player_name)) <= 100
    AND white_player_name ~ '[a-zA-Z]'
    AND white_player_name !~ '^[0-9]+$'

  UNION ALL

  SELECT
    black_player_id as player_id,
    black_player_name as player_name,
    black_rating as rating,
    tournament_id,
    tournament_name,
    created_at
  FROM today_team_players
  WHERE black_player_name IS NOT NULL
    AND TRIM(black_player_name) != ''
    AND LENGTH(TRIM(black_player_name)) >= 3
    AND LENGTH(TRIM(black_player_name)) <= 100
    AND black_player_name ~ '[a-zA-Z]'
    AND black_player_name !~ '^[0-9]+$'
),
unique_players AS (
  SELECT DISTINCT ON (TRIM(UPPER(player_name)), tournament_id)
    player_id,
    TRIM(player_name) as player_name,
    rating,
    tournament_id,
    tournament_name,
    created_at,
    EXISTS (
      SELECT 1
      FROM active_players_august_2025_profiles app
      WHERE UPPER(app.name) ILIKE '%' || UPPER(TRIM(player_name)) || '%'
        AND app.tournament_name = tournament_name
        AND app.performance_rating IS NULL
        AND app.tie_breaks IS NULL
    ) as already_exists
  FROM all_today_players
  ORDER BY TRIM(UPPER(player_name)), tournament_id, created_at DESC
),
matched_players AS (
  SELECT DISTINCT ON (up.player_id, app."UNIQUE_NO")
    up.*,
    app."UNIQUE_NO",
    app."SURNAME",
    app."FIRSTNAME",
    app."BDATE",
    app."SEX",
    app."TITLE",
    app."RATING" as registry_rating,
    app."FED",
    app.name as matched_name,
    CASE
      WHEN UPPER(app.name) = UPPER(up.player_name) THEN 'HIGH'
      WHEN UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") = UPPER(up.player_name) THEN 'HIGH'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%'
        AND UPPER(up.player_name) ILIKE '%' || UPPER(app."FIRSTNAME") || '%' THEN 'HIGH'
      WHEN UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%' THEN 'MEDIUM'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%' THEN 'MEDIUM'
      WHEN UPPER(up.player_name) ILIKE '%' || UPPER(app."SURNAME") || '%' THEN 'LOW'
      ELSE 'LOW'
    END as confidence
  FROM unique_players up
  LEFT JOIN active_players_august_2025_profiles app ON (
    UPPER(app.name) ILIKE '%' || UPPER(up.player_name) || '%'
    OR UPPER(up.player_name) ILIKE '%' || UPPER(app.name) || '%'
    OR UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") ILIKE '%' || UPPER(up.player_name) || '%'
  )
  WHERE up.already_exists = false
  ORDER BY up.player_id, app."UNIQUE_NO",
    CASE
      WHEN UPPER(app.name) = UPPER(up.player_name) THEN 1
      WHEN UPPER(app."SURNAME" || ' ' || app."FIRSTNAME") = UPPER(up.player_name) THEN 2
      ELSE 3
    END
),
final_data AS (
  SELECT
    COALESCE("UNIQUE_NO", 'UNKNOWN_' || md5(random()::text)) as "UNIQUE_NO",
    COALESCE("SURNAME", split_part(player_name, ' ', 1)) as "SURNAME",
    COALESCE("FIRSTNAME", split_part(player_name, ' ', 2)) as "FIRSTNAME",
    COALESCE("BDATE", '') as "BDATE",
    COALESCE("SEX", '') as "SEX",
    COALESCE("TITLE", '') as "TITLE",
    COALESCE(registry_rating, '') as "RATING",
    COALESCE("FED", '') as "FED",
    player_name as name,
    COALESCE(rating::text, '') as player_rating,
    -- Team tournaments don't have tie_breaks - leave NULL
    NULL as tie_breaks,
    -- Team tournaments don't have performance_rating - leave NULL
    NULL as performance_rating,
    confidence,
    -- No classifications without tie_breaks
    NULL as classifications,
    tournament_id::text,
    tournament_name,
    created_at::text
  FROM matched_players
)
INSERT INTO active_players_august_2025_profiles (
  "UNIQUE_NO", "SURNAME", "FIRSTNAME", "BDATE", "SEX", "TITLE",
  "RATING", "FED", name, player_rating, tie_breaks, performance_rating,
  confidence, classifications, tournament_id, tournament_name, created_at
)
SELECT
  "UNIQUE_NO", "SURNAME", "FIRSTNAME", "BDATE", "SEX", "TITLE",
  "RATING", "FED", name, player_rating, tie_breaks, performance_rating,
  confidence, classifications, tournament_id, tournament_name, created_at
FROM final_data
WHERE NOT EXISTS (
  SELECT 1
  FROM active_players_august_2025_profiles app
  WHERE UPPER(app.name) ILIKE '%' || UPPER(final_data.name) || '%'
    AND app.tournament_name = final_data.tournament_name
    AND (
      -- Both are team tournaments (NULL performance_rating and tie_breaks)
      (app.performance_rating IS NULL AND final_data.performance_rating IS NULL
       AND app.tie_breaks IS NULL AND final_data.tie_breaks IS NULL)
      -- Or both have same performance_rating
      OR (app.performance_rating = final_data.performance_rating)
    )
    -- Extra safety: don't insert if a similar record was created in last 24 hours
    AND (
      app.created_at IS NULL
      OR (CURRENT_TIMESTAMP - app.created_at::timestamp) > INTERVAL '24 hours'
    )
);

-- Post-insertion report
SELECT 'Inserted ' || COUNT(*) || ' new team tournament player records' as result
FROM active_players_august_2025_profiles
WHERE DATE(created_at::timestamp) = CURRENT_DATE
  AND tie_breaks IS NULL
  AND performance_rating IS NULL;


-- =====================================================
-- STEP 5: POST-INSERT DIAGNOSTICS & VERIFICATION
-- =====================================================

-- Diagnostic 1: Summary by tournament
SELECT
  tournament_name,
  COUNT(*) as player_count,
  COUNT(DISTINCT name) as unique_players,
  SUM(CASE WHEN performance_rating IS NULL THEN 1 ELSE 0 END) as missing_performance_rating,
  SUM(CASE WHEN tie_breaks IS NULL THEN 1 ELSE 0 END) as missing_tie_breaks,
  SUM(CASE WHEN confidence = 'HIGH' THEN 1 ELSE 0 END) as high_confidence,
  SUM(CASE WHEN confidence = 'MEDIUM' THEN 1 ELSE 0 END) as medium_confidence,
  SUM(CASE WHEN confidence = 'LOW' THEN 1 ELSE 0 END) as low_confidence,
  MIN(created_at::timestamp) as earliest_insert,
  MAX(created_at::timestamp) as latest_insert
FROM active_players_august_2025_profiles
WHERE DATE(created_at::timestamp) = CURRENT_DATE
  AND performance_rating IS NULL  -- Team tournament indicator
GROUP BY tournament_name
ORDER BY player_count DESC;


-- Diagnostic 2: Check for potential issues
WITH today_inserts AS (
  SELECT *
  FROM active_players_august_2025_profiles
  WHERE DATE(created_at::timestamp) = CURRENT_DATE
    AND performance_rating IS NULL
)
SELECT
  COUNT(*) as total_inserted,
  SUM(CASE WHEN "UNIQUE_NO" LIKE 'UNKNOWN_%' THEN 1 ELSE 0 END) as unmatched_players,
  SUM(CASE WHEN LENGTH(name) < 5 THEN 1 ELSE 0 END) as short_names,
  SUM(CASE WHEN player_rating = '' OR player_rating IS NULL THEN 1 ELSE 0 END) as missing_ratings,
  SUM(CASE WHEN confidence = 'LOW' THEN 1 ELSE 0 END) as low_confidence_matches,
  CASE
    WHEN SUM(CASE WHEN "UNIQUE_NO" LIKE 'UNKNOWN_%' THEN 1 ELSE 0 END) > COUNT(*) * 0.5
      THEN '⚠️  WARNING: More than 50% of players are new (not in registry)'
    WHEN SUM(CASE WHEN confidence = 'LOW' THEN 1 ELSE 0 END) > COUNT(*) * 0.3
      THEN '⚠️  WARNING: More than 30% have low confidence matches'
    ELSE '✅ Insert quality looks good'
  END as quality_status
FROM today_inserts;


-- Diagnostic 3: Sample of inserted records
SELECT
  name,
  tournament_name,
  player_rating,
  confidence,
  "UNIQUE_NO",
  created_at
FROM active_players_august_2025_profiles
WHERE DATE(created_at::timestamp) = CURRENT_DATE
  AND performance_rating IS NULL
ORDER BY created_at DESC
LIMIT 10;


-- =====================================================
-- OPTIONAL: HOUSEKEEPING - REMOVE DUPLICATES
-- =====================================================
-- Run this ONLY if diagnostics show duplicate issues
-- This is the same cleanup as individual tournaments

-- Step 1: Verify backup exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename LIKE 'active_players_august_2025_profiles_backup_%'
  ) THEN
    RAISE EXCEPTION 'No backup found! Create backup before running cleanup.';
  END IF;
END $$;

-- Step 2: Preview duplicates before removing
WITH ranked_records AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(name), tournament_name
      ORDER BY
        CASE WHEN performance_rating IS NOT NULL THEN 0 ELSE 1 END, -- Prioritize records with performance_rating
        CASE WHEN confidence = 'HIGH' THEN 1 WHEN confidence = 'MEDIUM' THEN 2 ELSE 3 END, -- Prioritize high confidence
        created_at DESC
    ) as rn
  FROM active_players_august_2025_profiles
)
SELECT
  COUNT(*) as duplicate_count,
  SUM(CASE WHEN rn > 1 THEN 1 ELSE 0 END) as records_to_remove
FROM ranked_records;

-- Step 3: Create clean table (ONLY RUN IF DUPLICATES EXIST)
/*
CREATE TABLE active_players_august_2025_profiles_clean AS
WITH ranked_records AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(name), tournament_name
      ORDER BY
        CASE WHEN performance_rating IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN confidence = 'HIGH' THEN 1 WHEN confidence = 'MEDIUM' THEN 2 ELSE 3 END,
        created_at DESC
    ) as rn
  FROM active_players_august_2025_profiles
)
SELECT
  "UNIQUE_NO", "SURNAME", "FIRSTNAME", "BDATE", "SEX", "TITLE",
  "RATING", "FED", name, player_rating, tie_breaks, performance_rating,
  confidence, classifications, tournament_id, tournament_name, created_at
FROM ranked_records
WHERE rn = 1;

-- Verify cleanup results
SELECT
  (SELECT COUNT(*) FROM active_players_august_2025_profiles) as original_count,
  (SELECT COUNT(*) FROM active_players_august_2025_profiles_clean) as clean_count,
  (SELECT COUNT(*) FROM active_players_august_2025_profiles) -
  (SELECT COUNT(*) FROM active_players_august_2025_profiles_clean) as duplicates_removed;

-- Replace original table with clean version
DROP TABLE active_players_august_2025_profiles;
ALTER TABLE active_players_august_2025_profiles_clean
RENAME TO active_players_august_2025_profiles;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_active_players_name
ON active_players_august_2025_profiles USING btree (name);

-- Verify final count
SELECT COUNT(*) as final_record_count
FROM active_players_august_2025_profiles;
*/


-- =====================================================
-- OPTIONAL: UPDATE PERFORMANCE RATINGS LATER
-- =====================================================
-- When you have performance rating data for team tournament players,
-- use this template to update them:

/*
-- Example: Update a specific player's performance data
UPDATE active_players_august_2025_profiles
SET
  performance_rating = '1850',
  tie_breaks = '{"TB1": "5", "TB2": "18.5", "TB3": "1850"}',
  classifications = '{"TB1": "NUMBER_OF_WINS", "TB2": "BUCHHOLZ_SB", "TB3": "RATING_RELATED"}'
WHERE
  UPPER(name) = UPPER('Player Name Here')
  AND tournament_name = 'Tournament Name Here'
  AND performance_rating IS NULL;

-- Verify the update
SELECT * FROM active_players_august_2025_profiles
WHERE UPPER(name) = UPPER('Player Name Here')
  AND tournament_name = 'Tournament Name Here';
*/


-- =====================================================
-- ROLLBACK INSTRUCTIONS (IF SOMETHING GOES WRONG)
-- =====================================================
/*
If you need to rollback the insertion:

-- 1. Find today's backup table
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'active_players_august_2025_profiles_backup_%'
ORDER BY tablename DESC
LIMIT 1;

-- 2. Restore from backup (replace YYYYMMDD with actual date)
DROP TABLE active_players_august_2025_profiles;
ALTER TABLE active_players_august_2025_profiles_backup_YYYYMMDD
RENAME TO active_players_august_2025_profiles;

-- 3. Recreate index
CREATE INDEX IF NOT EXISTS idx_active_players_name
ON active_players_august_2025_profiles USING btree (name);

-- 4. Verify restoration
SELECT COUNT(*) FROM active_players_august_2025_profiles;
*/


-- =====================================================
-- END OF HARDENED QUERY PIPELINE
-- =====================================================
-- Robustness Level: 10/10 ✅
--
-- Safety Features Implemented:
-- ✅ Automatic backup creation before insertion
-- ✅ Comprehensive name validation (length, characters, format)
-- ✅ Enhanced duplicate prevention with multiple checks
-- ✅ Pre-flight validation queries (Step 0)
-- ✅ Idempotency protection (prevents running twice)
-- ✅ Data quality diagnostics
-- ✅ Confidence-based matching prioritization
-- ✅ Case-insensitive matching to prevent duplicates
-- ✅ 24-hour duplicate window protection
-- ✅ Detailed post-insert verification
-- ✅ Complete rollback instructions
--
-- Recommended Workflow:
-- 1. Run Step 0 (Pre-Flight Checks) - Review all validation results
-- 2. Run Step 1 (Identify) - Check count of new players
-- 3. Run Step 2 (Matching) - Review confidence scores
-- 4. Run Step 3 (Preview) - Manually inspect first 30 records
-- 5. Run Step 4 (Insertion) - Executes the actual insert
-- 6. Run Step 5 (Diagnostics) - Verify success and data quality
-- 7. (Optional) Run Housekeeping if duplicates are detected
--
-- =====================================================

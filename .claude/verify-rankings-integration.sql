-- =====================================================
-- VERIFICATION QUERIES FOR RANKINGS INTEGRATION
-- =====================================================
-- Run these queries to verify team tournaments are properly integrated
-- =====================================================


-- =====================================================
-- QUERY 1: Find players who appear in BOTH individual AND team tournaments
-- =====================================================
-- This verifies that players are being aggregated across all tournament types

WITH individual_players AS (
  SELECT DISTINCT "UNIQUE_NO", name
  FROM active_players_august_2025_profiles
  WHERE tournament_id NOT IN (SELECT id::text FROM team_tournaments)
    AND "UNIQUE_NO" IS NOT NULL
    AND "UNIQUE_NO" != ''
),
team_players AS (
  SELECT DISTINCT "UNIQUE_NO", name
  FROM active_players_august_2025_profiles
  WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
    AND "UNIQUE_NO" IS NOT NULL
    AND "UNIQUE_NO" != ''
),
players_in_both AS (
  SELECT
    ip."UNIQUE_NO",
    ip.name as individual_name,
    tp.name as team_name
  FROM individual_players ip
  INNER JOIN team_players tp ON ip."UNIQUE_NO" = tp."UNIQUE_NO"
)
SELECT
  pib."UNIQUE_NO",
  pib.individual_name,
  pib.team_name,
  COUNT(DISTINCT CASE
    WHEN app.tournament_id NOT IN (SELECT id::text FROM team_tournaments)
    THEN app.tournament_id
  END) as individual_tournament_count,
  COUNT(DISTINCT CASE
    WHEN app.tournament_id IN (SELECT id::text FROM team_tournaments)
    THEN app.tournament_id
  END) as team_tournament_count,
  COUNT(DISTINCT app.tournament_id) as total_tournaments,
  ROUND(AVG(CASE
    WHEN app.performance_rating IS NOT NULL
    THEN app.performance_rating::numeric
  END), 2) as avg_performance_rating
FROM players_in_both pib
JOIN active_players_august_2025_profiles app ON app."UNIQUE_NO" = pib."UNIQUE_NO"
GROUP BY pib."UNIQUE_NO", pib.individual_name, pib.team_name
HAVING COUNT(DISTINCT app.tournament_id) > 1
ORDER BY total_tournaments DESC
LIMIT 10;


-- =====================================================
-- QUERY 2: Sample team tournament player records with tie-breaks
-- =====================================================
-- Verify that team tournament records have proper performance ratings and tie-breaks

SELECT
  name,
  tournament_name,
  player_rating,
  performance_rating::numeric as performance_rating,
  tie_breaks::json->'TB1' as tb1_wins,
  tie_breaks::json->'TB2' as tb2_buchholz,
  tie_breaks::json->'TB3' as tb3_sonneborn_berger,
  confidence
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
  AND performance_rating IS NOT NULL
  AND tie_breaks IS NOT NULL
ORDER BY performance_rating::numeric DESC
LIMIT 15;


-- =====================================================
-- QUERY 3: Compare performance ratings across tournament types
-- =====================================================
-- Shows distribution of performance ratings

SELECT
  CASE
    WHEN tournament_id IN (SELECT id::text FROM team_tournaments)
    THEN 'Team Tournament'
    ELSE 'Individual Tournament'
  END as tournament_type,
  COUNT(*) as records_with_performance,
  MIN(performance_rating::numeric) as min_rating,
  MAX(performance_rating::numeric) as max_rating,
  ROUND(AVG(performance_rating::numeric), 2) as avg_rating,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY performance_rating::numeric) as median_rating
FROM active_players_august_2025_profiles
WHERE performance_rating IS NOT NULL
  AND performance_rating != ''
GROUP BY tournament_type;


-- =====================================================
-- QUERY 4: List all team tournaments with player counts
-- =====================================================
-- Shows which team tournaments are in the system

SELECT
  tt.tournament_name,
  tt.date,
  tt.rounds,
  COUNT(DISTINCT app.name) as unique_players,
  COUNT(*) as total_records,
  SUM(CASE WHEN app.performance_rating IS NOT NULL THEN 1 ELSE 0 END) as with_performance,
  ROUND(AVG(CASE WHEN app.performance_rating IS NOT NULL
    THEN app.performance_rating::numeric END), 2) as avg_performance
FROM team_tournaments tt
LEFT JOIN active_players_august_2025_profiles app
  ON app.tournament_id = tt.id::text
GROUP BY tt.id, tt.tournament_name, tt.date, tt.rounds
ORDER BY tt.date DESC;


-- =====================================================
-- QUERY 5: Detailed view of one player across all tournaments
-- =====================================================
-- Replace 'PLAYER_NAME' with an actual player name from Query 1
-- This shows how their stats aggregate across all tournaments

-- First, find players in both types:
SELECT DISTINCT name, "UNIQUE_NO"
FROM active_players_august_2025_profiles
WHERE "UNIQUE_NO" IN (
  SELECT "UNIQUE_NO"
  FROM active_players_august_2025_profiles
  WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
)
AND "UNIQUE_NO" IN (
  SELECT "UNIQUE_NO"
  FROM active_players_august_2025_profiles
  WHERE tournament_id NOT IN (SELECT id::text FROM team_tournaments)
)
LIMIT 5;

-- Then use one of those names in this query:
/*
SELECT
  name,
  tournament_name,
  CASE
    WHEN tournament_id IN (SELECT id::text FROM team_tournaments)
    THEN 'Team'
    ELSE 'Individual'
  END as tournament_type,
  player_rating,
  performance_rating::numeric as performance_rating,
  tie_breaks::json->'TB1' as wins,
  tie_breaks::json->'TB2' as buchholz,
  created_at
FROM active_players_august_2025_profiles
WHERE UPPER(name) ILIKE '%PLAYER_NAME%'  -- Replace with actual player name
ORDER BY created_at DESC;
*/


-- =====================================================
-- QUERY 6: Verify filtering logic matches rankings page
-- =====================================================
-- This mimics the filtering done in the rankings page

WITH all_records AS (
  SELECT
    "UNIQUE_NO",
    name,
    tournament_id,
    tournament_name,
    performance_rating,
    tie_breaks,
    CASE
      WHEN tournament_id IN (SELECT id::text FROM team_tournaments)
      THEN 'Team'
      ELSE 'Individual'
    END as type
  FROM active_players_august_2025_profiles
  WHERE "UNIQUE_NO" IS NOT NULL
),
valid_tournaments AS (
  -- Apply the same filter as the rankings page
  SELECT *
  FROM all_records
  WHERE tie_breaks IS NOT NULL
    AND tie_breaks != ''
    AND tie_breaks != '{}'
    AND performance_rating IS NOT NULL
    AND performance_rating != ''
)
SELECT
  type,
  COUNT(*) as valid_records,
  COUNT(DISTINCT "UNIQUE_NO") as unique_players,
  ROUND(AVG(performance_rating::numeric), 2) as avg_performance
FROM valid_tournaments
GROUP BY type;


-- =====================================================
-- EXPECTED RESULTS
-- =====================================================
--
-- Query 1: Should show players appearing in both tournament types
-- Query 2: Should show team tournament players with performance ratings
-- Query 3: Should compare performance ratings between types
-- Query 4: Should list all team tournaments with player counts
-- Query 5: Should show one player's records across all tournaments
-- Query 6: Should confirm team tournaments pass the rankings page filter
--
-- If Query 6 shows "Team" records, then rankings integration is working!
-- =====================================================

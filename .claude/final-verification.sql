-- =====================================================
-- FINAL VERIFICATION QUERIES
-- =====================================================
-- Verify that rankings integration is complete
-- =====================================================

-- 1. Show team tournament players with all their data
SELECT
  name,
  tournament_name,
  player_rating,
  performance_rating::numeric as performance_rating,
  tie_breaks::json->'TB1' as wins,
  tie_breaks::json->'TB2' as buchholz,
  tie_breaks::json->'TB3' as sonneborn_berger,
  confidence,
  "UNIQUE_NO"
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
  AND performance_rating IS NOT NULL
ORDER BY performance_rating::numeric DESC;


-- 2. Find players who appear in BOTH individual AND team tournaments
-- These should show aggregated stats in rankings
SELECT
  "UNIQUE_NO",
  MAX(name) as name,
  COUNT(DISTINCT tournament_id) as total_tournaments,
  COUNT(DISTINCT CASE
    WHEN tournament_id IN (SELECT id::text FROM team_tournaments)
    THEN tournament_id
  END) as team_tournaments,
  COUNT(DISTINCT CASE
    WHEN tournament_id NOT IN (SELECT id::text FROM team_tournaments)
    THEN tournament_id
  END) as individual_tournaments,
  STRING_AGG(DISTINCT tournament_name, ', ' ORDER BY tournament_name) as all_tournaments,
  ROUND(AVG(CASE WHEN performance_rating IS NOT NULL
    THEN performance_rating::numeric END), 2) as avg_performance
FROM active_players_august_2025_profiles
WHERE "UNIQUE_NO" IS NOT NULL AND "UNIQUE_NO" != ''
GROUP BY "UNIQUE_NO"
HAVING COUNT(DISTINCT tournament_id) > 1
  AND COUNT(DISTINCT CASE WHEN tournament_id IN (SELECT id::text FROM team_tournaments) THEN tournament_id END) > 0
  AND COUNT(DISTINCT CASE WHEN tournament_id NOT IN (SELECT id::text FROM team_tournaments) THEN tournament_id END) > 0
ORDER BY avg_performance DESC NULLS LAST;


-- 3. Verify tie_breaks format matches what rankings page expects
-- Should have non-null, non-empty values for TB1, TB2, TB3
SELECT
  'Team Tournament Records' as source,
  COUNT(*) as total,
  SUM(CASE
    WHEN tie_breaks IS NOT NULL
      AND tie_breaks != ''
      AND tie_breaks::json->'TB1' IS NOT NULL
      AND (tie_breaks::json->'TB1')::text::numeric > 0
    THEN 1 ELSE 0
  END) as has_valid_tb1,
  SUM(CASE
    WHEN tie_breaks IS NOT NULL
      AND tie_breaks != ''
      AND tie_breaks::json->'TB2' IS NOT NULL
      AND (tie_breaks::json->'TB2')::text::numeric > 0
    THEN 1 ELSE 0
  END) as has_valid_tb2,
  SUM(CASE
    WHEN performance_rating IS NOT NULL
      AND performance_rating != ''
    THEN 1 ELSE 0
  END) as has_performance
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments);


-- 4. Test the exact filter used by rankings page
-- This mimics the logic in page.tsx:42-49
WITH filtered_tournaments AS (
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
    AND "UNIQUE_NO" != ''
    -- Apply the same filter as rankings page
    AND tie_breaks IS NOT NULL
    AND tie_breaks != ''
    AND tie_breaks != '{}'
    AND performance_rating IS NOT NULL
    AND performance_rating != ''
    -- Check if tie_breaks has valid values (not all zeros/nulls)
    AND (
      tie_breaks::json->'TB1' IS NOT NULL
      OR tie_breaks::json->'TB2' IS NOT NULL
      OR tie_breaks::json->'TB3' IS NOT NULL
    )
)
SELECT
  type,
  COUNT(*) as valid_for_rankings,
  COUNT(DISTINCT "UNIQUE_NO") as unique_players,
  MIN(performance_rating::numeric) as min_perf,
  MAX(performance_rating::numeric) as max_perf,
  ROUND(AVG(performance_rating::numeric), 2) as avg_perf
FROM filtered_tournaments
GROUP BY type;


-- 5. Show a sample player who appears in both types
-- Pick one and show all their tournament records
DO $$
DECLARE
  sample_player TEXT;
BEGIN
  -- Get a player who appears in both
  SELECT "UNIQUE_NO" INTO sample_player
  FROM active_players_august_2025_profiles
  WHERE "UNIQUE_NO" IS NOT NULL AND "UNIQUE_NO" != ''
  GROUP BY "UNIQUE_NO"
  HAVING COUNT(DISTINCT CASE WHEN tournament_id IN (SELECT id::text FROM team_tournaments) THEN 1 END) > 0
    AND COUNT(DISTINCT CASE WHEN tournament_id NOT IN (SELECT id::text FROM team_tournaments) THEN 1 END) > 0
  LIMIT 1;

  IF sample_player IS NOT NULL THEN
    RAISE NOTICE 'Sample player with both tournament types: %', sample_player;
  END IF;
END $$;

-- Show the sample (replace the UNIQUE_NO below with output from above if needed)
/*
SELECT
  name,
  tournament_name,
  CASE
    WHEN tournament_id IN (SELECT id::text FROM team_tournaments)
    THEN 'Team'
    ELSE 'Individual'
  END as type,
  performance_rating,
  tie_breaks,
  created_at
FROM active_players_august_2025_profiles
WHERE "UNIQUE_NO" = 'PUT_UNIQUE_NO_HERE'
ORDER BY created_at DESC;
*/

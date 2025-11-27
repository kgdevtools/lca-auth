-- =====================================================
-- WORKING VERSION: Team Tournament Performance Update
-- =====================================================
-- Updates based on unique combination of name + tournament_id
-- since there's no id column in active_players_august_2025_profiles
-- =====================================================

-- Step 1: Check current state
SELECT
  'BEFORE UPDATE' as step,
  COUNT(*) as team_tournament_records,
  SUM(CASE WHEN performance_rating IS NULL THEN 1 ELSE 0 END) as missing_performance,
  SUM(CASE WHEN tie_breaks IS NULL THEN 1 ELSE 0 END) as missing_tiebreaks
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments);


-- Step 2: Preview what will be calculated (first 20 records)
WITH player_games AS (
  SELECT
    app.name,
    app.tournament_id,
    app.tournament_name,
    bp.id as game_id,
    -- Player's score in this game
    CASE
      WHEN bp.white_player_id = tp.id THEN bp.white_score
      WHEN bp.black_player_id = tp.id THEN bp.black_score
    END as score,
    -- Opponent rating
    CASE
      WHEN bp.white_player_id = tp.id THEN bp.black_rating
      WHEN bp.black_player_id = tp.id THEN bp.white_rating
    END as opp_rating,
    -- Result adjustment for performance calculation
    CASE
      WHEN bp.white_player_id = tp.id AND bp.white_score = 1 THEN 400
      WHEN bp.black_player_id = tp.id AND bp.black_score = 1 THEN 400
      WHEN bp.white_player_id = tp.id AND bp.white_score = 0.5 THEN 0
      WHEN bp.black_player_id = tp.id AND bp.black_score = 0.5 THEN 0
      ELSE -400
    END as result_adjustment
  FROM active_players_august_2025_profiles app
  JOIN team_tournaments tt ON tt.id::text = app.tournament_id
  JOIN teams t ON t.team_tournament_id = tt.id
  JOIN team_players tp ON tp.team_id = t.id
    AND UPPER(TRIM(tp.player_name)) = UPPER(TRIM(app.name))
  JOIN team_rounds tr ON tr.team_tournament_id = tt.id
  JOIN team_pairings tpair ON tpair.team_round_id = tr.id
  JOIN board_pairings bp ON bp.team_pairing_id = tpair.id
  WHERE (bp.white_player_id = tp.id OR bp.black_player_id = tp.id)
    AND bp.result != 'FORFEIT'
    AND bp.white_rating IS NOT NULL
    AND bp.black_rating IS NOT NULL
    AND app.performance_rating IS NULL
),
player_stats AS (
  SELECT
    name,
    tournament_id,
    tournament_name,
    COUNT(*) as games,
    SUM(score) as total_points,
    SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as wins,
    -- Performance rating: average of (opponent_rating + adjustment)
    ROUND(AVG(opp_rating + result_adjustment)) as performance_rating,
    -- TB2: Sum of opponent ratings (proxy for Buchholz)
    ROUND(SUM(opp_rating), 1) as buchholz_proxy,
    -- TB3: Sonneborn-Berger proxy
    ROUND(
      SUM(
        CASE
          WHEN score = 1 THEN opp_rating
          WHEN score = 0.5 THEN opp_rating * 0.5
          ELSE 0
        END
      ),
      1
    ) as sonneborn_proxy
  FROM player_games
  GROUP BY name, tournament_id, tournament_name
)
SELECT
  name,
  tournament_name,
  games,
  total_points,
  wins,
  performance_rating,
  buchholz_proxy,
  sonneborn_proxy
FROM player_stats
ORDER BY performance_rating DESC
LIMIT 20;


-- Step 3: PERFORM THE UPDATE
WITH player_games AS (
  SELECT
    app.name,
    app.tournament_id,
    app.tournament_name,
    bp.id as game_id,
    CASE
      WHEN bp.white_player_id = tp.id THEN bp.white_score
      WHEN bp.black_player_id = tp.id THEN bp.black_score
    END as score,
    CASE
      WHEN bp.white_player_id = tp.id THEN bp.black_rating
      WHEN bp.black_player_id = tp.id THEN bp.white_rating
    END as opp_rating,
    CASE
      WHEN bp.white_player_id = tp.id AND bp.white_score = 1 THEN 400
      WHEN bp.black_player_id = tp.id AND bp.black_score = 1 THEN 400
      WHEN bp.white_player_id = tp.id AND bp.white_score = 0.5 THEN 0
      WHEN bp.black_player_id = tp.id AND bp.black_score = 0.5 THEN 0
      ELSE -400
    END as result_adjustment
  FROM active_players_august_2025_profiles app
  JOIN team_tournaments tt ON tt.id::text = app.tournament_id
  JOIN teams t ON t.team_tournament_id = tt.id
  JOIN team_players tp ON tp.team_id = t.id
    AND UPPER(TRIM(tp.player_name)) = UPPER(TRIM(app.name))
  JOIN team_rounds tr ON tr.team_tournament_id = tt.id
  JOIN team_pairings tpair ON tpair.team_round_id = tr.id
  JOIN board_pairings bp ON bp.team_pairing_id = tpair.id
  WHERE (bp.white_player_id = tp.id OR bp.black_player_id = tp.id)
    AND bp.result != 'FORFEIT'
    AND bp.white_rating IS NOT NULL
    AND bp.black_rating IS NOT NULL
    AND app.performance_rating IS NULL
),
player_stats AS (
  SELECT
    name,
    tournament_id,
    tournament_name,
    COUNT(*) as games,
    SUM(score) as total_points,
    SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as wins,
    ROUND(AVG(opp_rating + result_adjustment)) as performance_rating,
    ROUND(SUM(opp_rating), 1) as buchholz_proxy,
    ROUND(
      SUM(
        CASE
          WHEN score = 1 THEN opp_rating
          WHEN score = 0.5 THEN opp_rating * 0.5
          ELSE 0
        END
      ),
      1
    ) as sonneborn_proxy
  FROM player_games
  GROUP BY name, tournament_id, tournament_name
)
UPDATE active_players_august_2025_profiles app
SET
  performance_rating = ps.performance_rating::text,
  tie_breaks = jsonb_build_object(
    'TB1', ps.wins,
    'TB2', ps.buchholz_proxy,
    'TB3', ps.sonneborn_proxy
  )::text,
  classifications = jsonb_build_object(
    'TB1', 'NUMBER_OF_WINS',
    'TB2', 'BUCHHOLZ',
    'TB3', 'SONNEBORN_BERGER'
  )::text
FROM player_stats ps
WHERE app.name = ps.name
  AND app.tournament_id = ps.tournament_id
  AND app.tournament_name = ps.tournament_name
  AND ps.games > 0;


-- Step 4: Verify the update worked
SELECT
  'AFTER UPDATE' as step,
  COUNT(*) as total_team_records,
  SUM(CASE WHEN performance_rating IS NOT NULL THEN 1 ELSE 0 END) as has_performance,
  SUM(CASE WHEN performance_rating IS NULL THEN 1 ELSE 0 END) as still_missing,
  MIN(performance_rating::numeric) as min_rating,
  MAX(performance_rating::numeric) as max_rating,
  ROUND(AVG(performance_rating::numeric), 2) as avg_rating
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments);


-- Step 5: Show updated records
SELECT
  name,
  tournament_name,
  player_rating,
  performance_rating,
  tie_breaks::json->'TB1' as tb1_wins,
  tie_breaks::json->'TB2' as tb2_buchholz,
  tie_breaks::json->'TB3' as tb3_sonneborn
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
  AND performance_rating IS NOT NULL
ORDER BY performance_rating::numeric DESC
LIMIT 20;


-- Step 6: Compare with individual tournaments
SELECT
  CASE
    WHEN tournament_id IN (SELECT id::text FROM team_tournaments) THEN 'Team Tournament'
    ELSE 'Individual Tournament'
  END as type,
  COUNT(*) as records,
  COUNT(DISTINCT name) as unique_players,
  SUM(CASE WHEN performance_rating IS NOT NULL THEN 1 ELSE 0 END) as with_performance,
  ROUND(AVG(CASE WHEN performance_rating IS NOT NULL THEN performance_rating::numeric END), 2) as avg_perf
FROM active_players_august_2025_profiles
GROUP BY type;

-- =====================================================
-- Team Tournament System - SQL Migration
-- Created: 2025-11-26
-- Instructions: Copy and paste these queries into
--               Supabase SQL Editor and run them
-- =====================================================

-- =====================================================
-- 1. CREATE TEAM_TOURNAMENTS TABLE
-- =====================================================
CREATE TABLE team_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_name TEXT NOT NULL,
  organizer TEXT,
  chief_arbiter TEXT,
  deputy_chief_arbiter TEXT,
  tournament_director TEXT,
  arbiter TEXT,
  location TEXT,
  date TEXT, -- Store as text, parse to date on frontend when needed
  rounds INTEGER DEFAULT 0, -- Total rounds uploaded so far
  tournament_type TEXT DEFAULT 'Team',
  source TEXT, -- Original file names (comma-separated or JSON)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_tournaments_name ON team_tournaments(tournament_name);
CREATE INDEX idx_team_tournaments_location ON team_tournaments(location);
-- Note: Removed date index since it's now TEXT (can still add if needed for text search)

-- =====================================================
-- 2. CREATE TEAMS TABLE
-- =====================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_tournament_id UUID REFERENCES team_tournaments(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  rank INTEGER, -- Final standing (calculated after all rounds)
  match_points DECIMAL DEFAULT 0, -- Points from match wins/draws (2 for win, 1 for draw, 0 for loss)
  game_points DECIMAL DEFAULT 0, -- Sum of all board scores
  tie_breaks JSONB DEFAULT '{}'::jsonb, -- TB1, TB2, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_tournament_id, team_name)
);

CREATE INDEX idx_teams_tournament ON teams(team_tournament_id);
CREATE INDEX idx_teams_name ON teams(team_name);
CREATE INDEX idx_teams_rank ON teams(team_tournament_id, rank);
CREATE INDEX idx_teams_points ON teams(team_tournament_id, match_points DESC, game_points DESC);

-- =====================================================
-- 3. CREATE TEAM_PLAYERS TABLE
-- =====================================================
CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  rating INTEGER,
  title TEXT, -- GM, IM, FM, WGM, etc.
  board_number INTEGER, -- Primary board assignment (1-8)
  games_played INTEGER DEFAULT 0,
  points DECIMAL DEFAULT 0,
  performance_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, player_name)
);

CREATE INDEX idx_team_players_team ON team_players(team_id);
CREATE INDEX idx_team_players_name ON team_players(player_name);
CREATE INDEX idx_team_players_rating ON team_players(rating DESC);
CREATE INDEX idx_team_players_board ON team_players(team_id, board_number);

-- =====================================================
-- 4. CREATE TEAM_ROUNDS TABLE
-- =====================================================
CREATE TABLE team_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_tournament_id UUID REFERENCES team_tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  round_date TEXT, -- Store as text, parse to date on frontend when needed
  source_file TEXT, -- Original filename
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_tournament_id, round_number)
);

CREATE INDEX idx_team_rounds_tournament ON team_rounds(team_tournament_id);
CREATE INDEX idx_team_rounds_number ON team_rounds(team_tournament_id, round_number);

-- =====================================================
-- 5. CREATE TEAM_PAIRINGS TABLE
-- =====================================================
CREATE TABLE team_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_round_id UUID REFERENCES team_rounds(id) ON DELETE CASCADE NOT NULL,
  pairing_number TEXT NOT NULL, -- e.g., "18.1", "6.2"
  team_white_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  team_black_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  team_white_score DECIMAL NOT NULL,
  team_black_score DECIMAL NOT NULL,
  is_forfeit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_pairings_round ON team_pairings(team_round_id);
CREATE INDEX idx_team_pairings_white ON team_pairings(team_white_id);
CREATE INDEX idx_team_pairings_black ON team_pairings(team_black_id);

-- =====================================================
-- 6. CREATE BOARD_PAIRINGS TABLE
-- =====================================================
CREATE TABLE board_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_pairing_id UUID REFERENCES team_pairings(id) ON DELETE CASCADE NOT NULL,
  board_number INTEGER NOT NULL,
  white_player_id UUID REFERENCES team_players(id) ON DELETE SET NULL,
  black_player_id UUID REFERENCES team_players(id) ON DELETE SET NULL,
  white_rating INTEGER,
  black_rating INTEGER,
  result TEXT NOT NULL, -- "1:0", "0:1", "½:½", "0:0"
  white_score DECIMAL NOT NULL,
  black_score DECIMAL NOT NULL,
  white_result TEXT NOT NULL, -- "win", "draw", "loss", "forfeit"
  black_result TEXT NOT NULL, -- "win", "draw", "loss", "forfeit"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_board_pairings_team_pairing ON board_pairings(team_pairing_id);
CREATE INDEX idx_board_pairings_white_player ON board_pairings(white_player_id);
CREATE INDEX idx_board_pairings_black_player ON board_pairings(black_player_id);
CREATE INDEX idx_board_pairings_board ON board_pairings(team_pairing_id, board_number);

-- =====================================================
-- 7. ADD TRIGGER FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_team_tournaments_updated_at
  BEFORE UPDATE ON team_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_players_updated_at
  BEFORE UPDATE ON team_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ADD ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE team_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_pairings ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view)
CREATE POLICY "Public read access for team_tournaments"
  ON team_tournaments FOR SELECT
  USING (true);

CREATE POLICY "Public read access for teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Public read access for team_players"
  ON team_players FOR SELECT
  USING (true);

CREATE POLICY "Public read access for team_rounds"
  ON team_rounds FOR SELECT
  USING (true);

CREATE POLICY "Public read access for team_pairings"
  ON team_pairings FOR SELECT
  USING (true);

CREATE POLICY "Public read access for board_pairings"
  ON board_pairings FOR SELECT
  USING (true);

-- Admin-only write access (insert, update, delete)
-- Note: Replace 'admin' with your actual admin role value from profiles table
CREATE POLICY "Admin write access for team_tournaments"
  ON team_tournaments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin write access for teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin write access for team_players"
  ON team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin write access for team_rounds"
  ON team_rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin write access for team_pairings"
  ON team_pairings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin write access for board_pairings"
  ON board_pairings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to get team standings for a tournament
CREATE OR REPLACE FUNCTION get_team_standings(tournament_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  rank INTEGER,
  match_points DECIMAL,
  game_points DECIMAL,
  tie_breaks JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.team_name,
    t.rank,
    t.match_points,
    t.game_points,
    t.tie_breaks
  FROM teams t
  WHERE t.team_tournament_id = tournament_id
  ORDER BY
    t.match_points DESC,
    t.game_points DESC,
    t.rank ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team statistics
CREATE OR REPLACE FUNCTION calculate_team_statistics(tournament_id UUID)
RETURNS void AS $$
DECLARE
  team_record RECORD;
  total_match_points DECIMAL;
  total_game_points DECIMAL;
BEGIN
  -- Loop through each team
  FOR team_record IN
    SELECT id FROM teams WHERE team_tournament_id = tournament_id
  LOOP
    -- Calculate match points and game points from pairings
    SELECT
      COALESCE(SUM(
        CASE
          WHEN tp.team_white_id = team_record.id THEN
            CASE
              WHEN tp.team_white_score > tp.team_black_score THEN 2
              WHEN tp.team_white_score = tp.team_black_score THEN 1
              ELSE 0
            END
          WHEN tp.team_black_id = team_record.id THEN
            CASE
              WHEN tp.team_black_score > tp.team_white_score THEN 2
              WHEN tp.team_black_score = tp.team_white_score THEN 1
              ELSE 0
            END
        END
      ), 0),
      COALESCE(SUM(
        CASE
          WHEN tp.team_white_id = team_record.id THEN tp.team_white_score
          WHEN tp.team_black_id = team_record.id THEN tp.team_black_score
        END
      ), 0)
    INTO total_match_points, total_game_points
    FROM team_pairings tp
    JOIN team_rounds tr ON tp.team_round_id = tr.id
    WHERE tr.team_tournament_id = tournament_id
      AND (tp.team_white_id = team_record.id OR tp.team_black_id = team_record.id);

    -- Update team record
    UPDATE teams
    SET
      match_points = total_match_points,
      game_points = total_game_points,
      updated_at = NOW()
    WHERE id = team_record.id;
  END LOOP;

  -- Calculate rankings
  UPDATE teams t
  SET rank = subquery.new_rank
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY match_points DESC, game_points DESC, team_name ASC
      ) as new_rank
    FROM teams
    WHERE team_tournament_id = tournament_id
  ) AS subquery
  WHERE t.id = subquery.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE team_tournaments IS 'Stores team tournament metadata';
COMMENT ON TABLE teams IS 'Stores team information and standings for each tournament';
COMMENT ON TABLE team_players IS 'Stores individual players that are part of teams';
COMMENT ON TABLE team_rounds IS 'Stores round information (one record per round file uploaded)';
COMMENT ON TABLE team_pairings IS 'Stores team vs team pairings for each round';
COMMENT ON TABLE board_pairings IS 'Stores individual board games within each team pairing';

COMMENT ON COLUMN teams.match_points IS 'Points from team match results: 2 for win, 1 for draw, 0 for loss';
COMMENT ON COLUMN teams.game_points IS 'Sum of all board points for the team';
COMMENT ON COLUMN board_pairings.result IS 'Game result in format: 1:0, 0:1, ½:½, or 0:0';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this migration:
-- 1. Verify all tables were created successfully
-- 2. Check that indexes are in place
-- 3. Verify RLS policies are active
-- 4. Test the helper functions
-- =====================================================

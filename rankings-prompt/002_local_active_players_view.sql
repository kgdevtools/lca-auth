-- Materialized view: rs_local_active_players
-- Combines every sd_players row (one per tournament appearance) with personal
-- details from rs_players, resolved via fuzzy name matching.
-- Players with no rs_players match get NULLs on registry columns.
--
-- Matching approach (PostgreSQL-native approximation of the TypeScript scorer):
--   • unaccent()       — strip diacritics  (≈ NFD normalization in TS)
--   • pg_trgm          — trigram similarity (≈ Jaccard on tokens)
--   • word_similarity  — partial/subset matching (≈ Jaro-Winkler on subsets)
--   • sorted tokens    — order-invariant    (≈ token sort in TS)
--
-- Paste into the Supabase SQL editor and run in order (all at once is fine).
-- To refresh after new data: REFRESH MATERIALIZED VIEW public.rs_local_active_players;

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Helper: normalise a player name ──────────────────────────────────────────
-- Lowercase, punctuation → space, collapse whitespace.

CREATE OR REPLACE FUNCTION public.normalise_player_name(n text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT trim(
    regexp_replace(
      lower(regexp_replace(coalesce(n, ''), '[^a-zA-Z0-9\s]', ' ', 'g')),
      '\s+', ' ', 'g'
    )
  )
$$;

-- ── Helper: sort name tokens (makes matching order-invariant) ─────────────────
-- "Smith John" and "John Smith" both become "john smith" after sorting.

CREATE OR REPLACE FUNCTION public.sort_player_name_tokens(n text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT string_agg(tok, ' ' ORDER BY tok)
  FROM unnest(string_to_array(public.normalise_player_name(n), ' ')) AS tok
  WHERE tok <> ''
$$;

-- ── GIN index on rs_players for fast trigram lookups ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_rs_players_name_trgm
  ON public.rs_players
  USING GIN (public.sort_player_name_tokens(name) gin_trgm_ops)
  WHERE is_inactive = false;

-- ── Helper: detect the performance rating inside a tie_breaks object ──────────
-- tie_breaks is a bag of numeric values under opaque, tournament-specific keys
-- (TB1, TB2, …). The positional key is NOT stable, so we never read a fixed key.
--
-- Heuristic: performance rating is the value that "looks like a rating", whereas
-- point-based tie-breaks (Buchholz, Sonneborn-Berger, Direct Encounter, …) are
-- sums of game scores that stay small. We keep numeric values in the rating band
-- [100, 3500] — the lower bound excludes the point-sums — and take the largest
-- when several qualify. Returns NULL when nothing in the bag looks like a rating
-- (e.g. a 1-value object holding only a Buchholz score).
CREATE OR REPLACE FUNCTION public.detect_performance_rating(tb jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT max(val)
  FROM (
    -- Project only numeric values; the WHERE filter runs before this cast,
    -- so non-numeric tie-breaks never reach (value::text)::numeric.
    SELECT (value::text)::numeric AS val
    FROM jsonb_each(coalesce(tb, '{}'::jsonb))
    WHERE jsonb_typeof(value) = 'number'
  ) nums
  WHERE val BETWEEN 100 AND 3500
$$;

-- ── Materialized view ─────────────────────────────────────────────────────────

-- Rebuild-safe: a materialized view cannot be ALTERed to add a column and has no
-- CREATE OR REPLACE form, so re-running this migration drops and recreates it.
-- Nothing depends on the view (only REFRESH calls in 004), so no CASCADE needed.
-- Its indexes drop with it and are recreated by the CREATE block below.
DROP MATERIALIZED VIEW IF EXISTS public.rs_local_active_players;

CREATE MATERIALIZED VIEW public.rs_local_active_players AS

WITH name_matches AS (
  -- Resolve best rs_player for each distinct sd_players name.
  -- Done once per unique name, then joined back to all sd_players rows.
  SELECT DISTINCT ON (sd_name)
    sd_name,
    rs_id,
    match_score
  FROM (
    SELECT
      sd.name AS sd_name,
      rs.id   AS rs_id,
      -- Use the higher of the two scores:
      --   similarity()      ≈ full-name trigram overlap (good for same-length names)
      --   word_similarity() ≈ best-substring match    (good for subset names)
      greatest(
        similarity(
          public.sort_player_name_tokens(sd.name),
          public.sort_player_name_tokens(rs.name)
        ),
        word_similarity(
          public.sort_player_name_tokens(sd.name),
          public.sort_player_name_tokens(rs.name)
        )
      ) AS match_score
    FROM (
      SELECT DISTINCT name
      FROM public.sd_players
      WHERE name IS NOT NULL AND trim(name) <> ''
    ) sd
    JOIN public.rs_players rs
      -- Only consider active players (drastically reduces the search space)
      ON rs.is_inactive = false
      -- Pre-filter using GIN index before scoring (cheap, inclusive)
      AND (
        public.sort_player_name_tokens(rs.name) % public.sort_player_name_tokens(sd.name)
        OR public.sort_player_name_tokens(sd.name) <<% public.sort_player_name_tokens(rs.name)
      )
  ) scored
  -- Of all candidates, pick the highest scoring one per sd name
  ORDER BY sd_name, match_score DESC
)

SELECT
  -- sd_players columns (one row per tournament appearance)
  sp.id                                           AS sd_player_id,
  sp.tournament_id,
  sp.rank,
  sp.name,
  public.sort_player_name_tokens(sp.name)         AS name_sorted,
  sp.federation,
  sp.rating           AS tournament_rating,
  sp.points,
  sp.rounds,
  sp.tie_breaks,        -- raw tournament tie-breaks jsonb, e.g. {"TB2": 7, "TB5": 1362}
  public.detect_performance_rating(sp.tie_breaks)  AS performance_rating,
                        -- heuristically extracted from tie_breaks (NULL if none looks like a rating)
  -- match metadata
  nm.match_score,
  -- rs_players columns (NULL if no match above threshold)
  rp.id               AS rs_player_id,
  rp.unique_no,
  rp.birth_date,
  rp.birth_year,
  rp.sex,
  rp.title,
  rp.fide_id,
  rp.fide_rating,
  rp.current_rating
FROM public.sd_players sp
LEFT JOIN name_matches nm
       ON nm.sd_name    = sp.name
      AND nm.match_score >= 0.4          -- minimum quality threshold
LEFT JOIN public.rs_players rp
       ON rp.id = nm.rs_id

WITH DATA;

-- ── Indexes on the materialized view for fast querying ────────────────────────

CREATE INDEX ON public.rs_local_active_players (tournament_id);
CREATE INDEX ON public.rs_local_active_players USING GIN (name_sorted gin_trgm_ops);
CREATE INDEX ON public.rs_local_active_players (rs_player_id);
CREATE INDEX ON public.rs_local_active_players (fide_id);
CREATE INDEX ON public.rs_local_active_players (unique_no);
CREATE INDEX ON public.rs_local_active_players (performance_rating);

-- Add SELECT policies for cdc_tournament_8_2025_games (keeps existing INSERT/DELETE policies intact)

-- Allow authenticated users to read games
CREATE POLICY "Allow authenticated users to read games"
ON public.cdc_tournament_8_2025_games
FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to read games
CREATE POLICY "Allow anonymous users to read games"
ON public.cdc_tournament_8_2025_games
FOR SELECT
TO anon
USING (true);

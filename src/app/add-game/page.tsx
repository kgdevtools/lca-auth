// src/app/add-game/page.tsx
// Server entry: resolves the session (auth gate) and the tournament registry, then
// hands off to the client. Writes hit the unified `games` table via
// @/lib/chess-games/actions; logged-out users can browse but not edit.

import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { listTournaments } from "@/lib/chess-games/actions";
import { AddGameClient } from "./AddGameClient";

export const metadata: Metadata = {
  title: "Add Game | Limpopo Chess Academy",
  description: "Add tournament games by pasting PGN or uploading a file.",
};

export default async function AddGamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { tournaments } = await listTournaments();

  return <AddGameClient isAuthed={!!user} initialTournaments={tournaments} />;
}

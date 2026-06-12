"use client";

import dynamic from "next/dynamic";
import { type GameData, type TournamentMeta } from "@/lib/chess-games/actions";

// The board (chess.js + chessboard) is browser-only; loading it without SSR is
// what lets the home page be statically regenerated instead of force-dynamic.
const HomeBoard = dynamic(() => import("./HomeBoard").then((m) => m.HomeBoard), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[560px] mx-auto lg:ml-auto lg:mr-8">
      <div className="h-6 mb-1.5" />
      <div className="h-9 rounded-t bg-muted/40" />
      <div className="w-full aspect-square bg-muted/20 animate-pulse" />
      <div className="h-9 mt-2 rounded bg-muted/30" />
    </div>
  ),
});

export function TournamentGamesCardClient({
  games,
  selectedTournament,
}: {
  games: GameData[];
  selectedTournament: TournamentMeta | null;
}) {
  return <HomeBoard games={games} tournament={selectedTournament} />;
}

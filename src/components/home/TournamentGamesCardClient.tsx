"use client";

import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Link from "next/link";
import { type GameData, type TournamentMeta } from "@/app/view/actions";

export function TournamentGamesCardClient({
  games,
  selectedTournament,
}: {
  games: GameData[];
  selectedTournament: TournamentMeta | null;
}) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string | null>>(
    {},
  );
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [boardWidth, setBoardWidth] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chessRef = useRef(new Chess());

  useEffect(() => {
    if (games.length === 0 || currentGameIndex >= games.length) return;
    const currentGame = games[currentGameIndex];
    if (!currentGame?.pgn) return;
    try {
      chessRef.current.loadPgn(currentGame.pgn);
      setGameHeaders(chessRef.current.header());
      const history = chessRef.current.history({ verbose: true });
      const temp = new Chess();
      const fens: string[] = [temp.fen()];
      history.forEach((move) => {
        temp.move(move.san);
        fens.push(temp.fen());
      });
      setFenHistory(fens);
      setCurrentMoveIndex(-1);
    } catch {
      setFenHistory([new Chess().fen()]);
      setCurrentMoveIndex(-1);
    }
  }, [games, currentGameIndex]);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setBoardWidth(containerRef.current.offsetWidth);
      }
    }
    const t = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (fenHistory.length === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentMoveIndex((prev) => {
        const next = prev + 1;
        if (next >= fenHistory.length - 1) {
          setTimeout(() => {
            setCurrentGameIndex((p) => (p + 1) % games.length);
            setCurrentMoveIndex(-1);
          }, 2000);
          return prev;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fenHistory, games.length]);

  if (games.length === 0) {
    return (
      <Link
        href="/view"
        className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-6 flex items-center justify-center"
      >
        <p className="text-muted-foreground">No games available</p>
      </Link>
    );
  }

  const currentFen =
    fenHistory[currentMoveIndex + 1] || fenHistory[0] || "start";

  const getCustomSquareStyles = () => {
    if (currentMoveIndex < 0 || fenHistory.length === 0) return {};
    try {
      const history = chessRef.current.history({ verbose: true });
      const lastMove = history[currentMoveIndex];
      if (!lastMove) return {};
      return {
        [lastMove.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        [lastMove.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
      };
    } catch {
      return {};
    }
  };

  const formattedDate = selectedTournament?.created_at
    ? new Date(selectedTournament.created_at).toLocaleDateString("en-CA")
    : "";

  return (
    // No overflow-hidden, no h-full — card grows to fit board naturally
    <Link
      href="/view"
      className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col group w-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-muted/30 border-b border-border/50 rounded-t-lg">
        {selectedTournament && (
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 gap-2">
            <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide truncate leading-tight flex-1">
              {selectedTournament.alias ||
                selectedTournament.display_name ||
                selectedTournament.name}
            </p>
            {formattedDate && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums flex-shrink-0">
                {formattedDate}
              </span>
            )}
          </div>
        )}
        <div className="flex items-stretch h-9 border-t border-border/40">
          <div className="flex-[2] min-w-0 bg-white flex items-center px-3">
            <span className="text-sm font-black text-black truncate uppercase tracking-tight leading-none">
              {gameHeaders.White || "White"}
            </span>
          </div>
          <div className="flex-shrink-0 min-w-[56px] bg-primary flex items-center justify-center border-x border-primary-foreground/20 px-2">
            <span className="text-sm font-black text-primary-foreground leading-none tabular-nums whitespace-nowrap">
              {gameHeaders.Result || "VS"}
            </span>
          </div>
          <div className="flex-[2] min-w-0 bg-neutral-900 flex items-center justify-end px-3">
            <span className="text-sm font-black text-white truncate uppercase tracking-tight text-right leading-none">
              {gameHeaders.Black || "Black"}
            </span>
          </div>
        </div>
      </div>

      {/* Board — measured container, explicit square div, no clipping */}
      <div ref={containerRef} className="w-full rounded-b-lg overflow-hidden">
        {boardWidth > 0 && (
          <div style={{ width: boardWidth, height: boardWidth }}>
            <Chessboard
              boardWidth={boardWidth}
              position={currentFen}
              arePiecesDraggable={false}
              customSquareStyles={getCustomSquareStyles()}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

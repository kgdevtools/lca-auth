"use client";

import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Link from "next/link";
import { type GameData, type TournamentMeta } from "@/app/view/actions";

const MAX_BOARD_WIDTH = 580;

export function TournamentGamesCardClient({
  games,
  selectedTournament,
}: {
  games: GameData[];
  selectedTournament: TournamentMeta | null;
}) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string | null>>({});
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
    if (!containerRef.current) return;
    const computeBoardSize = () => {
      const containerWidth = containerRef.current?.offsetWidth || 0;
      const size = Math.min(containerWidth, MAX_BOARD_WIDTH, window.innerHeight * 0.62);
      setBoardWidth(Math.max(size, 200));
    };
    computeBoardSize();
    const resizeObserver = new ResizeObserver(computeBoardSize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", computeBoardSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", computeBoardSize);
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
        className="rounded-lg border border-border/40 p-6 flex items-center justify-center"
      >
        <p className="text-muted-foreground">No games available</p>
      </Link>
    );
  }

  const currentFen = fenHistory[currentMoveIndex + 1] || fenHistory[0] || "start";

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
    <Link
      href="/view"
      className="flex flex-col group w-full overflow-hidden"
    >
      {/* Header – NO horizontal padding */}
      <div className="flex flex-col items-stretch">
        <div style={{ width: boardWidth > 0 ? boardWidth : "100%", margin: "0 auto" }}>
          {selectedTournament && (
            <div className="flex items-center justify-between pt-2.5 pb-1.5 gap-2">
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
            <div className="flex-shrink-0 min-w-[56px] bg-primary flex items-center justify-center border-x border-primary-foreground/20">
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
      </div>

      {/* Board container – no padding, centered */}
      <div ref={containerRef} className="w-full flex justify-center overflow-hidden">
        {boardWidth > 0 ? (
          <div style={{ width: boardWidth, height: boardWidth }}>
            <Chessboard
              boardWidth={boardWidth}
              position={currentFen}
              arePiecesDraggable={false}
              customSquareStyles={getCustomSquareStyles()}
            />
          </div>
        ) : (
          <div className="w-full aspect-square bg-muted/20 animate-pulse" />
        )}
      </div>
    </Link>
  );
}
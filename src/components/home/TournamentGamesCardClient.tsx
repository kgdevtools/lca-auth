"use client";

import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Link from "next/link";
import { type GameData, type TournamentMeta } from "@/app/view/actions";

export function TournamentGamesCardClient({ 
  games, 
  selectedTournament 
}: { 
  games: GameData[]; 
  selectedTournament: TournamentMeta | null;
}) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string | null>>({});
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [boardWidth, setBoardWidth] = useState<number>(300);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const chessRef = useRef(new Chess());

  // Parse the current game's PGN
  useEffect(() => {
    if (games.length === 0 || currentGameIndex >= games.length) return;

    const currentGame = games[currentGameIndex];
    if (!currentGame?.pgn) return;

    try {
      chessRef.current.loadPgn(currentGame.pgn);

      const headers = chessRef.current.header();
      setGameHeaders(headers);

      // Build FEN history
      const history = chessRef.current.history({ verbose: true });
      const temp = new Chess();
      const fens: string[] = [temp.fen()];
      history.forEach((move) => {
        temp.move(move.san);
        fens.push(temp.fen());
      });

      setFenHistory(fens);
      setCurrentMoveIndex(-1);
    } catch (error) {
      console.error("Error parsing PGN:", error);
      const startFen = new Chess().fen();
      setFenHistory([startFen]);
      setCurrentMoveIndex(-1);
    }
  }, [games, currentGameIndex]);

  // Handle board width resize - use full container width
  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        const container = boardWrapperRef.current;
        const width = container.offsetWidth;
        setBoardWidth(width);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-replay logic
  useEffect(() => {
    if (fenHistory.length === 0) return;

    // Start auto-replay after a short delay
    timerRef.current = setInterval(() => {
      setCurrentMoveIndex((prev) => {
        const nextIndex = prev + 1;

        // If we've reached the end of the game
        if (nextIndex >= fenHistory.length - 1) {
          // Move to next game after 2 seconds and reset move index for the new game
          setTimeout(() => {
            setCurrentGameIndex((prevGameIndex) => (prevGameIndex + 1) % games.length);
            setCurrentMoveIndex(-1); // Reset move index for the next game
          }, 2000);
          return prev; // Keep the last move shown until the next game starts
        }

        return nextIndex;
      });
    }, 1000); // 1 move per second

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fenHistory, games.length]);

  if (games.length === 0) {
    return (
      <Link
        href="/view"
        className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center p-6"
      >
        <p className="text-muted-foreground">No games available</p>
      </Link>
    );
  }

  const currentFen = fenHistory[currentMoveIndex + 1] || fenHistory[0] || "start";

  const getCustomSquareStyles = () => {
    if (currentMoveIndex < 0 || fenHistory.length === 0) return {};

    try {
      const tempChess = new Chess();
      tempChess.load(fenHistory[currentMoveIndex + 1] || fenHistory[0]);

      const history = chessRef.current.history({ verbose: true });
      if (currentMoveIndex >= history.length) return {};

      const lastMove = history[currentMoveIndex];
      if (!lastMove) return {};

      return {
        [lastMove.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" }, // Light mode yellow
        [lastMove.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },   // Light mode yellow
        // You can add dark mode specific colors here using CSS variables or theme context
      };
    } catch (error) {
      console.error("Error getting custom square styles:", error);
      return {};
    }
  };

  return (
    <Link
      href="/view"
      className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col group"
    >
      {/* Game Info - Compact header */}
      <div className="bg-muted/30 border-b border-border/50 px-2 py-1.5 flex-shrink-0">
        {selectedTournament && (
          <div className="flex flex-col items-center gap-1 mb-1">
            <div className="text-sm font-bold text-foreground leading-tight">
              {selectedTournament.alias || selectedTournament.display_name || selectedTournament.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(selectedTournament.created_at || '').toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-medium">White</div>
            <div className="text-[10px] font-bold text-foreground leading-tight truncate">
              {gameHeaders.White || "White"}
            </div>
            {gameHeaders.WhiteElo && <div className="text-[8px] text-muted-foreground">{gameHeaders.WhiteElo}</div>}
          </div>

          <div className="flex-shrink-0 px-1 py-0.5 bg-primary/10 border border-primary/20 rounded text-center">
            <div className="text-[10px] font-bold text-primary leading-none">{gameHeaders.Result || "*"}</div>
          </div>

          <div className="flex-1 min-w-0 text-right">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-medium">Black</div>
            <div className="text-[10px] font-bold text-foreground leading-tight truncate">
              {gameHeaders.Black || "Black"}
            </div>
            {gameHeaders.BlackElo && <div className="text-[8px] text-muted-foreground">{gameHeaders.BlackElo}</div>}
          </div>
        </div>
      </div>

       {/* Chessboard */}
      <div ref={boardWrapperRef} className="w-full aspect-square overflow-hidden bg-card flex-shrink-0">
        {boardWidth > 0 ? (
          <Chessboard
            boardWidth={boardWidth}
            position={currentFen}
            arePiecesDraggable={false}
            customSquareStyles={getCustomSquareStyles()}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
    </Link>
  );
}
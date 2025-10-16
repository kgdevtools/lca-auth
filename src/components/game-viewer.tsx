'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
type UiMove = Move & { moveNumber: number };

interface GameHistory {
  moves: UiMove[];
  fenHistory: string[];
}

export interface GameData {
  title: string;
  pgn: string;
}

interface GameViewerProps {
  games: GameData[];
}

// --- MAIN COMPONENT ---
export default function GameViewer({ games }: GameViewerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({});
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined);

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>();

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn, [games, currentGameIndex]);
  const fen = useMemo(() => gameHistory.fenHistory[currentMoveIndex + 1] || 'start', [currentMoveIndex, gameHistory.fenHistory]);

  // PGN Processing Logic
  useEffect(() => {
    if (!currentPgn) return;
    
    const game = new Chess();
    try {
      game.loadPgn(currentPgn);

      const headers = game.header() as Record<string, string>;
      setGameHeaders(headers);
      
      const history = game.history({ verbose: true });
      const tempGame = new Chess(); 
      const fenHistory: string[] = [tempGame.fen()];
      
      history.forEach((move) => {
        tempGame.move(move.san);
        fenHistory.push(tempGame.fen());
      });
      
      const movesWithNumbers: UiMove[] = history.map((move, index) => ({
        ...(move as any),
        moveNumber: Math.floor(index / 2) + 1,
      }));
      
      setGameHistory({ moves: movesWithNumbers, fenHistory });
      setCurrentMoveIndex(-1);
    } catch (error) {
      console.error("Failed to load PGN:", error);
      setGameHeaders({});
      setGameHistory({ moves: [], fenHistory: [new Chess().fen()] });
      setCurrentMoveIndex(-1);
    }
  }, [currentPgn]);
  
  // *** FIX: Responsive Board Sizing Logic ***
  // The hook now depends on `isMounted` to ensure it re-runs
  // after the component has rendered on the client.
  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMounted]);

  // Update Last Move Highlight
  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const move = gameHistory.moves[currentMoveIndex];
      setLastMove({ from: move.from, to: move.to });
    } else {
      setLastMove(undefined);
    }
  }, [currentMoveIndex, gameHistory.moves]);

  // Navigation Callbacks
  const navigateTo = useCallback((index: number) => {
    const newIndex = Math.max(-1, Math.min(index, gameHistory.moves.length - 1));
    setCurrentMoveIndex(newIndex);
  }, [gameHistory.moves.length]);

  const handleGameSelect = useCallback((index: number) => {
    setCurrentGameIndex(index);
  }, []);

  if (!isMounted) {
    return <div className="w-full aspect-video bg-muted rounded-xl animate-pulse" />;
  }
  if (!games || games.length === 0) {
    return <div className="p-4 border rounded-lg text-center text-muted-foreground">No games available to display.</div>;
  }

  return (
    <div className="font-sans rounded-xl shadow-lg p-2 sm:p-4 border bg-background">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GameInfo headers={gameHeaders} />
            <GameSelector games={games} currentGameIndex={currentGameIndex} onSelect={handleGameSelect} />
        </div>
        
        <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
          <div className="flex flex-col max-w-lg mx-auto lg:mx-0 w-full">
            <div ref={boardWrapperRef} className="w-full aspect-square shadow-lg rounded-md overflow-hidden border">
                {boardWidth ? (
                    <Chessboard
                        position={fen}
                        boardWidth={boardWidth}
                        arePiecesDraggable={false}
                        customSquareStyles={{
                        ...(lastMove ? {
                            [lastMove.from]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
                            [lastMove.to]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' }
                        } : {})
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-muted animate-pulse" />
                )}
            </div>
            <div className="mt-3">
                <Controls
                    onStart={() => navigateTo(-1)}
                    onPrev={() => navigateTo(currentMoveIndex - 1)}
                    onNext={() => navigateTo(currentMoveIndex + 1)}
                    onEnd={() => navigateTo(gameHistory.moves.length - 1)}
                    canGoBack={currentMoveIndex > -1}
                    canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
                />
            </div>
          </div>
          <MovesList
              moves={gameHistory.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveSelect={navigateTo}
            />
        </main>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

// Game Selector Dropdown
const GameSelector: React.FC<{ games: GameData[], currentGameIndex: number, onSelect: (index: number) => void }> = ({ games, currentGameIndex, onSelect }) => (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm h-full flex flex-col justify-center">
        <h2 className="text-base font-semibold mb-2 text-foreground">Current Game</h2>
        <div className="relative">
            <select
                value={currentGameIndex}
                onChange={(e) => onSelect(parseInt(e.target.value, 10))}
                className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
                {games.map((game, index) => (
                    <option key={index} value={index}>
                        {game.title}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
    </div>
);

// Game Info Panel
const GameInfo: React.FC<{ headers: Record<string, string> }> = React.memo(({ headers }) => (
  <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm">
    <h2 className="text-base font-semibold mb-2 text-foreground tracking-tight">Game Details</h2>
    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground">
      <div><span className="font-medium text-foreground/90">White:</span> {headers.White || 'N/A'}</div>
      <div><span className="font-medium text-foreground/90">Black:</span> {headers.Black || 'N/A'}</div>
      <div><span className="font-medium text-foreground/90">Event:</span> {headers.Event || 'N/A'}</div>
      <div><span className="font-medium text-foreground/90">Result:</span> {headers.Result || 'N/A'}</div>
    </div>
  </div>
));

// Navigation Controls
const Controls: React.FC<{ onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean; }> = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-md shadow-sm">
    <button onClick={onStart} disabled={!canGoBack} aria-label="Go to start" className="flex-1 p-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-5 h-5 mx-auto" /></button>
    <button onClick={onPrev} disabled={!canGoBack} aria-label="Previous move" className="flex-1 p-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-5 h-5 mx-auto" /></button>
    <button onClick={onNext} disabled={!canGoForward} aria-label="Next move" className="flex-1 p-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-5 h-5 mx-auto" /></button>
    <button onClick={onEnd} disabled={!canGoForward} aria-label="Go to end" className="flex-1 p-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-5 h-5 mx-auto" /></button>
  </div>
));

// Moves List Panel
const MovesList: React.FC<{ moves: UiMove[], currentMoveIndex: number, onMoveSelect: (index: number) => void }> = ({ moves, currentMoveIndex, onMoveSelect }) => {
  const movesListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm h-full flex flex-col">
      <h2 className="text-base font-semibold mb-2 text-foreground">Moves</h2>
      <div ref={movesListRef} className="flex-1 overflow-y-auto pr-1 text-sm">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center">
          {moves.map((move, index) => ( index % 2 === 0 ? (
            <React.Fragment key={`move-row-${move.moveNumber}`}>
              <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
              <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
              {moves[index + 1] ? (
                <MoveButton move={moves[index + 1]} index={index + 1} isCurrent={currentMoveIndex === index + 1} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index + 1 ? activeMoveRef : null} />
              ) : <div />}
            </React.Fragment>
          ) : null ))}
        </div>
      </div>
    </div>
  );
};

// Individual Move Button
const MoveButton = React.forwardRef<HTMLButtonElement, { move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (index: number) => void; }>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button ref={ref} onClick={() => onMoveSelect(index)} className={`text-left p-1 rounded transition-colors font-mono tracking-tight ${isCurrent ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-foreground/90'}`}>{move.san}</button>
));
MoveButton.displayName = 'MoveButton';
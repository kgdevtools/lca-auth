'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
// FIX: Import types needed for the new VerboseMove interface
import type { Move, Square, PieceSymbol, Color } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// --- TYPE DEFINITIONS ---

// FIX: Define an accurate type for the object from game.history({ verbose: true })
// This resolves the TypeScript build error.
interface VerboseMove {
  from: Square;
  to: Square;
  piece: PieceSymbol;
  color: Color;
  san: string;
  flags: string;
  lan: string;
  before: string;
  after: string;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
}

interface GameHistory {
  // Use the new VerboseMove type
  moves: (VerboseMove & { moveNumber: number })[];
  fenHistory: string[];
}

export interface GameData {
  title: string;
  pgn: string;
}

interface GameViewerProps {
  games: GameData[];
}


// --- SVG ICONS for Controls ---
const StartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.375 3.094a.75.75 0 0 0-1.06 0L9.81 10.59a2.25 2.25 0 0 0 0 3.182l7.505 7.504a.75.75 0 0 0 1.06-1.06L10.87 12.182a.75.75 0 0 1 0-1.06l7.505-7.504a.75.75 0 0 0 0-1.06Z" /><path d="M6 3a.75.75 0 0 0-.75.75v16.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 6 3Z" /></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M14.78 6.22a.75.75 0 0 1 0 1.06L9.56 12l5.22 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.22 6.22a.75.75 0 0 1 1.06 0l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 0 1-1.06-1.06L14.44 12 9.22 6.78a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>;
const EndIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5.625 3.094a.75.75 0 0 1 1.06 0L14.19 10.59a2.25 2.25 0 0 1 0 3.182l-7.505 7.504a.75.75 0 0 1-1.06-1.06l7.505-7.505a.75.75 0 0 0 0-1.06L5.625 4.154a.75.75 0 0 1 0-1.06Z" /><path d="M18 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 18 3Z" /></svg>;

export default function GameViewer({ games }: GameViewerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({});
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined);

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(400);

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn, [games, currentGameIndex]);
  const fen = useMemo(() => gameHistory.fenHistory[currentMoveIndex + 1] || 'start', [currentMoveIndex, gameHistory.fenHistory]);

  useEffect(() => {
    if (!currentPgn) return;
    
    const game = new Chess();
    try {
      game.loadPgn(currentPgn);

      const headers = game.header();
      const cleanedHeaders: Record<string, string> = {};
      for (const key in headers) {
        if (headers[key]) {
          cleanedHeaders[key] = headers[key] as string;
        }
      }
      setGameHeaders(cleanedHeaders);
      
      const tempGame = new Chess(); 
      const fenHistory: string[] = [tempGame.fen()];
      const movesWithNumbers: (VerboseMove & { moveNumber: number })[] = [];

      const history = game.history({ verbose: true }) as VerboseMove[];
      history.forEach((move, index) => {
        tempGame.move(move.san);
        fenHistory.push(tempGame.fen());
        movesWithNumbers.push({ ...move, moveNumber: Math.floor((index / 2) + 1) });
      });
      
      setGameHistory({ moves: movesWithNumbers, fenHistory });
      setCurrentMoveIndex(-1);
    } catch (error) {
      console.error("Failed to load PGN:", error);
      setGameHeaders({});
      setGameHistory({ moves: [], fenHistory: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'] });
      setCurrentMoveIndex(-1);
    }
  }, [currentPgn]);

  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth);
      }
    }
    if (isMounted) {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMounted]);

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const move = gameHistory.moves[currentMoveIndex];
      setLastMove({ from: move.from, to: move.to });
    } else {
      setLastMove(undefined);
    }
  }, [currentMoveIndex, gameHistory.moves]);

  const navigateTo = useCallback((index: number) => {
    const newIndex = Math.max(-1, Math.min(index, gameHistory.moves.length - 1));
    setCurrentMoveIndex(newIndex);
  }, [gameHistory.moves.length]);

  const goToStart = useCallback(() => navigateTo(-1), [navigateTo]);
  const goToEnd = useCallback(() => navigateTo(gameHistory.moves.length - 1), [navigateTo, gameHistory.moves.length]);
  const goToPrevious = useCallback(() => navigateTo(currentMoveIndex - 1), [navigateTo, currentMoveIndex]);
  const goToNext = useCallback(() => navigateTo(currentMoveIndex + 1), [navigateTo, currentMoveIndex]);
  const handleGameSelect = useCallback((index: number) => {
    setCurrentGameIndex(index);
  }, []);

  if (!isMounted) {
    return <div className="w-full aspect-video bg-muted border rounded-xl animate-pulse" />;
  }
  if (!games || games.length === 0) {
    return <div className="p-4 border rounded-lg text-muted-foreground">No games to display.</div>;
  }

  return (
    <div className="font-sans rounded-xl shadow-lg p-2 sm:p-4 border bg-background">
      <div className="max-w-7xl mx-auto">
        <GameInfo headers={gameHeaders} />
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div className="lg:col-span-2 flex flex-col items-center">
            <div ref={boardWrapperRef} className="w-full max-w-full mx-auto aspect-square mb-2 sm:mb-3">
              <Chessboard
                position={fen}
                boardWidth={boardWidth}
                arePiecesDraggable={false}
                customLightSquareStyle={{ backgroundColor: 'var(--board-light-square)' }}
                customDarkSquareStyle={{ backgroundColor: 'var(--board-dark-square)' }}
                customSquareStyles={{
                  ...(lastMove ? {
                    [lastMove.from]: { backgroundColor: 'var(--board-highlight-square)' },
                    [lastMove.to]: { backgroundColor: 'var(--board-highlight-square)' }
                  } : {})
                }}
              />
            </div>
            <Controls
              onStart={goToStart}
              onPrev={goToPrevious}
              onNext={goToNext}
              onEnd={goToEnd}
              canGoBack={currentMoveIndex > -1}
              canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
            />
          </div>
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg lg:col-span-1 h-fit">
            <MovesList
              moves={gameHistory.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveSelect={navigateTo}
            />
          </div>
        </main>
        <section className="mt-6 sm:mt-8">
          <GamesList
            games={games}
            currentGameIndex={currentGameIndex}
            onGameSelect={handleGameSelect}
          />
        </section>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface ControlsProps { onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean; }
const Controls: React.FC<ControlsProps> = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }) => (
  <div className="flex justify-center items-center gap-1 p-1 bg-muted rounded-md w-full max-w-sm">
    <ControlButton onClick={onStart} disabled={!canGoBack} aria-label="Go to start"><StartIcon /></ControlButton>
    <ControlButton onClick={onPrev} disabled={!canGoBack} aria-label="Previous move"><PrevIcon /></ControlButton>
    <ControlButton onClick={onNext} disabled={!canGoForward} aria-label="Next move"><NextIcon /></ControlButton>
    <ControlButton onClick={onEnd} disabled={!canGoForward} aria-label="Go to end"><EndIcon /></ControlButton>
  </div>
));

const ControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button className="flex-1 flex justify-center items-center p-2 bg-secondary text-secondary-foreground rounded transition-colors hover:bg-secondary/80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed" {...props}>{children}</button>
);

const GameInfo: React.FC<{ headers: Record<string, string> }> = React.memo(({ headers }) => (
  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
    <h2 className="text-lg sm:text-xl font-semibold mb-2 text-foreground tracking-tight">Game Details</h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
      <div><span className="font-medium text-foreground/80">White:</span> {headers.White || 'N/A'}</div>
      <div><span className="font-medium text-foreground/80">Black:</span> {headers.Black || 'N/A'}</div>
      <div><span className="font-medium text-foreground/80">Event:</span> {headers.Event || 'N/A'}</div>
      <div><span className="font-medium text-foreground/80">Result:</span> {headers.Result || 'N/A'}</div>
    </div>
  </div>
));

interface MovesListProps { moves: (VerboseMove & { moveNumber: number })[]; currentMoveIndex: number; onMoveSelect: (index: number) => void; }
const MovesList: React.FC<MovesListProps> = ({ moves, currentMoveIndex, onMoveSelect }) => {
  const movesListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-2 text-foreground tracking-tight">Moves</h2>
      <div ref={movesListRef} className="max-h-80 sm:max-h-96 overflow-y-auto pr-1 text-sm">
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

interface MoveButtonProps { move: VerboseMove; index: number; isCurrent: boolean; onMoveSelect: (index: number) => void; }
const MoveButton = React.forwardRef<HTMLButtonElement, MoveButtonProps>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button ref={ref} onClick={() => onMoveSelect(index)} className={`text-left p-1 rounded transition-colors font-mono tracking-tight ${isCurrent ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-foreground/90'}`}>{move.san}</button>
));
MoveButton.displayName = 'MoveButton';

interface GamesListProps { games: GameData[]; currentGameIndex: number; onGameSelect: (index: number) => void; }
const GamesList: React.FC<GamesListProps> = React.memo(({ games, currentGameIndex, onGameSelect }) => (
  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
    <h2 className="text-lg sm:text-xl font-semibold mb-3 text-foreground tracking-tight">Select a Game</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
      {games.map((game, index) => (
        <button key={index} onClick={() => onGameSelect(index)} className={`p-2 text-sm rounded-md transition-colors font-medium text-left ${currentGameIndex === index ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{game.title}</button>
      ))}
    </div>
  </div>
));
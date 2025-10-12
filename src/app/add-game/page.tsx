'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef, ButtonHTMLAttributes, SVGProps } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchGames, deleteGame, type GameData } from './actions';

// --- TYPE DEFINITIONS ---
type VerboseMove = Move & { san: string; lan: string; before: string; after: string };
interface GameHistory {
  moves: (VerboseMove & { moveNumber: number })[];
  fenHistory: string[];
}

// --- ICONS ---
// **FIX:** Redefined icons to accept props (like className) to fix the type error.
const Icons = {
  Start: (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}><path d="M18.375 3.094a.75.75 0 0 0-1.06 0L9.81 10.59a2.25 2.25 0 0 0 0 3.182l7.505 7.504a.75.75 0 0 0 1.06-1.06L10.87 12.182a.75.75 0 0 1 0-1.06l7.505-7.504a.75.75 0 0 0 0-1.06Z" /><path d="M6 3a.75.75 0 0 0-.75.75v16.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 6 3Z" /></svg>,
  Prev: (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M14.78 6.22a.75.75 0 0 1 0 1.06L9.56 12l5.22 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>,
  Next: (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M9.22 6.22a.75.75 0 0 1 1.06 0l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 0 1-1.06-1.06L14.44 12 9.22 6.78a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>,
  End: (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}><path d="M5.625 3.094a.75.75 0 0 1 1.06 0L14.19 10.59a2.25 2.25 0 0 1 0 3.182l-7.505 7.504a.75.75 0 0 1-1.06-1.06l7.505-7.505a.75.75 0 0 0 0-1.06L5.625 4.154a.75.75 0 0 1 0-1.06Z" /><path d="M18 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 18 3Z" /></svg>,
  ChevronDown: ({ className, ...props }: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className || ''}`} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>,
  Trash: (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
};

// --- MAIN PAGE COMPONENT ---
export default function GameViewerPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn || '', [games, currentGameIndex]);
  const currentFen = useMemo(() => gameHistory.fenHistory[currentMoveIndex + 1] || 'start', [currentMoveIndex, gameHistory]);
  const lastMove = useMemo(() => {
    if (currentMoveIndex < 0) return undefined;
    const move = gameHistory.moves[currentMoveIndex];
    return move ? { from: move.from, to: move.to } : undefined;
  }, [currentMoveIndex, gameHistory.moves]);

  // --- EFFECTS ---
  useEffect(() => {
    async function loadGames() {
      setIsLoading(true);
      const { games: fetchedGames, error } = await fetchGames();
      if (error) {
        console.error("Error fetching games:", error);
      } else {
        setGames(fetchedGames);
        if (fetchedGames.length > 0) {
          setCurrentGameIndex(0);
        }
      }
      setIsLoading(false);
    }
    loadGames();
  }, []);

  useEffect(() => {
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] });
      setGameHeaders({});
      return;
    }
    try {
      const chess = new Chess();
      chess.loadPgn(currentPgn);
      setGameHeaders(chess.header() as Record<string, string>);

      const history = chess.history({ verbose: true }) as VerboseMove[];
      const tempChess = new Chess();
      const fenHistory: string[] = [tempChess.fen()];
      const validMoves: VerboseMove[] = [];
      
      history.forEach((move, index) => {
        try {
          tempChess.move(move.san);
          fenHistory.push(tempChess.fen());
          validMoves.push(move);
        } catch (error) {
          console.error(`Invalid move at index ${index}: ${move.san}`, error);
        }
      });
      
      const movesWithNumbers = validMoves.map((move, index) => {
        const completeMove: VerboseMove & { moveNumber: number } = {
          color: move.color,
          from: move.from,
          to: move.to,
          piece: move.piece,
          san: move.san,
          lan: move.lan,
          before: move.before,
          after: move.after,
          captured: move.captured,
          promotion: move.promotion,
          flags: move.flags,
          moveNumber: Math.floor(index / 2) + 1,
          isCapture: () => move.flags.includes('c') || move.flags.includes('e'),
          isPromotion: () => move.flags.includes('p'),
          isBigPawn: () => move.flags.includes('b'),
          isEnPassant: () => move.flags.includes('e'),
          isKingsideCastle: () => move.flags.includes('k'),
          isQueensideCastle: () => move.flags.includes('q'),
        };
        return completeMove;
      });

      setGameHistory({ moves: movesWithNumbers, fenHistory });
      setCurrentMoveIndex(-1);
    } catch (error) {
      console.error("Failed to load PGN:", error);
      setGameHistory({ moves: [], fenHistory: ['start'] });
      setGameHeaders({});
    }
  }, [currentPgn]);

  // --- HANDLERS ---
  const handleGameSelect = useCallback((index: number) => setCurrentGameIndex(index), []);

  const handleDeleteGame = useCallback(async (gameId: number, gameTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${gameTitle}"?`)) return;
    const { success, error } = await deleteGame(gameId);
    if (success) {
      console.log(`Game "${gameTitle}" deleted.`);
      setGames(prev => {
        const newGames = prev.filter(game => game.id !== gameId);
        if (currentGameIndex >= newGames.length && newGames.length > 0) {
          setCurrentGameIndex(newGames.length - 1);
        } else if (newGames.length === 0) {
          setCurrentGameIndex(0);
        }
        return newGames;
      });
    } else {
      console.error("Error deleting game:", error);
      alert(`Failed to delete game: ${error}`);
    }
  }, [currentGameIndex]);

  const navigateToMove = useCallback((index: number) => {
    setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1)));
  }, [gameHistory.moves.length]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">Loading games...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Game Viewer</h1>
          <p className="text-slate-400">Reviewing tournament games</p>
        </header>
        <GameSelector games={games} currentGameIndex={currentGameIndex} onSelect={handleGameSelect} onDelete={handleDeleteGame} />
        {games.length > 0 ? (
          <>
            <GameInfo headers={gameHeaders} />
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <BoardDisplay fen={currentFen} lastMove={lastMove} gameHistory={gameHistory} currentMoveIndex={currentMoveIndex} onNavigate={navigateToMove} />
              <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={navigateToMove} />
            </main>
          </>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg text-center mt-6 shadow-lg">
            <p className="text-slate-400">No games found. Add a new game to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
type GameSelectorProps = {
  games: GameData[];
  currentGameIndex: number;
  onSelect: (index: number) => void;
  onDelete: (id: number, title: string) => void;
};
const GameSelector = ({ games, currentGameIndex, onSelect, onDelete }: GameSelectorProps) => {
  if (games.length === 0) return null;
  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Current Game</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600">{games[currentGameIndex]?.title || 'Select a game'}<Icons.ChevronDown className="ml-2" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white max-h-96 overflow-y-auto">
            {games.map((game, index) => (
              <DropdownMenuItem key={game.id} className="focus:bg-slate-700 cursor-pointer flex justify-between items-center" onSelect={() => onSelect(index)}>
                <span>{game.title}</span>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-slate-700 p-1 h-auto" onClick={(e) => { e.stopPropagation(); onDelete(game.id, game.title); }} aria-label={`Delete ${game.title}`}><Icons.Trash /></Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

type GameInfoProps = { headers: Record<string, string> };
const GameInfo = ({ headers }: GameInfoProps) => {
  const { White, Black, Event, Result } = headers;
  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-md"><h2 className="text-xl font-semibold mb-2 text-slate-200">Game Details</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-400">
        <InfoPair label="White" value={White} /><InfoPair label="Black" value={Black} /><InfoPair label="Event" value={Event} /><InfoPair label="Result" value={Result} />
      </div>
    </div>
  );
};

type InfoPairProps = { label: string; value?: string };
const InfoPair = ({ label, value }: InfoPairProps) => <div><span className="font-medium text-slate-300">{label}: </span>{value || 'N/A'}</div>;

type BoardDisplayProps = {
  fen: string;
  lastMove?: { from: string; to: string };
  gameHistory: GameHistory;
  currentMoveIndex: number;
  onNavigate: (index: number) => void;
};
const BoardDisplay = ({ fen, lastMove, gameHistory, currentMoveIndex, onNavigate }: BoardDisplayProps) => {
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>();
  
  useEffect(() => {
    function handleResize() { if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth); }
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const goToStart = useCallback(() => onNavigate(-1), [onNavigate]);
  const goToEnd = useCallback(() => onNavigate(gameHistory.moves.length - 1), [onNavigate, gameHistory.moves.length]);
  const goToPrevious = useCallback(() => onNavigate(currentMoveIndex - 1), [onNavigate, currentMoveIndex]);
  const goToNext = useCallback(() => onNavigate(currentMoveIndex + 1), [onNavigate, currentMoveIndex]);

  return (
    <div className="lg:col-span-2 flex flex-col items-center">
      <div ref={boardWrapperRef} className="w-full max-w-[70vh] mx-auto aspect-square mb-3 shadow-2xl rounded-lg overflow-hidden">
        {boardWidth && boardWidth > 0 ? (
          <Chessboard
            boardWidth={boardWidth}
            position={fen}
            arePiecesDraggable={false}
            customSquareStyles={lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }, [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' } } : {}}
          />
        ) : (
          <div className="w-full h-full bg-slate-700 animate-pulse" />
        )}
      </div>
      <Controls onStart={goToStart} onPrev={goToPrevious} onNext={goToNext} onEnd={goToEnd} canGoBack={currentMoveIndex > -1} canGoForward={currentMoveIndex < gameHistory.moves.length - 1} />
    </div>
  );
};

type ControlsProps = {
    onStart: () => void;
    onPrev: () => void;
    onNext: () => void;
    onEnd: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
};
const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }: ControlsProps) => (
  <div className="flex justify-center items-center gap-1 p-1 bg-slate-800 rounded-md shadow-md w-full max-w-sm">
    <ControlButton onClick={onStart} disabled={!canGoBack} aria-label="Go to start"><Icons.Start /></ControlButton>
    <ControlButton onClick={onPrev} disabled={!canGoBack} aria-label="Previous move"><Icons.Prev /></ControlButton>
    <ControlButton onClick={onNext} disabled={!canGoForward} aria-label="Next move"><Icons.Next /></ControlButton>
    <ControlButton onClick={onEnd} disabled={!canGoForward} aria-label="Go to end"><Icons.End /></ControlButton>
  </div>
));

const ControlButton = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className="flex-1 flex justify-center items-center p-2 bg-slate-700 rounded transition-colors hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed" {...props}>
        {children}
    </button>
);

type MovesListProps = {
  moves: (VerboseMove & { moveNumber: number })[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
};
const MovesList = ({ moves, currentMoveIndex, onMoveSelect }: MovesListProps) => {
  const activeMoveRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentMoveIndex]);

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg lg:col-span-1 h-fit"><h2 className="text-xl font-semibold mb-2 text-slate-200">Moves</h2>
      <div className="max-h-96 overflow-y-auto pr-1 text-sm"><div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center">
        {moves.map((move, index) => (index % 2 === 0 ? (<React.Fragment key={index}>
          <div className="text-right text-slate-500 font-mono pr-1">{move.moveNumber}.</div>
          <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
          {moves[index + 1] && <MoveButton move={moves[index + 1]} index={index + 1} isCurrent={currentMoveIndex === index + 1} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index + 1 ? activeMoveRef : null} />}
        </React.Fragment>) : null))}
      </div></div>
    </div>
  );
};

type MoveButtonProps = {
  move: VerboseMove & { moveNumber: number };
  index: number;
  isCurrent: boolean;
  onMoveSelect: (index: number) => void;
};
const MoveButton = forwardRef<HTMLButtonElement, MoveButtonProps>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button ref={ref} onClick={() => onMoveSelect(index)} className={`w-full text-left p-1 rounded transition-colors font-mono ${isCurrent ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>
    {move.san}
  </button>
));
MoveButton.displayName = 'MoveButton';


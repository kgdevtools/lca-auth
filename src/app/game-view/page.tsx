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

interface GameData {
  title: string;
  pgn: string;
}

// --- SVG ICONS for Controls ---
const StartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.375 3.094a.75.75 0 0 0-1.06 0L9.81 10.59a2.25 2.25 0 0 0 0 3.182l7.505 7.504a.75.75 0 0 0 1.06-1.06L10.87 12.182a.75.75 0 0 1 0-1.06l7.505-7.504a.75.75 0 0 0 0-1.06Z" /><path d="M6 3a.75.75 0 0 0-.75.75v16.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 6 3Z" /></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M14.78 6.22a.75.75 0 0 1 0 1.06L9.56 12l5.22 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.22 6.22a.75.75 0 0 1 1.06 0l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 0 1-1.06-1.06L14.44 12 9.22 6.78a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>;
const EndIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5.625 3.094a.75.75 0 0 1 1.06 0L14.19 10.59a2.25 2.25 0 0 1 0 3.182l-7.505 7.504a.75.75 0 0 1-1.06-1.06l7.505-7.505a.75.75 0 0 0 0-1.06L5.625 4.154a.75.75 0 0 1 0-1.06Z" /><path d="M18 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 18 3Z" /></svg>;

// --- SAMPLE GAME DATA ---
const SAMPLE_GAMES: GameData[] = [
  { title: "Side lines in the Birds Opening", pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "2"]\n[Result "0-1"]\n[White "Emmanuel Maphoto"]\n[Black "Mahomole Sekgwari Kgaogelo"]\n[ECO "C43"]\n\n1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Bb4+ 5. c3 dxc3 6. bxc3 Ba5 7. e5 d5 8. exf6 dxc4 9. Qe2+ Be6 10. fxg7 Rg8 11. O-O Qf6 12. Be3 Qxg7 13. g3 Nc6 14. Nd4 Nxd4 15. Bxd4 Qg4 16. f3 Qh5 17. Nd2 Qd5 18. Ne4 O-O-O 19. Nf6 Qg5 20. Nxg8 Rxg8 21. Qe5 c5 22. f4 Qxe5 23. Bxe5 Bf5 24. Rad1 Bd3 25. Rfe1 Rg6 26. Kf2 f6 27. Bd6 Bxc3 28. Re7 Bd4+ 29. Kf3 f5 30. Rc7+ Kd8 31. Bxc5 Kxc7 32. Bxd4 Ra6 33. Rd2 h5 34. h3 Ra3 35. Be5+ Kc6 36. Kf2 Be4 37. Rd6+ Kc5 38. Rg6 Rxa2+ 39. Ke3 c3 40. Bxc3 Kc4 41. Be5 b5 42. Rg5 b4 43. Rxh5 Ra3+ 44. Ke2 Bf3+`},
  { title: "An exchange sac in the London System", pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "3"]\n[Result "1-0"]\n[White "Mankga Thabang"]\n[Black "Mahomole Sekgwari Kgaogelo"]\n[ECO "D02"]\n\n1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 c5 5. c3 Nc6 6. Nbd2 Be7 7. Bd3 a6 8. Ne5 Bd6 9. Bg3 Qe7 10. f4 Bd7 11. Bh4 Rc8 12. Ng4 cxd4 13. exd4 Bxf4 14. O-O g5 15. Rxf4 Nxg4 16. Rxg4 gxh4 17. Qf3 f5 18. Rf4 Qg5 19. Re1 Kd8 20. Qe3 Rg8 21. Bf1 h3 22. g3 Ne7 23. Nf3 Qf6 24. Ne5 Ng6 25. Bxh3 Nxf4 26. Qxf4 Rc7 27. Bf1 Bc8 28. c4 h5 29. c5 h4 30. b4 hxg3 31. hxg3 Rcg7 32. Re3 Rh7 33. Bg2 Bd7 34. Kf2 Bb5 35. Rc3 Qg5 36. Nd3 1-0`},
  { title: "An adventure in the Ruy Lopez, Chigorin Variation", pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "4"]\n[Result "1-0"]\n[White "Mahomole Tebogo"]\n[Black "Mahomole Mahlodi Johannes"]\n[ECO "C96"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5 6. Bb3 Be7 7. Re1 d6 8. c3 Na5 9. Bc2 c5 10. h3 O-O 11. d4 Qc7 12. Nbd2 cxd4 13. cxd4 Be6 14. d5 Rac8 15. Bd3 Bd7 16. Qe2 Be8 17. b4 Nc4 18. Bxc4 bxc4 19. Nb1 Nd7 20. Nc3 f5 21. Bg5 fxe4 22. Qxe4 Nf6 1-0`},
  { title: "10 + 0 Rapid Game", pgn: `[Event "Hourly Rapid Arena"]\n[Site "https://lichess.org/EiUUsnzd"]\n[Date "2025.10.05"]\n[White "Ro56"]\n[Black "recombinator"]\n[Result "0-1"]\n[GameId "EiUUsnzd"]\n[UTCDate "2025.10.05"]\n[UTCTime "01:02:56"]\n[WhiteElo "2103"]\n[BlackElo "2171"]\n[WhiteRatingDiff "-5"]\n[BlackRatingDiff "+7"]\n[Variant "Standard"]\n[TimeControl "600+0"]\n[ECO "C90"]\n[Opening "Ruy Lopez: Closed, Pilnik Variation"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5 6. Bb3 Be7 7. Re1 O-O 8. d3 d6 9. c3 Na5 10. Bc2 c5 11. Nbd2 Bb7 12. Nf1 Re8 13. Ng3 g6 14. h4 Qc7 15. h5 Bf8 16. Bg5 Bg7 17. h6 Bh8 18. Nh4 Bc8 19. f4 d5 20. exd5 Nxd5 21. Ne4 f5 22. Nf2 Bb7 23. fxe5 Bxe5 24. Nf3 Bf4 25. Nh3 Ne3 26. Rxe3 Bxe3+ 27. Bxe3 Rxe3 28. Nhg5 Qg3 29. Qf1 Rae8 30. Bb3+ Nxb3 31. axb3 Re2 32. Rb1 Rc2 33. Nh3 Ree2 34. Ne1 Bxg2 0-1`},
  { title: "10 + 0 Rapid Arena Game", pgn: `[Event "rated rapid game"]\n[Site "https://lichess.org/LepiiMvu"]\n[Date "2025.10.03"]\n[White "Andressan14"]\n[Black "recombinator"]\n[Result "0-1"]\n[GameId "LepiiMvu"]\n[UTCDate "2025.10.03"]\n[UTCTime "00:24:31"]\n[WhiteElo "2198"]\n[BlackElo "2145"]\n[WhiteRatingDiff "-8"]\n[BlackRatingDiff "+10"]\n[Variant "Standard"]\n[TimeControl "600+0"]\n[ECO "D30"]\n[Opening "Queen's Gambit Declined"]\n[Termination "Normal"]\n\n1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. cxd5 exd5 5. Nc3 Be7 6. Bf4 c6 7. e3 O-O 8. Bd3 Nbd7 9. O-O Re8 10. Ne5 Nxe5 11. Bxe5 Nd7 12. Bg3 Bf6 13. Rc1 Qe7 14. na4 g6 15. Nc5 Nxc5 16. Rxc5 Qe6 17. b4 Be7 18. Rc1 Bxb4 19. Qb3 Bd6 20. a4 Bxg3 21. hxg3 Qe7 22. a5 Qd6 23. Rc3 Rb8 24. Rb1 Bd7 25. Qc2 b6 26. axb6 axb6 27. Ra1 Rec8 28. Rc1 Ra8 29. Qb2 c5 30. dxc5 bxc5 31. Qc2 d4 32. exd4 cxd4 33. Rxc8+ Rxc8 34. Qd2 Rxc1+ 35. Qxc1 Qb4 36. Qb1 Qc5 37. Qc2 Qe5 38. Qe2 Qg5 39. Qd1 Bc6 40. Qc2 Qd5 41. f3 Qe6 42. Qe2 Qb3 43. Qc2 Qe6 44. Qe2 Qd6 45. f4 Qd5 46. Qf2 Kg7 47. Qe2 Qc5 48. Qc2 Qc3 49. Qxc3 dxc3 50. Kf2 Kf6 51. g4 g5 52. fxg5+ Kxg5 53. Bxh7 Kxg4 54. Bc2 f5 55. Bd1+ Kf4 56. g3+ Ke5 57. Bc2 Be4 58. Bxe4 Kxe4 59. Ke2 c2 60. Kd2 Kf3 61. Kxc2 Kxg3 62. Kd2 f4 63. Ke2 Kg2 0-1`},
];

export default function ViewGamePage() {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({});
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined);

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number | undefined>(undefined);

  const currentPgn = useMemo(() => SAMPLE_GAMES[currentGameIndex].pgn, [currentGameIndex]);
  const fen = useMemo(() => gameHistory.fenHistory[currentMoveIndex + 1] || 'start', [currentMoveIndex, gameHistory.fenHistory]);

  useEffect(() => {
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
      // Use the new VerboseMove type
      const movesWithNumbers: (VerboseMove & { moveNumber: number })[] = [];

      // FIX: Cast the history to the correct VerboseMove type
      const history = game.history({ verbose: true }) as VerboseMove[];
      history.forEach((move, index) => {
        tempGame.move(move.san);
        fenHistory.push(tempGame.fen());
        movesWithNumbers.push({
          ...move,
          moveNumber: Math.floor((index / 2) + 1),
        });
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
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-900 text-white p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Game Viewer</h1>
          <p className="text-slate-400 text-sm sm:text-base">Reviewing classic and famous games</p>
        </header>
        <GameInfo headers={gameHeaders} />
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div className="lg:col-span-2 flex flex-col items-center">
            <div ref={boardWrapperRef} className="w-full max-w-[70vh] mx-auto aspect-square mb-2 sm:mb-3 shadow-2xl rounded-lg">
              <Chessboard
                boardWidth={boardWidth}
                position={fen}
                arePiecesDraggable={false}
                customSquareStyles={{
                  ...(lastMove ? {
                    [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                    [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                  } : {})
                }}
              />
            </div>
            <Controls onStart={goToStart} onPrev={goToPrevious} onNext={goToNext} onEnd={goToEnd} canGoBack={currentMoveIndex > -1} canGoForward={currentMoveIndex < gameHistory.moves.length - 1} />
          </div>
          <div className="bg-slate-800 p-3 sm:p-4 rounded-lg shadow-lg lg:col-span-1 h-fit">
            <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={navigateTo} />
          </div>
        </main>
        <section className="mt-6 sm:mt-8">
          <GamesList games={SAMPLE_GAMES} currentGameIndex={currentGameIndex} onGameSelect={handleGameSelect} />
        </section>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface ControlsProps { onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean; }
const Controls: React.FC<ControlsProps> = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }) => (
  <div className="flex justify-center items-center gap-1 p-1 bg-slate-800 rounded-md shadow-md w-full max-w-sm">
    <ControlButton onClick={onStart} disabled={!canGoBack} aria-label="Go to start"><StartIcon /></ControlButton>
    <ControlButton onClick={onPrev} disabled={!canGoBack} aria-label="Previous move"><PrevIcon /></ControlButton>
    <ControlButton onClick={onNext} disabled={!canGoForward} aria-label="Next move"><NextIcon /></ControlButton>
    <ControlButton onClick={onEnd} disabled={!canGoForward} aria-label="Go to end"><EndIcon /></ControlButton>
  </div>
));

const ControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button className="flex-1 flex justify-center items-center p-2 bg-slate-700 rounded transition-colors hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed" {...props}>{children}</button>
);

const GameInfo: React.FC<{ headers: Record<string, string> }> = React.memo(({ headers }) => (
  <div className="bg-slate-800 p-3 sm:p-4 rounded-lg shadow-md">
    <h2 className="text-lg sm:text-xl font-semibold mb-2 text-slate-200 tracking-tight">Game Details</h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-slate-400">
      <div><span className="font-medium text-slate-300">White:</span> {headers.White || 'N/A'}</div>
      <div><span className="font-medium text-slate-300">Black:</span> {headers.Black || 'N/A'}</div>
      <div><span className="font-medium text-slate-300">Event:</span> {headers.Event || 'N/A'}</div>
      <div><span className="font-medium text-slate-300">Result:</span> {headers.Result || 'N/A'}</div>
    </div>
  </div>
));

interface MovesListProps {
  // Use the new VerboseMove type
  moves: (VerboseMove & { moveNumber: number })[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

const MovesList: React.FC<MovesListProps> = ({ moves, currentMoveIndex, onMoveSelect }) => {
  const movesListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
        const container = movesListRef.current;
        const element = activeMoveRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const isVisible = elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
        if (!isVisible) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [currentMoveIndex]);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-2 text-slate-200 tracking-tight">Moves</h2>
      <div ref={movesListRef} className="max-h-80 sm:max-h-96 overflow-y-auto pr-1 text-sm">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center">
          {moves.map((move, index) => ( index % 2 === 0 ? (
              <React.Fragment key={`move-row-${move.moveNumber}`}>
                <div className="text-right text-slate-500 font-mono pr-1 text-xs">{move.moveNumber}.</div>
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

interface MoveButtonProps {
    // Use the new VerboseMove type
    move: VerboseMove;
    index: number;
    isCurrent: boolean;
    onMoveSelect: (index: number) => void;
}

const MoveButton = React.forwardRef<HTMLButtonElement, MoveButtonProps>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button ref={ref} onClick={() => onMoveSelect(index)} className={`text-left p-1 rounded transition-colors font-mono tracking-tight ${isCurrent ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-700 text-slate-300'}`}>{move.san}</button>
));
MoveButton.displayName = 'MoveButton';

interface GamesListProps { games: GameData[]; currentGameIndex: number; onGameSelect: (index: number) => void; }
const GamesList: React.FC<GamesListProps> = React.memo(({ games, currentGameIndex, onGameSelect }) => (
  <div className="bg-slate-800 p-3 sm:p-4 rounded-lg shadow-lg">
    <h2 className="text-lg sm:text-xl font-semibold mb-3 text-slate-200 tracking-tight">Select a Game</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
      {games.map((game, index) => (
        <button key={index} onClick={() => onGameSelect(index)} className={`p-2 text-sm rounded-md transition-colors font-medium text-left ${currentGameIndex === index ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{game.title}</button>
      ))}
    </div>
  </div>
));
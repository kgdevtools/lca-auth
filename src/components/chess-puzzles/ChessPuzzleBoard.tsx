'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, type Move, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { fetchPuzzles, type PuzzleData } from '@/services/chess-puzzle.service';
import { Button } from '@/components/ui/button';
import {
  RefreshCcw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

const BOARD_CUSTOM_SQUARE_STYLES = {
  lastMove: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
  legalMove: { background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)' },
  legalCapture: { background: 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' },
  selectedPiece: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
};
type Feedback = { type: 'success' | 'error' | 'info'; message: string; } | null;

const LoadingSpinner = () => ( <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"> <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /> <div className="text-muted-foreground">Loading Puzzles...</div> </div> );
const ErrorDisplay = ({ message }: { message: string }) => ( <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive gap-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg"> <AlertTriangle className="w-10 h-10" /> <h2 className="text-xl font-semibold">Failed to Load Puzzles</h2> <p className="text-sm">{message}</p> </div> );
const NoPuzzlesFound = () => ( <div className="flex items-center justify-center min-h-[400px] p-4 border border-dashed rounded-lg"> <p className="text-muted-foreground">No puzzles found.</p> </div> );

export default function ChessPuzzleBoard() {
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const { puzzles: fetchedPuzzles, error: fetchError } = await fetchPuzzles();
        if (fetchError) throw new Error(fetchError);
        setPuzzles(fetchedPuzzles);
      } catch (err: any) { setError(err.message || 'An unknown error occurred.'); } 
      finally { setIsLoading(false); }
    }
    loadData();
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (puzzles.length === 0) return <NoPuzzlesFound />;
  
  return (
    <div className="space-y-4">
      <PuzzleSelector puzzles={puzzles} currentIndex={currentPuzzleIndex} onSelect={setCurrentPuzzleIndex} />
      <PuzzleDisplay
        key={puzzles[currentPuzzleIndex].id}
        puzzle={puzzles[currentPuzzleIndex]}
        onNext={() => setCurrentPuzzleIndex(p => Math.min(puzzles.length - 1, p + 1))}
        onPrev={() => setCurrentPuzzleIndex(p => Math.max(0, p - 1))}
        isFirst={currentPuzzleIndex === 0}
        isLast={currentPuzzleIndex === puzzles.length - 1}
      />
    </div>
  );
}

function PuzzleDisplay({ puzzle, onNext, onPrev, isFirst, isLast }: { puzzle: PuzzleData, onNext:()=>void, onPrev:()=>void, isFirst: boolean, isLast: boolean }) {
  const game = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [solutionMoves] = useState<string[]>(puzzle.solution.split(' '));
  const [userMoveIndex, setUserMoveIndex] = useState(0);
  const [moveFrom, setMoveFrom] = useState<Square | ''>('');
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isSolved, setIsSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ type: 'info', message: puzzle.description || 'Find the best move.' });
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>();
  const [lastMove, setLastMove] = useState<{from: string, to: string} | null>(null);

  const customSquareStyles = useMemo(() => { const styles: Record<string, React.CSSProperties> = { ...optionSquares }; if (lastMove) { styles[lastMove.from] = BOARD_CUSTOM_SQUARE_STYLES.lastMove; styles[lastMove.to] = BOARD_CUSTOM_SQUARE_STYLES.lastMove; } return styles; }, [lastMove, optionSquares]);
  
  useEffect(() => { function handleResize() { if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth); } handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

  const resetPuzzle = () => {
    game.current.load(puzzle.fen);
    setFen(puzzle.fen);
    setUserMoveIndex(0);
    setIsSolved(false);
    setLastMove(null);
    setMoveFrom('');
    setOptionSquares({});
    setFeedback({ type: 'info', message: puzzle.description || 'Find the best move.' });
  };

  const makeMove = (move: { from: Square; to: Square; promotion?: string }): boolean => {
    if (isSolved) return false;

    // Step 1: Check if the move is a valid chess move
    const gameCopy = new Chess(game.current.fen());
    const madeMove = gameCopy.move(move);
    if (madeMove === null) return false; // Not a legal move, so fail silently.

    // Step 2: Check if the legal move matches the puzzle's solution
    const expectedMoveSAN = solutionMoves[userMoveIndex];
    const solutionGameCopy = new Chess(game.current.fen());
    const correctMoveDetails = solutionGameCopy.move(expectedMoveSAN);

    // If the user's legal move doesn't match the solution, it's incorrect.
    if (madeMove.from !== correctMoveDetails.from || madeMove.to !== correctMoveDetails.to) {
      setFeedback({ type: 'error', message: 'Incorrect move. Try again!' });
      return false; // Return false so react-chessboard snaps the piece back.
    }

    // Step 3: The move is correct. Commit it to the main game state.
    game.current.move(move);
    setFen(game.current.fen());
    setLastMove({ from: madeMove.from, to: madeMove.to });
    setFeedback({ type: 'info', message: 'Correct!' });

    const nextUserMoveIndex = userMoveIndex + 1;
    if (nextUserMoveIndex >= solutionMoves.length) {
      setIsSolved(true);
      setFeedback({ type: 'success', message: 'Puzzle solved!' });
    } else {
      // Auto-play the opponent's response after a delay.
      setTimeout(() => {
        const opponentMove = solutionMoves[nextUserMoveIndex];
        const opponentResult = game.current.move(opponentMove);
        if (opponentResult) {
          setFen(game.current.fen());
          setLastMove({ from: opponentResult.from, to: opponentResult.to });
          setUserMoveIndex(nextUserMoveIndex + 1);
          setFeedback({ type: 'info', message: 'Correct! Now find the next best move.' });
        }
      }, 300);
    }
    return true;
  };
  
  const onPieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    const success = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    setMoveFrom(''); setOptionSquares({});
    return success;
  };
  
  const showLegalMoves = useCallback((square: Square) => { const moves = game.current.moves({ square, verbose: true }); if (moves.length === 0) return; const newSquares: Record<string, React.CSSProperties> = {}; moves.forEach(move => { newSquares[move.to] = game.current.get(move.to as Square) ? BOARD_CUSTOM_SQUARE_STYLES.legalCapture : BOARD_CUSTOM_SQUARE_STYLES.legalMove; }); newSquares[square] = BOARD_CUSTOM_SQUARE_STYLES.selectedPiece; setOptionSquares(newSquares); }, []);
  
  const onSquareClick = (square: Square) => {
    if (isSolved) return;
    if (!moveFrom) {
      const piece = game.current.get(square);
      if (piece && piece.color === game.current.turn()) {
        setMoveFrom(square);
        showLegalMoves(square);
      }
      return;
    }
    makeMove({ from: moveFrom, to: square, promotion: 'q' });
    setMoveFrom(''); setOptionSquares({});
  };

  return (
    <>
      <div ref={boardWrapperRef} className="w-full max-w-lg mx-auto aspect-square shadow-lg rounded-[2px] overflow-hidden border-border">
        {boardWidth ? <Chessboard boardWidth={boardWidth} position={fen} onPieceDrop={onPieceDrop} onSquareClick={onSquareClick} customSquareStyles={customSquareStyles} arePiecesDraggable={!isSolved} /> : <div className="w-full h-full bg-muted animate-pulse" />}
      </div>
      <div className="text-center p-4 bg-card border border-border rounded-[2px]">
        {feedback && <div className="flex items-center justify-center gap-2"> {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />} {feedback.type === 'error' && <XCircle className="w-5 h-5 text-destructive" />} <p className={`${feedback.type === 'success' ? 'text-green-500' : 'text-muted-foreground'}`}>{feedback.message}</p> </div>}
        {isSolved && puzzle?.explanation && <p className="mt-2 text-sm text-primary">{puzzle.explanation}</p>}
      </div>
      <PuzzleControls onPrev={onPrev} onNext={onNext} onReset={resetPuzzle} isFirst={isFirst} isLast={isLast} />
    </>
  );
}

const PuzzleSelector: React.FC<{puzzles: PuzzleData[], currentIndex: number, onSelect: (i: number) => void}> = React.memo(({ puzzles, currentIndex, onSelect }) => ( <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm"> <h2 className="text-base font-semibold mb-2 text-foreground">Select a Puzzle</h2> <div className="relative"> <select value={currentIndex} onChange={(e) => onSelect(parseInt(e.target.value, 10))} className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Select a chess puzzle"> {puzzles.map((puzzle, index) => ( <option key={puzzle.id} value={index}> Puzzle #{index + 1}{puzzle.description ? `: ${puzzle.description}` : ''} </option> ))} </select> <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" /> </div> </div> ));
const PuzzleControls: React.FC<{onPrev:()=>void, onNext:()=>void, onReset:()=>void, isFirst:boolean, isLast:boolean}> = React.memo(({ onPrev, onNext, onReset, isFirst, isLast }) => ( <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-md shadow-sm"> <Button variant="outline" size="lg" onClick={onPrev} disabled={isFirst} className="flex-1"> <ChevronLeft className="w-5 h-5" /><span className="ml-2 hidden sm:inline">Previous</span> </Button> <Button variant="outline" size="lg" onClick={onReset} className="flex-1"> <RefreshCcw className="w-5 h-5" /><span className="ml-2 hidden sm:inline">Reset</span> </Button> <Button variant="outline" size="lg" onClick={onNext} disabled={isLast} className="flex-1"> <span className="mr-2 hidden sm:inline">Next</span><ChevronRight className="w-5 h-5" /> </Button> </div> ));

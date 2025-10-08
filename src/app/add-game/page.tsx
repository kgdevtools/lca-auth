'use client'

import React, { useState, useCallback, useEffect, useActionState, useMemo } from 'react'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useFormStatus } from 'react-dom'
import { addGameToDB, type FormState } from './actions'

// --- TYPE DEFINITIONS ---
interface PgnHeaders {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
}

// Initial state for the PGN headers form
const initialHeaders: PgnHeaders = {
  Event: '?',
  Site: '?',
  Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
  Round: '?',
  White: '?',
  Black: '?',
  Result: '*',
}

// --- SUB-COMPONENTS ---
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Adding...' : 'Add to DB'}
    </button>
  )
}

function HeaderInput({ label, name, value, onChange }: { label: string, name: keyof PgnHeaders, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-400">
        {label}
      </label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )
}

const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);


// --- MAIN COMPONENT ---
export default function AddGamePage() {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(game.fen())
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [headers, setHeaders] = useState<PgnHeaders>(initialHeaders);
  const [isEditorOpen, setIsEditorOpen] = useState(false); // Default to closed
  
  // State for click-to-move functionality
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [legalMoveSquares, setLegalMoveSquares] = useState<Record<string, {}>>({});

  const initialState: FormState = { message: '', error: false }
  const [formState, formAction] = useActionState(addGameToDB, initialState)

  const combinedPgn = useMemo(() => {
    const headerString = Object.entries(headers).map(([key, value]) => `[${key} "${value}"]`).join('\n');
    const movesText = game.pgn().replace(/```math.*?```\s*\n/g, '').trim();
    return `${headerString}\n\n${movesText}`;
  }, [headers, game]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHeaders(prev => ({ ...prev, [name]: value }));
  };

  function updateGameState(updatedGame: Chess) {
    setFen(updatedGame.fen());
    setGame(updatedGame);
    
    const history = updatedGame.history({ verbose: true });
    const lastHistoryMove = history[history.length - 1];
    if (lastHistoryMove) {
      setLastMove({ from: lastHistoryMove.from, to: lastHistoryMove.to });
    } else {
      setLastMove(null);
    }
  }

  const makeMove = (move: { from: Square; to: Square; promotion?: string }) => {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        updateGameState(gameCopy);
        if (gameCopy.isCheckmate()) {
          setHeaders(prev => ({ ...prev, Result: gameCopy.turn() === 'b' ? '1-0' : '0-1' }));
        } else if (gameCopy.isDraw()) {
          setHeaders(prev => ({ ...prev, Result: '1/2-1/2' }));
        }
      }
      return result;
    } catch (e) {
      return null;
    }
  };

  function onSquareClick(square: Square) {
    // If it's the first click (selecting a piece)
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        const moves = game.moves({ square, verbose: true });
        const newLegalMoveSquares = moves.reduce((acc, m) => {
          acc[m.to] = {
            background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%',
          };
          return acc;
        }, {} as Record<string, {}>);
        setLegalMoveSquares(newLegalMoveSquares);
      }
      return;
    }

    // If it's the second click (making a move)
    makeMove({ from: moveFrom, to: square, promotion: 'q' });
    setMoveFrom(null);
    setLegalMoveSquares({});
  }
  
  const onPieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    const moveResult = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    return moveResult !== null;
  };
  
  const handleUndo = () => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    updateGameState(gameCopy);
  };
  
  const resetGame = () => {
    updateGameState(new Chess());
    setHeaders(initialHeaders);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Add New Game to LCA Tournament Games</h1>
          <p className="text-gray-400">Input a game from a chess tournament. Use the metadata editor to add important details like the event name, player names, and round.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Chessboard and Controls */}
          <div>
            <div className="w-full aspect-square">
              <Chessboard
                position={fen}
                onPieceDrop={onPieceDrop}
                onSquareClick={onSquareClick}
                customSquareStyles={{
                  ...legalMoveSquares,
                  ...(moveFrom && { [moveFrom]: { background: 'rgba(255, 255, 0, 0.4)' } }),
                  ...(lastMove ? {
                    [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.2)' },
                    [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.2)' }
                  } : {})
                }}
              />
            </div>
            <div className="flex justify-center gap-2 mt-4">
               <button onClick={handleUndo} disabled={game.history().length === 0} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">Undo Move</button>
               <button onClick={resetGame} className="px-4 py-2 bg-red-700 text-white font-semibold rounded-md shadow-sm hover:bg-red-800 transition-colors">Reset Board</button>
            </div>
          </div>

          {/* Right Column: Form and Game Info */}
          <div className="space-y-6">
            <form action={formAction} className="bg-gray-800 p-6 rounded-lg space-y-4">
              <div className="border border-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(!isEditorOpen)}
                  className="flex items-center justify-between w-full p-3 font-semibold text-gray-200 hover:bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-expanded={isEditorOpen}
                  aria-controls="metadata-editor"
                >
                  <span>Game Metadata Editor</span>
                  <ChevronDownIcon className={`transition-transform duration-200 ${isEditorOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  id="metadata-editor"
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isEditorOpen ? 'max-h-[1000px] opacity-100 border-t border-gray-700' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                        Game Title (for internal reference)
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        placeholder="e.g., Morphy's Opera Game"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HeaderInput label="Event" name="Event" value={headers.Event} onChange={handleHeaderChange} />
                      <HeaderInput label="Site" name="Site" value={headers.Site} onChange={handleHeaderChange} />
                      <HeaderInput label="Date" name="Date" value={headers.Date} onChange={handleHeaderChange} />
                      <HeaderInput label="Round" name="Round" value={headers.Round} onChange={handleHeaderChange} />
                      <HeaderInput label="White" name="White" value={headers.White} onChange={handleHeaderChange} />
                      <HeaderInput label="Black" name="Black" value={headers.Black} onChange={handleHeaderChange} />
                      <HeaderInput label="Result" name="Result" value={headers.Result} onChange={handleHeaderChange} />
                    </div>
                  </div>
                </div>
              </div>
              
              <input type="hidden" name="pgn" value={combinedPgn} />

              <div className="flex items-center gap-4 pt-2">
                <SubmitButton />
              </div>

              {formState?.message && (
                <p className={`mt-2 text-sm ${formState.error ? 'text-red-400' : 'text-green-400'}`}>
                  {formState.message}
                </p>
              )}
            </form>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Live PGN Output</h2>
              <pre className="text-sm text-gray-300 bg-gray-900 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                {combinedPgn.trim() || "No moves yet."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
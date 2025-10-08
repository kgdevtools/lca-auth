import { Square } from "chess.js";

// types/chess.ts
export interface Puzzle {
    id: string;
    fen: string;
    solution: string[];
    description: string;
    explanation: string;
}

export interface GameState {
    fen: string;
    selectedSquare: Square | null;
    status: 'playing' | 'solved' | 'failed' | 'solution-shown';
    solutionShown: boolean;
    legalMoves: string[];
}
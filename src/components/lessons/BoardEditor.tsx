"use client";

import { useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { cn } from "@/lib/utils";

// Controlled board+palette renderer — FEN, orientation, history and the
// unified toolbar (Undo/Reset/Clear/Flip/Erase/Mode) all live in the parent
// (PuzzleAuthoringPanel) so they can share one inline control row instead of
// each component owning its own.

interface BoardEditorProps {
  fen: string;
  orientation: "white" | "black";
  selectedPiece: string | null;
  onSelectPiece: (piece: string | null) => void;
  onSquareClick: (square: Square) => void;
  onPieceDrop: (source: Square, target: Square) => boolean;
  className?: string;
}

const PIECE_LABELS: Record<string, string> = {
  P: "White Pawn", N: "White Knight", B: "White Bishop",
  R: "White Rook",  Q: "White Queen",  K: "White King",
  p: "Black Pawn",  n: "Black Knight", b: "Black Bishop",
  r: "Black Rook",  q: "Black Queen",  k: "Black King",
};

function PieceButton({
  piece,
  selectedPiece,
  onSelect,
}: {
  piece: string;
  selectedPiece: string | null;
  onSelect: (piece: string) => void;
}) {
  const isWhite = piece === piece.toUpperCase();
  const isSelected = selectedPiece === piece;

  return (
    <button
      onClick={() => onSelect(piece)}
      title={PIECE_LABELS[piece]}
      className={cn(
        "w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all",
        isSelected ? "ring-2 ring-offset-1 ring-foreground" : "hover:opacity-80"
      )}
      style={{
        color: isWhite ? "#1a1a1a" : "#f5f5f5",
        backgroundColor: isWhite ? "#e5e7eb" : "#3f3f46",
      }}
    >
      {piece.toUpperCase()}
    </button>
  );
}

export function BoardEditor({
  fen,
  orientation,
  selectedPiece,
  onSelectPiece,
  onSquareClick,
  onPieceDrop,
  className,
}: BoardEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBoardSize(Math.max(200, Math.floor(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const whitePieces = ["P", "N", "B", "R", "Q", "K"];
  const blackPieces = ["p", "n", "b", "r", "q", "k"];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {whitePieces.map((p) => (
            <PieceButton
              key={p}
              piece={p}
              selectedPiece={selectedPiece}
              onSelect={(pp) => onSelectPiece(pp === selectedPiece ? null : pp)}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-border shrink-0" />
        <div className="flex gap-1">
          {blackPieces.map((p) => (
            <PieceButton
              key={p}
              piece={p}
              selectedPiece={selectedPiece}
              onSelect={(pp) => onSelectPiece(pp === selectedPiece ? null : pp)}
            />
          ))}
        </div>
      </div>

      {selectedPiece && selectedPiece !== "clear" && (
        <p className="text-[11px] text-muted-foreground">
          Click a square to place <span className="font-medium text-foreground">{PIECE_LABELS[selectedPiece]}</span>
        </p>
      )}

      <div ref={containerRef} className="w-full">
        <Chessboard
          position={fen}
          boardWidth={boardSize}
          onSquareClick={onSquareClick}
          onPieceDrop={onPieceDrop}
          arePiecesDraggable
          boardOrientation={orientation}
          customBoardStyle={{ borderRadius: "6px" }}
        />
      </div>
    </div>
  );
}

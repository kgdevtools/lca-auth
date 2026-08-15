"use client";

import { useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { cn } from "@/lib/utils";
import { useBoardDecorations, type StoredAnnotationSet } from "@/hooks/useBoardDecorations";

// Controlled board+palette renderer — FEN, orientation, history and the
// unified toolbar (Undo/Reset/Clear/Flip/Erase/Mode) all live in the parent
// (PuzzleAuthoringPanel) so they can share one inline control row instead of
// each component owning its own.
//
// Also renders a Place/Decorate toggle — piece-placement (click/drag) and the
// decorations engine (right-click/long-press arrows, highlights, zones,
// animate) both want the same square gestures, so only one is live at a
// time. Decorate mode reuses the same shared engine every other board editor
// uses (see useBoardDecorations).

interface BoardEditorProps {
  fen: string;
  orientation: "white" | "black";
  selectedPiece: string | null;
  onSelectPiece: (piece: string | null) => void;
  onSquareClick: (square: Square) => void;
  onPieceDrop: (source: Square, target: Square) => boolean;
  className?: string;
  annotations: Map<string, StoredAnnotationSet>;
  onAnnotationsChange: (next: Map<string, StoredAnnotationSet>) => void;
  decorationKey: string;
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

type BoardTool = "place" | "decorate";

export function BoardEditor({
  fen,
  orientation,
  selectedPiece,
  onSelectPiece,
  onSquareClick,
  onPieceDrop,
  className,
  annotations,
  onAnnotationsChange,
  decorationKey,
}: BoardEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(360);
  const [boardTool, setBoardTool] = useState<BoardTool>("place");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBoardSize(Math.max(200, Math.floor(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const decorations = useBoardDecorations({
    currentKey: decorationKey,
    annotations,
    onAnnotationsChange,
    boardContainerRef: containerRef,
    disabled: boardTool !== "decorate",
  });

  const handleSquareClick = (square: Square) => {
    if (boardTool === "decorate") { decorations.focusSquare(square); return; }
    onSquareClick(square);
  };

  const handlePieceDrop = (source: Square, target: Square): boolean => {
    if (boardTool === "decorate") return false;
    return onPieceDrop(source, target);
  };

  const whitePieces = ["P", "N", "B", "R", "Q", "K"];
  const blackPieces = ["p", "n", "b", "r", "q", "k"];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="inline-flex rounded-sm border border-border p-0.5 gap-0.5">
        <button
          onClick={() => setBoardTool("place")}
          className={cn(
            "px-2.5 py-1 rounded-sm text-[11px] font-medium transition-colors",
            boardTool === "place" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Place pieces
        </button>
        <button
          onClick={() => setBoardTool("decorate")}
          className={cn(
            "px-2.5 py-1 rounded-sm text-[11px] font-medium transition-colors",
            boardTool === "decorate" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Decorate
        </button>
      </div>

      <div className={cn("flex items-center gap-2 flex-wrap", boardTool === "decorate" && "opacity-40 pointer-events-none")}>
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

      {boardTool === "place" && selectedPiece && selectedPiece !== "clear" && (
        <p className="text-[11px] text-muted-foreground">
          Click a square to place <span className="font-medium text-foreground">{PIECE_LABELS[selectedPiece]}</span>
        </p>
      )}
      {boardTool === "decorate" && (
        <p className="text-[11px] text-muted-foreground">Right-click a square (or long-press on touch) to draw</p>
      )}

      <div
        ref={containerRef}
        className="relative w-full"
        onPointerDown={decorations.onBoardPointerDown}
        onContextMenu={decorations.onBoardContextMenu}
        onTouchStart={decorations.onBoardTouchStart}
        onTouchEnd={decorations.onBoardTouchEnd}
        onTouchMove={decorations.onBoardTouchEnd}
      >
        <Chessboard
          position={fen}
          boardWidth={boardSize}
          onSquareClick={handleSquareClick}
          onPieceDrop={handlePieceDrop}
          arePiecesDraggable={boardTool === "place"}
          areArrowsAllowed={false}
          boardOrientation={orientation}
          customBoardStyle={{ borderRadius: "6px" }}
          customArrows={decorations.customArrows.length > 0 ? (decorations.customArrows as any) : undefined}
          customSquare={decorations.customSquare as any}
        />
        {decorations.overlay}
      </div>
    </div>
  );
}

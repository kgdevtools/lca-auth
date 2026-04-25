"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RotateCcw, Undo, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardEditorProps {
  initialFen?: string;
  initialOrientation?: 'white' | 'black';
  onFenChange?: (fen: string) => void;
  className?: string;
  evalScore?: number | null;
  evalMate?: number | null;
  engineEnabled?: boolean;
}

function evalToWhitePercent(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 96 : 4;
  if (score === null) return 50;
  return Math.max(4, Math.min(96, 50 + 50 * Math.tanh(score / 3)));
}

function EvalBar({ score, mate, isEnabled, height }: { score: number | null; mate: number | null; isEnabled: boolean; height: number }) {
  const pct = isEnabled ? evalToWhitePercent(score, mate) : 50;
  return (
    <div className="flex-shrink-0 flex flex-col rounded-sm overflow-hidden border border-border relative" style={{ width: 16, height }}>
      <div className="w-full bg-[#1c1c1c] transition-all duration-500 ease-out" style={{ height: `${100 - pct}%` }} />
      <div className="w-full bg-[#f5f5f5] transition-all duration-500 ease-out" style={{ height: `${pct}%` }} />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border/50" />
    </div>
  );
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
        "w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all border",
        isSelected
          ? "ring-2 ring-offset-1 ring-foreground"
          : "hover:opacity-80"
      )}
      style={{
        color: isWhite ? "#1a1a1a" : "#f5f5f5",
        backgroundColor: isWhite ? "#e5e7eb" : "#3f3f46",
        borderColor: isSelected ? "transparent" : "transparent",
      }}
    >
      {piece.toUpperCase()}
    </button>
  );
}

export function BoardEditor({
  initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  initialOrientation,
  onFenChange,
  className,
  evalScore = null,
  evalMate = null,
  engineEnabled = false,
}: BoardEditorProps) {
  const [fen, setFen] = useState(initialFen);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(initialOrientation ?? "white");
  const [history, setHistory] = useState<string[]>([initialFen]);
  const [historyIndex, setHistoryIndex] = useState(0);

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

  useEffect(() => {
    if (initialFen && initialFen !== fen) {
      try {
        const g = new Chess()
        g.load(initialFen, { skipValidation: true } as any)
        setFen(initialFen);
        setHistory([initialFen]);
        setHistoryIndex(0);
        if (initialOrientation) setBoardOrientation(initialOrientation);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFen, initialOrientation]);

  useEffect(() => { onFenChange?.(fen); }, [fen, onFenChange]);

  const game = useMemo(() => {
    const g = new Chess();
    try { g.load(fen, { skipValidation: true } as any); } catch { g.reset(); }
    return g;
  }, [fen]);

  const pushFen = (newFen: string) => {
    setFen(newFen);
    const next = history.slice(0, historyIndex + 1);
    next.push(newFen);
    setHistory(next);
    setHistoryIndex(next.length - 1);
  };

  const handleSquareClick = useCallback((square: Square) => {
    if (!selectedPiece) return;
    const g = new Chess();
    g.load(fen, { skipValidation: true } as any);
    if (selectedPiece === "clear") {
      g.remove(square);
    } else {
      g.remove(square);
      g.put(
        {
          type: selectedPiece.toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k",
          color: selectedPiece === selectedPiece.toUpperCase() ? "w" : "b",
        },
        square
      );
    }
    pushFen(g.fen());
  }, [fen, selectedPiece, history, historyIndex]);

  const handlePieceDrop = useCallback((source: Square, target: Square): boolean => {
    const g = new Chess();
    g.load(fen, { skipValidation: true } as any);
    const piece = g.get(source);
    if (!piece) return false;
    g.remove(source);
    g.put(piece, target);
    pushFen(g.fen());
    return true;
  }, [fen, history, historyIndex]);

  const turn = game.turn() === "w" ? "White" : "Black";
  const whitePieces = ["P", "N", "B", "R", "Q", "K"];
  const blackPieces = ["p", "n", "b", "r", "q", "k"];

  const ToolBtn = ({
    onClick,
    disabled,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <ToolBtn onClick={() => { if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); setFen(history[i]) } }} disabled={historyIndex === 0}>
          <Undo className="w-3.5 h-3.5" /> Undo
        </ToolBtn>
        <ToolBtn onClick={() => { const f = new Chess().fen(); setFen(f); setHistory([f]); setHistoryIndex(0) }}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </ToolBtn>
        <ToolBtn onClick={() => { const f = "8/8/8/8/8/8/8/8 w KQkq - 0 1"; pushFen(f) }}>
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </ToolBtn>
        <ToolBtn onClick={() => setBoardOrientation(p => p === "white" ? "black" : "white")}>
          Flip
        </ToolBtn>
        <span className="ml-auto text-xs text-muted-foreground">
          Turn: <span className="font-medium text-foreground">{turn}</span>
        </span>
      </div>

      {/* Piece palettes */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">White</p>
          <div className="flex gap-1">
            {whitePieces.map(p => (
              <PieceButton key={p} piece={p} selectedPiece={selectedPiece}
                onSelect={p => setSelectedPiece(p === selectedPiece ? null : p)} />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Black</p>
          <div className="flex gap-1">
            {blackPieces.map(p => (
              <PieceButton key={p} piece={p} selectedPiece={selectedPiece}
                onSelect={p => setSelectedPiece(p === selectedPiece ? null : p)} />
            ))}
          </div>
        </div>
        <button
          onClick={() => setSelectedPiece(selectedPiece === "clear" ? null : "clear")}
          className={cn(
            "self-end inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border transition-colors",
            selectedPiece === "clear"
              ? "bg-foreground text-background border-foreground"
              : "border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground"
          )}
        >
          <X className="w-3.5 h-3.5" /> Erase
        </button>
      </div>

      {selectedPiece && selectedPiece !== "clear" && (
        <p className="text-xs text-muted-foreground">
          Click a square to place <span className="font-medium text-foreground">{PIECE_LABELS[selectedPiece]}</span>
        </p>
      )}

      {/* Board + optional EvalBar */}
      <div ref={containerRef} className="w-full">
        <div className="flex gap-1.5 items-end">
          <EvalBar score={evalScore} mate={evalMate} isEnabled={engineEnabled} height={boardSize} />
          <div className="flex-1">
            <Chessboard
              position={fen}
              boardWidth={boardSize - 22}
              onSquareClick={handleSquareClick}
              onPieceDrop={handlePieceDrop}
              arePiecesDraggable={true}
              boardOrientation={boardOrientation}
              customBoardStyle={{ borderRadius: "6px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

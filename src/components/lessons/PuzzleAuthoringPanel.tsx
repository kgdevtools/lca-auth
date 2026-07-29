"use client";
// Shared puzzle authoring core — the blunderbored-style compact board+panel
// layout (Setup ⇄ Solution toggle, tabbed panel matched to board height)
// restyled with lca-auth's own shadcn components/tokens. One component, three
// call sites: the lesson `puzzle` block editor, Daily Puzzles curation, and
// the Puzzle Storm creator — all share this instead of each hand-rolling its
// own board+list UI.

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Link2, Save, Puzzle as PuzzleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardEditor } from "@/components/lessons/BoardEditor";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";

export interface PuzzleData {
  id: string;
  fen: string;
  solution: string[]; // SAN, solver's move first
  description: string;
  themes?: string[];
  rating?: number;
  orientation?: "white" | "black";
}

interface PuzzleAuthoringPanelProps {
  puzzles: PuzzleData[];
  onPuzzlesChange: (puzzles: PuzzleData[]) => void;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BOARD_MAX = 480;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function parseLichessPuzzleUrl(url: string): { puzzleId?: string; fen?: string } {
  const patterns = [/lichess\.org\/training\/([a-zA-Z0-9]+)/, /lichess\.org\/puzzle\/([a-zA-Z0-9]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { puzzleId: match[1] };
  }
  const fenMatch = url.match(/fen=([^\s&]+)/);
  if (fenMatch) return { fen: fenMatch[1].replace(/_/g, " ") };
  return {};
}

type BoardMode = "setup" | "solution";
type PanelTab = "puzzles" | "moves" | "edit";

export function PuzzleAuthoringPanel({ puzzles, onPuzzlesChange }: PuzzleAuthoringPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [boardMode, setBoardMode] = useState<BoardMode>("setup");
  const [activeTab, setActiveTab] = useState<PanelTab>("puzzles");

  const [startingFen, setStartingFen] = useState(STARTING_FEN);
  const [boardFen, setBoardFen] = useState(STARTING_FEN);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const [isLichessImportOpen, setIsLichessImportOpen] = useState(false);
  const [lichessUrl, setLichessUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [pgnImportText, setPgnImportText] = useState("");
  const [pgnParseError, setPgnParseError] = useState<string | null>(null);
  const [pgnFenHistory, setPgnFenHistory] = useState<string[]>([]);
  const [pgnMoveHistory, setPgnMoveHistory] = useState<string[]>([]);
  const [pgnPlyIndex, setPgnPlyIndex] = useState(0);

  const columnRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoardWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetDraft = useCallback(() => {
    setStartingFen(STARTING_FEN);
    setBoardFen(STARTING_FEN);
    setSolutionMoves([]);
    setDescription("");
    setMoveFrom("");
    setOptionSquares({});
    setPgnImportText("");
    setPgnParseError(null);
    setPgnFenHistory([]);
    setPgnMoveHistory([]);
  }, []);

  const handleNewPuzzle = useCallback(() => {
    setEditingIndex(null);
    resetDraft();
    setBoardMode("setup");
    setActiveTab("edit");
  }, [resetDraft]);

  const handleSelectPuzzle = useCallback((index: number) => {
    const p = puzzles[index];
    if (!p) return;
    setEditingIndex(index);
    setStartingFen(p.fen);
    setBoardFen(p.fen);
    setSolutionMoves(p.solution);
    setDescription(p.description);
    setMoveFrom("");
    setOptionSquares({});
    setBoardMode("solution");
    setActiveTab("edit");
  }, [puzzles]);

  const canSave = startingFen.trim().length > 0 && solutionMoves.length > 0;

  const handleSaveDraft = useCallback(() => {
    if (!canSave) return;
    const draft: PuzzleData = {
      id: editingIndex != null ? puzzles[editingIndex].id : generateId(),
      fen: startingFen,
      solution: solutionMoves,
      description,
      orientation: startingFen.split(" ")[1] === "w" ? "white" : "black",
    };
    if (editingIndex != null) {
      const next = [...puzzles];
      next[editingIndex] = { ...next[editingIndex], ...draft };
      onPuzzlesChange(next);
    } else {
      onPuzzlesChange([...puzzles, draft]);
      setEditingIndex(puzzles.length);
    }
  }, [canSave, editingIndex, puzzles, startingFen, solutionMoves, description, onPuzzlesChange]);

  const handleDeletePuzzle = useCallback((index: number) => {
    const next = puzzles.filter((_, i) => i !== index);
    onPuzzlesChange(next);
    if (editingIndex === index) {
      handleNewPuzzle();
    } else if (editingIndex != null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  }, [puzzles, editingIndex, onPuzzlesChange, handleNewPuzzle]);

  const handleReorderPuzzle = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= puzzles.length) return;
    const next = [...puzzles];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onPuzzlesChange(next);
    if (editingIndex === index) setEditingIndex(newIndex);
    else if (editingIndex === newIndex) setEditingIndex(index);
  }, [puzzles, editingIndex, onPuzzlesChange]);

  const switchToSetup = useCallback(() => {
    setBoardFen(startingFen);
    setMoveFrom("");
    setOptionSquares({});
    setBoardMode("setup");
  }, [startingFen]);

  const switchToSolution = useCallback(() => {
    setStartingFen(boardFen);
    setSolutionMoves([]);
    setMoveFrom("");
    setOptionSquares({});
    setBoardMode("solution");
  }, [boardFen]);

  // ── Solution-mode move recording ─────────────────────────────────────────────
  const showLegalMoves = useCallback((square: Square) => {
    const game = new Chess(boardFen);
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return; }
    const next: Record<string, React.CSSProperties> = {};
    moves.forEach((move: any) => {
      next[move.to] = game.get(move.to as Square)
        ? { background: "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" }
        : { background: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)" };
    });
    next[square] = { backgroundColor: "rgba(59, 130, 246, 0.4)" };
    setOptionSquares(next);
  }, [boardFen]);

  const onSquareClick = useCallback((square: Square) => {
    if (!moveFrom) {
      const game = new Chess(boardFen);
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); showLegalMoves(square); }
      return;
    }
    const game = new Chess(boardFen);
    const move = game.move({ from: moveFrom, to: square, promotion: "q" });
    if (move) { setBoardFen(game.fen()); setSolutionMoves((prev) => [...prev, move.san]); }
    setMoveFrom("");
    setOptionSquares({});
  }, [moveFrom, boardFen, showLegalMoves]);

  const onPieceDrop = useCallback((source: string, target: string) => {
    const game = new Chess(boardFen);
    const move = game.move({ from: source, to: target, promotion: "q" });
    if (move) { setBoardFen(game.fen()); setSolutionMoves((prev) => [...prev, move.san]); }
    setMoveFrom("");
    setOptionSquares({});
    return !!move;
  }, [boardFen]);

  const undoLastMove = useCallback(() => {
    if (solutionMoves.length === 0) return;
    const next = solutionMoves.slice(0, -1);
    const game = new Chess(startingFen);
    for (const san of next) game.move(san);
    setBoardFen(game.fen());
    setSolutionMoves(next);
  }, [solutionMoves, startingFen]);

  // ── PGN import (setup mode) ──────────────────────────────────────────────────
  const handleParsePgn = useCallback(() => {
    setPgnParseError(null);
    const raw = pgnImportText.trim();
    if (!raw) return;
    try {
      const loader = new Chess();
      loader.loadPgn(raw);
      const moves = loader.history();
      if (moves.length === 0) { setPgnParseError("No moves found in PGN."); return; }
      const fenHistory: string[] = [];
      const replay = new Chess();
      fenHistory.push(replay.fen());
      for (const san of moves) { replay.move(san); fenHistory.push(replay.fen()); }
      const lastPly = fenHistory.length - 1;
      setPgnFenHistory(fenHistory);
      setPgnMoveHistory(moves);
      setPgnPlyIndex(lastPly);
      setBoardFen(fenHistory[lastPly]);
    } catch {
      setPgnParseError("Could not parse PGN. Check the format and try again.");
      setPgnFenHistory([]);
      setPgnMoveHistory([]);
    }
  }, [pgnImportText]);

  // ── Lichess import ────────────────────────────────────────────────────────────
  const handleImportFromLichess = useCallback(async () => {
    if (!lichessUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const parsed = parseLichessPuzzleUrl(lichessUrl);
      if (parsed.puzzleId) {
        const response = await fetch(`/api/puzzles/lichess/${parsed.puzzleId}`);
        if (!response.ok) throw new Error("Failed to fetch puzzle from Lichess");
        const data = await response.json();
        const puzzle: PuzzleData = {
          id: generateId(),
          fen: data.fen,
          solution: data.solution || [],
          description: data.themes?.join(", ") || "",
          themes: data.themes,
          rating: data.rating,
        };
        onPuzzlesChange([...puzzles, puzzle]);
        handleSelectPuzzle(puzzles.length);
      } else if (parsed.fen) {
        const puzzle: PuzzleData = { id: generateId(), fen: parsed.fen, solution: [], description: "Imported from FEN" };
        onPuzzlesChange([...puzzles, puzzle]);
        handleSelectPuzzle(puzzles.length);
      } else {
        setImportError("Invalid Lichess puzzle URL");
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import puzzle");
    } finally {
      setIsImporting(false);
      setIsLichessImportOpen(false);
      setLichessUrl("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lichessUrl, puzzles, onPuzzlesChange]);

  const customSquareStyles: Record<string, React.CSSProperties> = { ...optionSquares };

  const panelHeight = boardWidth > 0 ? boardWidth : undefined;
  const editingLabel = editingIndex != null ? (puzzles[editingIndex]?.description || "this puzzle") : "new puzzle draft";

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-start">
      {/* Board column */}
      <div ref={columnRef} className="shrink-0 w-full min-w-0" style={{ width: `min(100%, ${BOARD_MAX}px)`, maxWidth: "100%" }}>
        <div className="flex gap-1 p-1 mb-1.5 bg-muted rounded-md">
          <button
            onClick={switchToSetup}
            className={cn("flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors", boardMode === "setup" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground")}
          >
            Setup
          </button>
          <button
            onClick={switchToSolution}
            className={cn("flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors", boardMode === "solution" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground")}
          >
            Solution
          </button>
        </div>

        {boardMode === "setup" ? (
          <div className="space-y-2">
            <BoardEditor initialFen={boardFen} onFenChange={setBoardFen} />
            <div className="rounded-sm border border-border bg-muted/20 p-2.5 space-y-2">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Import from PGN</Label>
              <Textarea
                value={pgnImportText}
                onChange={(e) => {
                  setPgnImportText(e.target.value);
                  setPgnParseError(null);
                  if (!e.target.value.trim()) { setPgnFenHistory([]); setPgnMoveHistory([]); }
                }}
                placeholder={"Paste PGN or bare move-text\n\ne4 e5 Nf3 Nc6 Bc4 Nf6 ..."}
                className="font-mono text-[11px] resize-none"
                rows={3}
              />
              {pgnParseError && <p className="text-[10px] text-destructive">{pgnParseError}</p>}
              {pgnFenHistory.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { const i = Math.max(0, pgnPlyIndex - 1); setPgnPlyIndex(i); setBoardFen(pgnFenHistory[i]); }}
                    disabled={pgnPlyIndex === 0}
                    className="flex items-center justify-center w-6 h-6 rounded-sm border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-muted-foreground tabular-nums flex-1 min-w-0 truncate">
                    Ply {pgnPlyIndex} / {pgnFenHistory.length - 1}
                    {pgnPlyIndex > 0 && (
                      <span className="ml-1.5 font-mono font-medium text-foreground">
                        {Math.ceil(pgnPlyIndex / 2)}{pgnPlyIndex % 2 === 1 ? '.' : '...'}{' '}
                        {pgnMoveHistory[pgnPlyIndex - 1]}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => { const i = Math.min(pgnFenHistory.length - 1, pgnPlyIndex + 1); setPgnPlyIndex(i); setBoardFen(pgnFenHistory[i]); }}
                    disabled={pgnPlyIndex === pgnFenHistory.length - 1}
                    className="flex items-center justify-center w-6 h-6 rounded-sm border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={handleParsePgn} disabled={!pgnImportText.trim()}>
                Parse PGN
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="w-full" style={{ aspectRatio: "1 / 1" }}>
              <Chessboard
                position={boardFen}
                onSquareClick={onSquareClick}
                onPieceDrop={onPieceDrop}
                customSquareStyles={customSquareStyles}
                arePiecesDraggable
              />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={undoLastMove} disabled={solutionMoves.length === 0}>
                Undo move
              </Button>
            </div>
          </div>
        )}

        <div className="mt-2">
          <AnalysisPanel fen={boardMode === "setup" ? boardFen : boardFen} />
        </div>
      </div>

      {/* Panel */}
      <div
        className="w-full lg:flex-1 lg:min-w-0 min-w-0 bg-card border border-border rounded-md p-3 flex flex-col overflow-hidden"
        style={{ height: panelHeight, maxHeight: "calc(100dvh - 6.5rem)" }}
      >
        <div className="flex items-center gap-1 border-b border-border pb-2 shrink-0">
          <button onClick={() => setActiveTab("puzzles")} className={cn("flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors", activeTab === "puzzles" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Puzzles ({puzzles.length})
          </button>
          <button onClick={() => setActiveTab("moves")} className={cn("flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors", activeTab === "moves" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Moves
          </button>
          <button onClick={() => setActiveTab("edit")} className={cn("flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors", activeTab === "edit" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Edit
          </button>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden py-2">
          {activeTab === "puzzles" && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleNewPuzzle}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> New puzzle
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setIsLichessImportOpen(true)}>
                  <Link2 className="w-3.5 h-3.5 mr-1" /> Lichess
                </Button>
              </div>

              {puzzles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <PuzzleIcon className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No puzzles yet — add one to get started.
                </div>
              ) : (
                <div className="space-y-1">
                  {puzzles.map((puzzle, index) => (
                    <div
                      key={puzzle.id}
                      onClick={() => handleSelectPuzzle(index)}
                      className={cn(
                        "flex items-center gap-2 rounded-sm border px-2 py-1.5 cursor-pointer transition-colors",
                        editingIndex === index ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex flex-col shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleReorderPuzzle(index, "up"); }} disabled={index === 0} className="p-0.5 hover:bg-muted rounded-sm disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleReorderPuzzle(index, "down"); }} disabled={index === puzzles.length - 1} className="p-0.5 hover:bg-muted rounded-sm disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">Puzzle #{index + 1}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{puzzle.description || "No description"}</p>
                      </div>
                      {puzzle.rating && <span className="text-[10px] font-mono text-muted-foreground shrink-0">★{puzzle.rating}</span>}
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePuzzle(index); }} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-sm shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "moves" && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{editingLabel}</p>
              {solutionMoves.length === 0 ? (
                <p className="text-xs text-muted-foreground">No solution moves recorded yet — switch to Solution mode and play them on the board.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {solutionMoves.map((san, i) => (
                    <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-muted">
                      {i + 1}. {san}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "edit" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="puzzle-description" className="text-xs">Description / Theme</Label>
                <Input
                  id="puzzle-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., pin, discovered attack, fork"
                  className="h-8 text-sm"
                />
              </div>
              <Button onClick={handleSaveDraft} disabled={!canSave} className="w-full h-8 text-xs">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {editingIndex != null ? "Update puzzle" : "Save puzzle"}
              </Button>
              {!canSave && (
                <p className="text-[10px] text-muted-foreground">Needs a starting position and at least one solution move (record it in Solution mode).</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lichess Import Modal */}
      <Dialog open={isLichessImportOpen} onOpenChange={setIsLichessImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from Lichess</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lichess-url">Lichess Puzzle URL</Label>
              <Input id="lichess-url" value={lichessUrl} onChange={(e) => setLichessUrl(e.target.value)} placeholder="https://lichess.org/training/abc123" />
              <p className="text-xs text-muted-foreground">Paste a Lichess puzzle URL to import it</p>
            </div>
            {importError && <p className="text-sm text-destructive">{importError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLichessImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImportFromLichess} disabled={isImporting || !lichessUrl.trim()}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

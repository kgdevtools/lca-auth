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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Link2, Save, Puzzle as PuzzleIcon, Undo2, RotateCcw, Eraser,
  FlipHorizontal2, FileText, X, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardEditor } from "@/components/lessons/BoardEditor";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { TimerConfigField, DEFAULT_TIMER, type TimerConfig } from "@/components/lessons/TimerConfigField";

export interface PuzzleData {
  id: string;
  fen: string;
  solution: string[]; // SAN, solver's move first
  description: string;
  hint?: string;
  timer?: TimerConfig;
  themes?: string[];
  rating?: number;
  orientation?: "white" | "black";
}

interface PuzzleAuthoringPanelProps {
  puzzles: PuzzleData[];
  onPuzzlesChange: (puzzles: PuzzleData[]) => void;
  /** Hide the built-in Lichess batch import — set false when the call site already has its own (e.g. a richer single+batch modal). */
  showLichessImport?: boolean;
  /** Per-puzzle timer field — off by default for surfaces where time is a lesson-level concern (Puzzle Storm, Daily Puzzles). */
  showTimer?: boolean;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EMPTY_BOARD_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";
const BOARD_MAX = 480;

const BATCH_THEME_PRESETS = [
  { key: "mixed", label: "Mixed" },
  { key: "fork", label: "Forks" },
  { key: "pin", label: "Pins" },
  { key: "skewer", label: "Skewers" },
  { key: "mateIn1", label: "Mate in 1" },
  { key: "mateIn2", label: "Mate in 2" },
  { key: "discoveredAttack", label: "Discovered" },
  { key: "sacrifice", label: "Sacrifice" },
  { key: "endgame", label: "Endgame" },
  { key: "hangingPiece", label: "Hanging piece" },
] as const;

const BATCH_DIFFICULTIES = ["easier", "normal", "harder", "mixed"] as const;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

type BoardMode = "setup" | "solution";
type PanelTab = "puzzles" | "moves" | "edit";

function ToolBtn({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium border transition-colors disabled:opacity-30",
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      )}
    >
      {children}
    </button>
  );
}

export function PuzzleAuthoringPanel({ puzzles, onPuzzlesChange, showLichessImport = true, showTimer = true }: PuzzleAuthoringPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [boardMode, setBoardMode] = useState<BoardMode>("setup");
  const [activeTab, setActiveTab] = useState<PanelTab>("puzzles");

  const [startingFen, setStartingFen] = useState(STARTING_FEN);
  const [boardFen, setBoardFen] = useState(STARTING_FEN);
  // FEN field in the Edit tab — local buffer + "last seen" so it resyncs from
  // board-driven changes during render without clobbering an in-progress
  // edit (same idiom blunderbored's PuzzleEditTab uses for its FEN field).
  const [fenDraft, setFenDraft] = useState(startingFen);
  const [seenStartingFen, setSeenStartingFen] = useState(startingFen);
  if (startingFen !== seenStartingFen) { setSeenStartingFen(startingFen); setFenDraft(startingFen); }
  const [fenError, setFenError] = useState<string | null>(null);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [timer, setTimer] = useState<TimerConfig>(DEFAULT_TIMER);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [themes, setThemes] = useState<string[]>([]);
  const [themeInput, setThemeInput] = useState("");
  const [draftOrientation, setDraftOrientation] = useState<"white" | "black" | undefined>(undefined);

  // Setup-mode board editing (piece placement)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [setupHistory, setSetupHistory] = useState<string[]>([STARTING_FEN]);

  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const [typedSolutionOpen, setTypedSolutionOpen] = useState(false);
  const [typedSolutionText, setTypedSolutionText] = useState("");
  const [typedSolutionError, setTypedSolutionError] = useState<string | null>(null);

  const [isLichessImportOpen, setIsLichessImportOpen] = useState(false);
  const [batchTheme, setBatchTheme] = useState<string>("mixed");
  const [batchDifficulty, setBatchDifficulty] = useState<string>("normal");
  const [batchCount, setBatchCount] = useState(10);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [pgnImportOpen, setPgnImportOpen] = useState(false);
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
    setSetupHistory([STARTING_FEN]);
    setSolutionMoves([]);
    setDescription("");
    setHint("");
    setTimer(DEFAULT_TIMER);
    setRating(undefined);
    setThemes([]);
    setThemeInput("");
    setDraftOrientation(undefined);
    setSelectedPiece(null);
    setMoveFrom("");
    setOptionSquares({});
    setPgnImportOpen(false);
    setPgnImportText("");
    setPgnParseError(null);
    setPgnFenHistory([]);
    setPgnMoveHistory([]);
    setTypedSolutionOpen(false);
    setTypedSolutionText("");
    setTypedSolutionError(null);
  }, []);

  const handleNewPuzzle = useCallback(() => {
    setEditingIndex(null);
    resetDraft();
    setBoardMode("setup");
    setActiveTab("edit");
  }, [resetDraft]);

  const handleOpenPgnImport = useCallback(() => {
    handleNewPuzzle();
    setPgnImportOpen(true);
  }, [handleNewPuzzle]);

  const handleSelectPuzzle = useCallback((index: number) => {
    const p = puzzles[index];
    if (!p) return;
    setEditingIndex(index);
    setStartingFen(p.fen);
    setBoardFen(p.fen);
    setSetupHistory([p.fen]);
    setSolutionMoves(p.solution);
    setDescription(p.description);
    setHint(p.hint ?? "");
    setTimer(p.timer ?? DEFAULT_TIMER);
    setRating(p.rating);
    setThemes(p.themes ?? []);
    setThemeInput("");
    setDraftOrientation(p.orientation);
    setSelectedPiece(null);
    setMoveFrom("");
    setOptionSquares({});
    setPgnImportOpen(false);
    setTypedSolutionOpen(false);
    setTypedSolutionText("");
    setTypedSolutionError(null);
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
      hint: hint.trim() || undefined,
      timer: timer.enabled ? timer : undefined,
      rating,
      themes: themes.length > 0 ? themes : undefined,
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
  }, [canSave, editingIndex, puzzles, startingFen, solutionMoves, description, hint, timer, rating, themes, onPuzzlesChange]);

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
    setSetupHistory([startingFen]);
    setSelectedPiece(null);
    setMoveFrom("");
    setOptionSquares({});
    setBoardMode("setup");
  }, [startingFen]);

  // Apply a FEN typed/pasted into the Edit tab — blur/Enter commit (matching
  // blunderbored's PuzzleEditTab exactly: not live-per-keystroke), updates
  // both the draft and the actual board immediately, and switches to Setup
  // so the new position is visible right away.
  const applyFenDraft = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) { setFenError("FEN cannot be empty."); return; }
    try {
      new Chess(trimmed);
    } catch {
      setFenError("That FEN isn't valid.");
      return;
    }
    setFenError(null);
    setStartingFen(trimmed);
    setBoardFen(trimmed);
    setSetupHistory([trimmed]);
    setBoardMode("setup");
  }, []);

  const switchToSolution = useCallback(() => {
    setStartingFen(boardFen);
    setSolutionMoves([]);
    setMoveFrom("");
    setOptionSquares({});
    setBoardMode("solution");
  }, [boardFen]);

  // ── Setup-mode board editing (piece placement) ──────────────────────────────
  const pushSetupFen = useCallback((fen: string) => {
    setBoardFen(fen);
    setSetupHistory((prev) => [...prev, fen]);
  }, []);

  const handleSetupSquareClick = useCallback((square: Square) => {
    if (!selectedPiece) return;
    const g = new Chess();
    g.load(boardFen, { skipValidation: true } as any);
    if (selectedPiece === "clear") {
      g.remove(square);
    } else {
      g.remove(square);
      g.put(
        { type: selectedPiece.toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k", color: selectedPiece === selectedPiece.toUpperCase() ? "w" : "b" },
        square
      );
    }
    pushSetupFen(g.fen());
  }, [boardFen, selectedPiece, pushSetupFen]);

  const handleSetupPieceDrop = useCallback((source: Square, target: Square): boolean => {
    const g = new Chess();
    g.load(boardFen, { skipValidation: true } as any);
    const piece = g.get(source);
    if (!piece) return false;
    g.remove(source);
    g.put(piece, target);
    pushSetupFen(g.fen());
    return true;
  }, [boardFen, pushSetupFen]);

  const handleSetupUndo = useCallback(() => {
    setSetupHistory((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setBoardFen(next[next.length - 1]);
      return next;
    });
  }, []);

  const handleSetupReset = useCallback(() => {
    const f = new Chess().fen();
    setBoardFen(f);
    setSetupHistory([f]);
  }, []);

  const handleSetupClear = useCallback(() => {
    pushSetupFen(EMPTY_BOARD_FEN);
  }, [pushSetupFen]);

  const toggleErase = useCallback(() => {
    setSelectedPiece((p) => (p === "clear" ? null : "clear"));
  }, []);

  const handleFlip = useCallback(() => {
    setDraftOrientation((o) => ((o ?? "white") === "white" ? "black" : "white"));
  }, []);

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

  const handleResetInMode = useCallback(() => {
    if (boardMode === "setup") {
      handleSetupReset();
    } else {
      setBoardFen(startingFen);
      setSolutionMoves([]);
      setMoveFrom("");
      setOptionSquares({});
    }
  }, [boardMode, handleSetupReset, startingFen]);

  const handleUndoInMode = boardMode === "setup" ? handleSetupUndo : undoLastMove;
  const canUndoInMode = boardMode === "setup" ? setupHistory.length > 1 : solutionMoves.length > 0;

  // Escape hatch alongside click-to-move: type the whole line as SAN/dash-UCI
  // text (e.g. "Qxh7+ Kxh7 Rh1#" or "h7-h8=Q"), applied in one shot.
  const applyTypedSolution = useCallback(() => {
    setTypedSolutionError(null);
    const tokens = typedSolutionText.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;
    const game = new Chess(startingFen);
    const sans: string[] = [];
    for (const token of tokens) {
      const dashMatch = /^([a-h][1-8])-([a-h][1-8])(=([qrbn]))?$/i.exec(token);
      const move = dashMatch
        ? game.move({ from: dashMatch[1], to: dashMatch[2], promotion: (dashMatch[4]?.toLowerCase() ?? 'q') as any })
        : game.move(token);
      if (!move) {
        setTypedSolutionError(`Couldn't parse "${token}" as a legal move at that point in the line.`);
        return;
      }
      sans.push(move.san);
    }
    setSolutionMoves(sans);
    setBoardFen(game.fen());
    setTypedSolutionOpen(false);
    setTypedSolutionText("");
  }, [typedSolutionText, startingFen]);

  // ── Themes tag input ──────────────────────────────────────────────────────
  const addTheme = useCallback(() => {
    const t = themeInput.trim();
    if (t && !themes.includes(t)) setThemes((prev) => [...prev, t]);
    setThemeInput("");
  }, [themeInput, themes]);

  const removeTheme = useCallback((t: string) => {
    setThemes((prev) => prev.filter((x) => x !== t));
  }, []);

  // ── PGN import ────────────────────────────────────────────────────────────
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
      setBoardMode("setup");
      setBoardFen(fenHistory[lastPly]);
      setSetupHistory([fenHistory[lastPly]]);
    } catch {
      setPgnParseError("Could not parse PGN. Check the format and try again.");
      setPgnFenHistory([]);
      setPgnMoveHistory([]);
    }
  }, [pgnImportText]);

  // ── Lichess batch import ──────────────────────────────────────────────────
  const handleBatchFetch = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/puzzles/lichess/batch?themes=${batchTheme}&difficulty=${batchDifficulty}&nb=${batchCount}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to fetch puzzles");
      }
      const { puzzles: fetched } = await res.json() as {
        puzzles: Array<{ lichessId: string; fen: string; solution: string[]; themes: string[]; rating: number | null; orientation: "white" | "black" }>
      };
      const existingIds = new Set(puzzles.map((p) => p.id));
      const mapped: PuzzleData[] = fetched
        .filter((p) => !existingIds.has(p.lichessId))
        .map((p) => ({
          id: p.lichessId,
          fen: p.fen,
          solution: p.solution,
          description: "",
          themes: p.themes,
          rating: p.rating ?? undefined,
          orientation: p.orientation,
        }));
      onPuzzlesChange([...puzzles, ...mapped]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to fetch puzzles");
    } finally {
      setIsImporting(false);
    }
  }, [batchTheme, batchDifficulty, batchCount, puzzles, onPuzzlesChange]);

  const customSquareStyles: Record<string, React.CSSProperties> = { ...optionSquares };
  const puzzleThumbOrientation = (p: PuzzleData) => p.orientation ?? "white";

  const panelHeight = boardWidth > 0 ? boardWidth : undefined;
  const editingLabel = editingIndex != null ? (puzzles[editingIndex]?.description || "this puzzle") : "new puzzle draft";

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-start">
      {/* Board column */}
      <div ref={columnRef} className="shrink-0 w-full min-w-0" style={{ width: `min(100%, ${BOARD_MAX}px)`, maxWidth: "100%" }}>
        {/* Unified control row: Mode toggle + Undo/Reset/Clear/Erase/Flip */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold mr-0.5">
            <span className={cn(boardMode === "setup" ? "text-foreground" : "text-muted-foreground")}>Setup</span>
            <Switch
              checked={boardMode === "solution"}
              onCheckedChange={(checked) => (checked ? switchToSolution() : switchToSetup())}
              className="scale-90"
            />
            <span className={cn(boardMode === "solution" ? "text-foreground" : "text-muted-foreground")}>Solution</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <ToolBtn onClick={handleUndoInMode} disabled={!canUndoInMode}>
            <Undo2 className="w-3 h-3" /> Undo
          </ToolBtn>
          <ToolBtn onClick={handleResetInMode}>
            <RotateCcw className="w-3 h-3" /> Reset
          </ToolBtn>
          {boardMode === "setup" && (
            <>
              <ToolBtn onClick={handleSetupClear}>
                <Trash2 className="w-3 h-3" /> Clear
              </ToolBtn>
              <ToolBtn onClick={toggleErase} active={selectedPiece === "clear"}>
                <Eraser className="w-3 h-3" /> Erase
              </ToolBtn>
            </>
          )}
          <ToolBtn onClick={handleFlip}>
            <FlipHorizontal2 className="w-3 h-3" /> Flip
          </ToolBtn>
        </div>

        {boardMode === "setup" ? (
          <BoardEditor
            fen={boardFen}
            orientation={draftOrientation ?? "white"}
            selectedPiece={selectedPiece}
            onSelectPiece={setSelectedPiece}
            onSquareClick={handleSetupSquareClick}
            onPieceDrop={handleSetupPieceDrop}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="w-full" style={{ aspectRatio: "1 / 1" }}>
              <Chessboard
                position={boardFen}
                onSquareClick={onSquareClick}
                onPieceDrop={onPieceDrop}
                customSquareStyles={customSquareStyles}
                boardOrientation={draftOrientation ?? "white"}
                arePiecesDraggable
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setTypedSolutionOpen((o) => !o)}>
              {typedSolutionOpen ? "Hide typed entry" : "Type moves instead"}
            </Button>
            {typedSolutionOpen && (
              <div className="rounded-sm border border-border bg-muted/20 p-2.5 space-y-2">
                <Textarea
                  value={typedSolutionText}
                  onChange={(e) => { setTypedSolutionText(e.target.value); setTypedSolutionError(null); }}
                  placeholder={'e.g. Qxh7+ Kxh7 Rh1# — replaces any moves recorded above'}
                  className="font-mono text-xs resize-none"
                  rows={2}
                />
                {typedSolutionError && <p className="text-[10px] text-destructive">{typedSolutionError}</p>}
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={applyTypedSolution} disabled={!typedSolutionText.trim()}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}
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
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={handleOpenPgnImport}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> PGN
                </Button>
                {showLichessImport && (
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setIsLichessImportOpen(true)}>
                    <Link2 className="w-3.5 h-3.5 mr-1" /> Lichess
                  </Button>
                )}
              </div>

              {pgnImportOpen && (
                <div className="rounded-sm border border-border bg-muted/20 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Import from PGN</Label>
                    <button onClick={() => setPgnImportOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                        onClick={() => { const i = Math.max(0, pgnPlyIndex - 1); setPgnPlyIndex(i); setBoardFen(pgnFenHistory[i]); setSetupHistory([pgnFenHistory[i]]); }}
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
                        onClick={() => { const i = Math.min(pgnFenHistory.length - 1, pgnPlyIndex + 1); setPgnPlyIndex(i); setBoardFen(pgnFenHistory[i]); setSetupHistory([pgnFenHistory[i]]); }}
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
              )}

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
                      <div className="w-9 h-9 shrink-0 pointer-events-none">
                        <Chessboard
                          position={puzzle.fen}
                          boardWidth={36}
                          arePiecesDraggable={false}
                          areArrowsAllowed={false}
                          boardOrientation={puzzleThumbOrientation(puzzle)}
                          customBoardStyle={{ borderRadius: "3px" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          Puzzle #{index + 1}
                          {showTimer && puzzle.timer?.enabled && <span className="ml-1 text-muted-foreground font-normal">· {puzzle.timer.seconds}s</span>}
                        </p>
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
            <div className="space-y-3">
              <div>
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
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Engine</p>
                <AnalysisPanel fen={boardFen} />
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Starting FEN</Label>
                <Input
                  value={fenDraft}
                  onChange={(e) => setFenDraft(e.target.value)}
                  onBlur={() => applyFenDraft(fenDraft)}
                  onKeyDown={(e) => { if (e.key === "Enter") { applyFenDraft(fenDraft); (e.target as HTMLInputElement).blur(); } }}
                  placeholder={STARTING_FEN}
                  className={cn("h-8 text-xs font-mono", fenError && "border-destructive focus-visible:ring-destructive")}
                />
                {fenError && <p className="text-[10px] text-destructive">{fenError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="puzzle-description" className="text-xs">Description</Label>
                <Input
                  id="puzzle-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., White wins material with a pin"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Themes</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTheme(); } }}
                    placeholder="e.g. fork — press Enter"
                    className="h-8 text-sm flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addTheme}>Add</Button>
                </div>
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {themes.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-sm border border-border bg-muted text-muted-foreground">
                        {t}
                        <button onClick={() => removeTheme(t)} className="hover:text-foreground transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="puzzle-rating" className="text-xs">Rating</Label>
                  <Input
                    id="puzzle-rating"
                    type="number" min={0} max={3000}
                    value={rating ?? ""}
                    onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="1500"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="puzzle-hint" className="text-xs">Hint</Label>
                  <Input
                    id="puzzle-hint"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="optional"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Solution</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      title="View recorded solution"
                      className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Recorded solution</p>
                    {solutionMoves.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Not recorded yet — switch to Solution mode and play the line on the board.</p>
                    ) : (
                      <p className="text-xs font-mono text-foreground/80">{solutionMoves.join(" ")}</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {showTimer && <TimerConfigField value={timer} onChange={setTimer} />}

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

      {/* Lichess batch-import modal */}
      {showLichessImport && (
        <Dialog open={isLichessImportOpen} onOpenChange={setIsLichessImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import from Lichess</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Theme</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BATCH_THEME_PRESETS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setBatchTheme(t.key)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-sm border transition-colors",
                        batchTheme === t.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Difficulty</Label>
                  <div className="flex gap-1.5">
                    {BATCH_DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        onClick={() => setBatchDifficulty(d)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-sm border capitalize transition-colors",
                          batchDifficulty === d ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch-count" className="text-xs text-muted-foreground">Count</Label>
                  <Input
                    id="batch-count"
                    type="number" min={1} max={50}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-20 h-8 text-sm"
                  />
                </div>
              </div>
              {importError && <p className="text-xs text-destructive">{importError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLichessImportOpen(false)}>Close</Button>
              <Button onClick={handleBatchFetch} disabled={isImporting}>
                {isImporting ? "Fetching…" : "Fetch puzzles"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

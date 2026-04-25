"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import type { Move, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Play,
  Pause,
  Expand,
  Trophy,
  Calendar,
} from "lucide-react";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { cn } from "@/lib/utils";

type UiMove = Move & { moveNumber: number; clock?: number };

interface GameHistory {
  moves: UiMove[];
  fenHistory: string[];
}

type Arrow = [Square, Square, string];
type HighlightedSquare = { square: Square; color?: string };

type GameHeaders = Record<string, string | undefined>;

interface AnalysisBoardProps {
  pgn?: string;
  headers?: GameHeaders;
  initialMoveIndex?: number;
  showEngine?: boolean;
  maxBoardWidth?: number;
  className?: string;
  onMoveSelect?: (index: number, move: UiMove) => void;
  onNavigate?: (index: number) => void;
}

function evalToWhitePercent(score: number | null, mate: number | null): number {
  if (mate !== null && mate !== undefined) return mate > 0 ? 96 : 4;
  if (score === null) return 50;
  return Math.max(4, Math.min(96, 50 + 50 * Math.tanh(score / 3)));
}

function EvalBar({
  score,
  mate,
  isEnabled,
  height,
}: {
  score: number | null;
  mate: number | null;
  isEnabled: boolean;
  height: number;
}) {
  const whitePercent = isEnabled ? evalToWhitePercent(score, mate) : 50;
  return (
    <div
      className="flex-shrink-0 flex flex-col rounded-sm overflow-hidden border border-border relative"
      style={{ width: 16, height }}
    >
      <div
        className="w-full bg-[#1c1c1c] transition-all duration-500 ease-out"
        style={{ height: `${100 - whitePercent}%` }}
      />
      <div
        className="w-full bg-[#f5f5f5] transition-all duration-500 ease-out"
        style={{ height: `${whitePercent}%` }}
      />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border/50" />
    </div>
  );
}

function formatClock(seconds: number | undefined): string {
  if (seconds === undefined) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AnalysisBoard({
  pgn = "",
  headers = {},
  initialMoveIndex = -1,
  showEngine = false,
  maxBoardWidth = 650,
  className,
  onMoveSelect,
  onNavigate,
}: AnalysisBoardProps) {
  const [gameHistory, setGameHistory] = useState<GameHistory>({
    moves: [],
    fenHistory: [],
  });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialMoveIndex);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(
    undefined,
  );

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(0);
  const [boardContainerWidth, setBoardContainerWidth] = useState<number>(500);
  const [isResizing, setIsResizing] = useState(false);

  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const replayMoveIndexRef = useRef<number>(0);

  const [evalScore, setEvalScore] = useState<number | null>(null);
  const [evalMate, setEvalMate] = useState<number | null>(null);
  const [engineEnabled, setEngineEnabled] = useState(false);

  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
    "desktop",
  );

  const [customArrows, setCustomArrows] = useState<Arrow[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<HighlightedSquare[]>(
    [],
  );

  const [sourceSquare, setSourceSquare] = useState<Square | null>(null);

  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      if (w < 640) setScreenSize("mobile");
      else if (w < 1024) setScreenSize("tablet");
      else setScreenSize("desktop");
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isMobile = screenSize === "mobile";
  const isDesktop = screenSize === "desktop";

  const currentFen = useMemo(
    () => gameHistory.fenHistory[currentMoveIndex + 1] ?? null,
    [currentMoveIndex, gameHistory.fenHistory],
  );

  useEffect(() => {
    if (!pgn) {
      setGameHistory({ moves: [], fenHistory: [] });
      return;
    }
    try {
      const displayPgn = pgn.replace(
        /\[TimeControl\s+"([^"]*'[^"]*)""\]/g,
        (_match, v) => `[TimeControl "${v.replace(/'/g, "+")}"]`,
      );
      const chess = new Chess();
      chess.loadPgn(displayPgn);
      const history = chess.history({ verbose: true }) as Move[];
      const temp = new Chess();
      const fenHistory: string[] = [temp.fen()];

      const clockRegex = /\{(\d+)\}\s*\{([^}]*)\}\s*(\d+:\d+(?:\.\d+)?)/g;
      const clockMap = new Map<number, number>();
      let match;
      while ((match = clockRegex.exec(pgn)) !== null) {
        const moveNum = parseInt(match[1], 10);
        const timeStr = match[3];
        const parts = timeStr.split(":");
        const seconds =
          parseInt(parts[0], 10) * 60 + parseFloat(parts[1] || "0");
        clockMap.set(moveNum, seconds);
      }

      history.forEach((m, i) => {
        try {
          temp.move((m as any).san);
          fenHistory.push(temp.fen());
        } catch {
          /* ignore */
        }
      });

      setGameHistory({
        moves: history.map((m, i) => ({
          ...(m as any),
          moveNumber: Math.floor(i / 2) + 1,
          clock: clockMap.get(Math.floor(i / 2) + 1),
        })),
        fenHistory,
      });
      setCurrentMoveIndex(-1);
    } catch {
      setGameHistory({ moves: [], fenHistory: [new Chess().fen()] });
    }
  }, [pgn]);

  useEffect(() => {
    function measure() {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [boardContainerWidth, screenSize]);

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const m = gameHistory.moves[currentMoveIndex];
      setLastMove({ from: m.from, to: m.to });
    } else {
      setLastMove(undefined);
    }
  }, [currentMoveIndex, gameHistory.moves]);

  useEffect(() => {
    if (initialMoveIndex >= 0 && initialMoveIndex < gameHistory.moves.length) {
      setCurrentMoveIndex(initialMoveIndex);
    }
  }, [initialMoveIndex]);

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsReplaying(false);
    setIsPaused(false);
    replayMoveIndexRef.current = -1;
  }, []);

  const pauseReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const resumeReplay = useCallback(() => {
    if (!isReplaying || !isPaused) return;
    setIsPaused(false);
    replayTimerRef.current = setInterval(() => {
      replayMoveIndexRef.current++;
      if (replayMoveIndexRef.current >= gameHistory.moves.length) {
        stopReplay();
        return;
      }
      setCurrentMoveIndex(replayMoveIndexRef.current);
    }, 1500);
  }, [isReplaying, isPaused, gameHistory.moves.length, stopReplay]);

  const navigateTo = useCallback(
    (index: number) => {
      if (isReplaying) stopReplay();
      const newIndex = Math.max(
        -1,
        Math.min(index, gameHistory.moves.length - 1),
      );
      setCurrentMoveIndex(newIndex);
      onNavigate?.(newIndex);
    },
    [gameHistory.moves.length, isReplaying, stopReplay, onNavigate],
  );

  const startReplay = useCallback(() => {
    if (gameHistory.moves.length === 0) return;
    stopReplay();
    setCurrentMoveIndex(-1);
    setIsReplaying(true);
    setIsPaused(false);
    replayMoveIndexRef.current = -1;
    replayTimerRef.current = setInterval(() => {
      replayMoveIndexRef.current++;
      if (replayMoveIndexRef.current >= gameHistory.moves.length) {
        stopReplay();
        return;
      }
      setCurrentMoveIndex(replayMoveIndexRef.current);
    }, 1500);
  }, [gameHistory.moves.length, stopReplay]);

  const toggleReplay = useCallback(() => {
    if (!isReplaying) startReplay();
    else if (isPaused) resumeReplay();
    else pauseReplay();
  }, [isReplaying, isPaused, startReplay, resumeReplay, pauseReplay]);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    stopReplay();
  }, [pgn, stopReplay]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = boardContainerWidth;
      function onMove(ev: MouseEvent) {
        setBoardContainerWidth(
          Math.max(250, Math.min(startWidth + (ev.clientX - startX), maxBoardWidth)),
        );
      }
      function onUp() {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [boardContainerWidth, maxBoardWidth],
  );

  const handleEngineToggle = useCallback((enabled: boolean) => {
    setEngineEnabled(enabled);
    if (!enabled) {
      setEvalScore(null);
      setEvalMate(null);
    }
  }, []);

  const handleEvalUpdate = useCallback(
    (score: number | null, mate: number | null) => {
      setEvalScore(score);
      setEvalMate(mate);
    },
    [],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(59, 130, 246, 0.4)" };
      styles[lastMove.to] = { backgroundColor: "rgba(59, 130, 246, 0.4)" };
    }
    highlightedSquares.forEach((hs) => {
      styles[hs.square] = { backgroundColor: hs.color || "rgba(255, 215, 0, 0.4)" };
    });
    return styles;
  }, [lastMove, highlightedSquares]);

  const boardAndControls = (
    <div className="space-y-2">
      <div className="flex gap-1.5 items-stretch w-full">
        <EvalBar
          score={evalScore}
          mate={evalMate}
          isEnabled={engineEnabled}
          height={boardWidth || 300}
        />
        <div
          ref={boardWrapperRef}
          className={cn(
            "flex-1 aspect-square rounded-sm overflow-hidden border border-border shadow-md relative",
            isResizing && "ring-2 ring-primary/50",
          )}
        >
          {boardWidth > 0 ? (
            <Chessboard
              id="analysis-board"
              boardWidth={boardWidth}
              position={currentFen || "start"}
              arePiecesDraggable={true}
              onPieceDrop={(sourceSquare, targetSquare) => {
                setCustomArrows([
                  ...customArrows,
                  [sourceSquare, targetSquare, "rgba(255, 215, 0, 0.7)"],
                ]);
                return true;
              }}
              customSquareStyles={squareStyles}
              customArrows={customArrows}
              onSquareClick={(square) => {
                const existing = highlightedSquares.find(
                  (hs) => hs.square === square,
                );
                if (existing) {
                  setHighlightedSquares(
                    highlightedSquares.filter((hs) => hs.square !== square),
                  );
                } else {
                  setHighlightedSquares([
                    ...highlightedSquares,
                    { square, color: "rgba(255, 215, 0, 0.4)" },
                  ]);
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
          {isDesktop && (
            <button
              className="absolute bottom-2 right-2 w-6 h-6 bg-muted/90 hover:bg-muted border border-border rounded-sm flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity shadow-sm"
              style={{ cursor: "se-resize" }}
              onMouseDown={handleResizeStart}
              aria-label="Resize board"
            >
              <Expand className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <Controls
        onStart={() => navigateTo(-1)}
        onPrev={() => navigateTo(currentMoveIndex - 1)}
        onNext={() => navigateTo(currentMoveIndex + 1)}
        onEnd={() => navigateTo(gameHistory.moves.length - 1)}
        onReplay={toggleReplay}
        canGoBack={currentMoveIndex > -1}
        canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
        isReplaying={isReplaying}
        isPaused={isPaused}
      />
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {isMobile ? (
        <div className="space-y-2">
          <GameInfoStrip headers={headers} />
          {boardAndControls}
          {showEngine && (
            <AnalysisPanel
              fen={currentFen}
              onToggle={handleEngineToggle}
              onEvalUpdate={handleEvalUpdate}
            />
          )}
          <MovesList
            moves={gameHistory.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={(idx) => {
              setCurrentMoveIndex(idx);
              onMoveSelect?.(idx, gameHistory.moves[idx]);
            }}
          />
        </div>
      ) : !isDesktop ? (
        <div className="space-y-2">
          <GameInfoStrip headers={headers} />
          {showEngine && (
            <AnalysisPanel
              fen={currentFen}
              onToggle={handleEngineToggle}
              onEvalUpdate={handleEvalUpdate}
            />
          )}
          {boardAndControls}
          <MovesList
            moves={gameHistory.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={(idx) => {
              setCurrentMoveIndex(idx);
              onMoveSelect?.(idx, gameHistory.moves[idx]);
            }}
          />
        </div>
      ) : (
        <div
          className="grid gap-4 items-start"
          style={{
            gridTemplateColumns: `minmax(0, ${boardContainerWidth}px) minmax(240px, 1fr)`,
          }}
        >
          <div
            className="space-y-2"
            style={{
              maxWidth: `${boardContainerWidth}px`,
              transition: isResizing ? "none" : "max-width 0.2s ease-out",
            }}
          >
            {boardAndControls}
          </div>
          <div className="space-y-2 flex flex-col">
            <GameInfoStrip headers={headers} />
            {showEngine && (
              <AnalysisPanel
                fen={currentFen}
                onToggle={handleEngineToggle}
                onEvalUpdate={handleEvalUpdate}
              />
            )}
            <MovesList
              moves={gameHistory.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveSelect={(idx) => {
                setCurrentMoveIndex(idx);
                onMoveSelect?.(idx, gameHistory.moves[idx]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GameInfoStrip({ headers }: { headers: GameHeaders }) {
  const white = headers.White || "Unknown";
  const black = headers.Black || "Unknown";
  const event = headers.Event || "";
  const result = headers.Result || "*";
  const date = headers.Date?.replace(/\./g, "-") || "";
  const whiteElo = headers.WhiteElo;
  const blackElo = headers.BlackElo;

  const resultColor =
    result === "1-0"
      ? "text-amber-500"
      : result === "0-1"
        ? "text-blue-400"
        : "text-muted-foreground";

  return (
    <div className="rounded-sm border border-border overflow-hidden shadow-sm">
      <div className="flex items-stretch divide-x divide-border">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-[#f8f8f6]">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1a1a1a] truncate leading-tight">
              {white}
            </p>
            {whiteElo && (
              <p className="text-[10px] text-[#555] font-mono">{whiteElo}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-2 bg-card flex-shrink-0 min-w-[64px]">
          <span
            className={cn(
              "text-sm font-bold font-mono tabular-nums leading-none",
              resultColor,
            )}
          >
            {result}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-[#1c1c1c] justify-end text-right">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#f0f0f0] truncate leading-tight">
              {black}
            </p>
            {blackElo && (
              <p className="text-[10px] text-[#aaa] font-mono">{blackElo}</p>
            )}
          </div>
        </div>
      </div>
      {event && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-t border-border">
          <Trophy className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate flex-1">
            {event}
          </span>
          {date && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Controls = React.memo(function Controls({
  onStart,
  onPrev,
  onNext,
  onEnd,
  onReplay,
  canGoBack,
  canGoForward,
  isReplaying,
  isPaused,
}: {
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onReplay: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isReplaying: boolean;
  isPaused: boolean;
}) {
  const showPause = isReplaying && !isPaused;
  const btnClass = "flex-1 rounded-sm bg-transparent h-10 sm:h-9";
  return (
    <div className="flex justify-center items-center gap-1 p-1.5 bg-card border border-border rounded-sm shadow-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={onStart}
        disabled={!canGoBack || (isReplaying && !isPaused)}
        aria-label="Start"
        className={btnClass}
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!canGoBack || (isReplaying && !isPaused)}
        aria-label="Prev"
        className={btnClass}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button
        variant={showPause ? "default" : "outline"}
        size="sm"
        onClick={onReplay}
        aria-label={showPause ? "Pause" : "Play"}
        className={btnClass}
      >
        {showPause ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!canGoForward || (isReplaying && !isPaused)}
        aria-label="Next"
        className={btnClass}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onEnd}
        disabled={!canGoForward || (isReplaying && !isPaused)}
        aria-label="End"
        className={btnClass}
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  );
});

const MovesList = React.memo(function MovesList({
  moves,
  currentMoveIndex,
  onMoveSelect,
}: {
  moves: UiMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentMoveIndex]);

  const movePairs: Array<[UiMove, UiMove | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1] ?? null]);
  }

  return (
    <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Moves
        </h3>
        {moves.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {currentMoveIndex >= 0 ? currentMoveIndex + 1 : 0}/{moves.length}
          </span>
        )}
      </div>
      <div
        ref={listRef}
        className="overflow-y-auto p-2"
        style={{ maxHeight: "220px" }}
      >
        {moves.length === 0 ? (
          <p className="text-center py-4 text-sm text-muted-foreground">
            No moves recorded.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-1 gap-y-0.5">
            {movePairs.map(([white, black], pairIndex) => {
              const whiteIndex = pairIndex * 2;
              const blackIndex = pairIndex * 2 + 1;
              return (
                <span
                  key={pairIndex}
                  className="flex items-baseline gap-0.5 flex-shrink-0"
                >
                  <span className="text-[11px] text-muted-foreground font-mono select-none">
                    {white.moveNumber}.
                  </span>
                  <button
                    ref={
                      whiteIndex === currentMoveIndex ? activeRef : undefined
                    }
                    onClick={() => onMoveSelect(whiteIndex)}
                    className={cn(
                      "text-sm px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none flex flex-col items-start",
                      whiteIndex === currentMoveIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent/60 text-foreground",
                    )}
                  >
                    <span>{white.san}</span>
                    {white.clock !== undefined && (
                      <span className="text-[9px] opacity-60 font-mono">
                        {formatClock(white.clock)}
                      </span>
                    )}
                  </button>
                  {black && (
                    <button
                      ref={
                        blackIndex === currentMoveIndex ? activeRef : undefined
                      }
                      onClick={() => onMoveSelect(blackIndex)}
                      className={cn(
                        "text-sm px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none flex flex-col items-start",
                        blackIndex === currentMoveIndex
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent/60 text-foreground",
                      )}
                    >
                      <span>{black.san}</span>
                      {black.clock !== undefined && (
                        <span className="text-[9px] opacity-60 font-mono">
                          {formatClock(black.clock)}
                        </span>
                      )}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Chess } from "chess.js";
import type { Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown,
  Play,
  Pause,
  Trophy,
  Calendar,
} from "lucide-react";
import {
  fetchGames,
  listTournaments,
  type GameData,
  type TournamentMeta,
} from "./actions";
import type { TournamentId } from "./config";
import { isNewItem } from "./utils";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UiMove = Move & { moveNumber: number };
type LastMove = { from: string; to: string };

interface GameHistory {
  moves: UiMove[];
  fenHistory: string[];
}

// ─── Eval bar — always vertical, always on the side ───────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ViewOnlyPage() {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] =
    useState<TournamentId | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(-1);

  const [gameHistory, setGameHistory] = useState<GameHistory>({
    moves: [],
    fenHistory: [],
  });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({});
  const [lastMove, setLastMove] = useState<LastMove | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(0);

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

  // ─── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { tournaments: fetched, error } = await listTournaments();
      if (!mounted) return;
      if (error) console.error("Failed to load tournaments:", error);
      setTournaments(fetched);
      if (fetched.length > 0) {
        setSelectedTournamentId(fetched[0].name as TournamentId);
      } else {
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (!selectedTournamentId) {
        setGames([]);
        setCurrentGameIndex(-1);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { games: fetched, error } = await fetchGames(selectedTournamentId);
      if (error) {
        setGames([]);
        setCurrentGameIndex(-1);
      } else {
        setGames(fetched);
        setCurrentGameIndex(fetched.length > 0 ? 0 : -1);
      }
      setIsLoading(false);
    }
    load();
  }, [selectedTournamentId]);

  // ─── PGN parsing ──────────────────────────────────────────────────────────

  const currentPgn = useMemo(() => {
    if (currentGameIndex < 0 || !games[currentGameIndex]) return "";
    return games[currentGameIndex].pgn;
  }, [games, currentGameIndex]);

  useEffect(() => {
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] });
      setGameHeaders({});
      setCurrentMoveIndex(-1);
      return;
    }
    try {
      const displayPgn = currentPgn.replace(
        /\[TimeControl\s+"([^"]*'[^"]*)""\]/g,
        (_match, v) => `[TimeControl "${v.replace(/'/g, "+")}"]`,
      );
      const chess = new Chess();
      chess.loadPgn(displayPgn);
      setGameHeaders(chess.header() as Record<string, string>);
      const history = chess.history({ verbose: true }) as Move[];
      const temp = new Chess();
      const fenHistory: string[] = [temp.fen()];
      history.forEach((m) => {
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
        })),
        fenHistory,
      });
      setCurrentMoveIndex(-1);
    } catch (e) {
      setGameHeaders({});
      setGameHistory({ moves: [], fenHistory: [new Chess().fen()] });
      setCurrentMoveIndex(-1);
    }
  }, [currentPgn]);

  useEffect(() => {
    if (isDesktop) {
      // Desktop: measure the board area container and compute max square that fits
      const el = boardAreaRef.current;
      if (!el) return;
      const compute = () => {
        const h = el.offsetHeight;
        const w = el.offsetWidth - 22; // 16px eval bar + 6px gap
        setBoardWidth(Math.max(0, Math.min(h, w)));
      };
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      compute();
      return () => ro.disconnect();
    } else {
      // Mobile/tablet: measure wrapper width directly
      const el = boardWrapperRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setBoardWidth(el.offsetWidth));
      ro.observe(el);
      setBoardWidth(el.offsetWidth);
      return () => ro.disconnect();
    }
  }, [isLoading, screenSize, isDesktop]);

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const m = gameHistory.moves[currentMoveIndex];
      setLastMove({ from: m.from, to: m.to });
    } else {
      setLastMove(undefined);
    }
  }, [currentMoveIndex, gameHistory.moves]);

  // ─── Replay ───────────────────────────────────────────────────────────────

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
      setCurrentMoveIndex(
        Math.max(-1, Math.min(index, gameHistory.moves.length - 1)),
      );
    },
    [gameHistory.moves.length, isReplaying, stopReplay],
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
  }, [currentPgn, stopReplay]);

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

  const selectedTournament = tournaments.find(
    (t) => t.name === selectedTournamentId,
  );
  const selectedTournamentName =
    selectedTournament?.alias ||
    selectedTournament?.display_name ||
    selectedTournamentId ||
    "Select a tournament";
  const selectedGameTitle =
    games[currentGameIndex]?.title ||
    (games.length > 0 ? "Select a game" : "No games available");
  const currentFen = gameHistory.fenHistory[currentMoveIndex + 1] ?? null;

  const squareStyles = lastMove
    ? {
        [lastMove.from]: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
        [lastMove.to]: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
      }
    : {};

  // ── Shared board + controls (mobile / tablet) ─────────────────────────────
  const boardAndControls = (
    <div className="space-y-2">
      <div className="flex gap-1.5 items-stretch w-full">
        <EvalBar score={evalScore} mate={evalMate} isEnabled={engineEnabled} height={boardWidth || 300} />
        <div ref={boardWrapperRef} className="flex-1 aspect-square rounded-sm overflow-hidden border border-border shadow-md">
          {boardWidth > 0
            ? <Chessboard boardWidth={boardWidth} position={currentFen || "start"} arePiecesDraggable={false} customSquareStyles={squareStyles} />
            : <div className="w-full h-full bg-muted animate-pulse" />
          }
        </div>
      </div>
      <Controls
        onStart={() => navigateTo(-1)} onPrev={() => navigateTo(currentMoveIndex - 1)}
        onNext={() => navigateTo(currentMoveIndex + 1)} onEnd={() => navigateTo(gameHistory.moves.length - 1)}
        onReplay={toggleReplay} canGoBack={currentMoveIndex > -1}
        canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
        isReplaying={isReplaying} isPaused={isPaused}
      />
    </div>
  );

  // ── Selector dropdowns (shared) ────────────────────────────────────────────
  const tournamentSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-sm px-2.5 h-8 text-xs shadow-sm">
          <span className="truncate font-medium">{selectedTournamentName}</span>
          <ChevronDown className="ml-1 w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[90vw] sm:w-64 rounded-sm bg-card p-1.5 border border-border shadow-xl">
        {tournaments.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No tournaments available</div>
        ) : tournaments.map((t, i) => (
          <DropdownMenuItem key={t.name} onSelect={() => { if (t.name !== selectedTournamentId) setSelectedTournamentId(t.name as TournamentId); }}
            className={cn("cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm text-xs", i % 2 === 0 && "bg-accent/20")}>
            <span className="truncate font-medium">{t.alias || t.display_name || t.name}</span>
            {isNewItem(t.created_at) && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-blue-500 text-white flex-shrink-0">New</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const gameSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading || games.length === 0}>
        <Button variant="outline" className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-sm px-2.5 h-8 text-xs shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
          <span className="truncate font-medium">{isLoading ? "Loading…" : selectedGameTitle}</span>
          <ChevronDown className="ml-1 w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[90vw] sm:w-72 max-h-[55vh] overflow-y-auto rounded-sm bg-card p-1.5 border border-border shadow-xl">
        {games.map((g, i) => (
          <DropdownMenuItem key={g.id} onSelect={() => setCurrentGameIndex(i)}
            className={cn("cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm text-xs", i % 2 === 0 && "bg-accent/20")}>
            <div className="min-w-0">
              <span className="block truncate font-medium">
                {(() => { const w = g.pgn.match(/^\s*\[White\s+"([^"]*)"\]/m); const b = g.pgn.match(/^\s*\[Black\s+"([^"]*)"\]/m); return `${w?.[1] ?? "?"} vs ${b?.[1] ?? "?"}`; })()}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">{g.title}</span>
            </div>
            {isNewItem(g.created_at) && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-blue-500 text-white flex-shrink-0">New</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Mobile / Tablet (scrollable) ───────────────────────────────────────────
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto space-y-3 p-2 sm:p-3">
          <header className="text-center pt-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Limpopo Chess Academy</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Games Database · Updated regularly</p>
          </header>
          <div className="grid grid-cols-2 gap-2 bg-card border border-border p-2.5 rounded-sm shadow-sm">
            <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Tournament</p>{tournamentSelector}</div>
            <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Game</p>{gameSelector}</div>
          </div>
          {isLoading ? (
            <div className="bg-muted animate-pulse rounded-sm w-full aspect-square max-w-sm mx-auto" />
          ) : games.length === 0 ? (
            <div className="bg-card border border-border p-6 rounded-sm text-center">
              <p className="text-muted-foreground text-sm">No games available for this tournament.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <GameInfoStrip headers={gameHeaders} />
              {!isMobile && <AnalysisPanel fen={currentFen} onToggle={handleEngineToggle} onEvalUpdate={handleEvalUpdate} />}
              {boardAndControls}
              {isMobile && <AnalysisPanel fen={currentFen} onToggle={handleEngineToggle} onEvalUpdate={handleEvalUpdate} />}
              <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={navigateTo} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop: 2-column grid (65% board | 35% sidebar) ──────────────────────
  return (
    <div
      className="h-[calc(100dvh-5rem)] bg-background text-foreground overflow-hidden grid"
      style={{ gridTemplateColumns: "65% 1fr" }}
    >
      {/* ── Left column: Board + Controls ── */}
      <div className="flex flex-col h-full min-w-0 p-2 gap-2">
        {/* Board area — always mounted so ResizeObserver can measure */}
        <div ref={boardAreaRef} className="flex-1 min-h-0 flex gap-1.5 items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="w-64 h-64 bg-muted animate-pulse rounded-sm" />
          ) : games.length === 0 ? null : (
            <>
              <EvalBar score={evalScore} mate={evalMate} isEnabled={engineEnabled} height={boardWidth || 400} />
              <div
                ref={boardWrapperRef}
                className="rounded-sm overflow-hidden border border-border shadow-md flex-shrink-0"
                style={{ width: boardWidth || 0, height: boardWidth || 0 }}
              >
                {boardWidth > 0
                  ? <Chessboard boardWidth={boardWidth} position={currentFen || "start"} arePiecesDraggable={false} customSquareStyles={squareStyles} />
                  : <div className="w-full h-full bg-muted animate-pulse" />
                }
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Right column: Selectors + Game info + Moves ── */}
      <div className="flex flex-col h-full border-l border-border min-w-0 overflow-hidden">
        {/* Fixed section: title, selectors, game info, engine */}
        <div className="flex-shrink-0 p-3 space-y-3">
          <div className="border-b border-border pb-2">
            <h1 className="text-base font-bold tracking-tight text-foreground">Limpopo Chess Academy</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Games Database · Updated regularly</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Tournament</p>
              {tournamentSelector}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Game</p>
              {gameSelector}
            </div>
          </div>
          {!isLoading && games.length > 0 && (
            <>
              <GameInfoStrip headers={gameHeaders} />
              <AnalysisPanel fen={currentFen} onToggle={handleEngineToggle} onEvalUpdate={handleEvalUpdate} />
            </>
          )}
          {!isLoading && games.length === 0 && (
            <p className="text-sm text-muted-foreground">No games available for this tournament.</p>
          )}
        </div>

        {/* Moves — fills remaining sidebar height */}
        {!isLoading && games.length > 0 && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-3">
            <MovesList
              moves={gameHistory.moves}
              currentMoveIndex={currentMoveIndex}
              onMoveSelect={navigateTo}
              fillHeight
            />
          </div>
        )}

        {/* Controls — pinned to bottom of sidebar */}
        {!isLoading && games.length > 0 && (
          <div className="flex-shrink-0 px-3 pb-3 pt-2">
            <Controls
              onStart={() => navigateTo(-1)} onPrev={() => navigateTo(currentMoveIndex - 1)}
              onNext={() => navigateTo(currentMoveIndex + 1)} onEnd={() => navigateTo(gameHistory.moves.length - 1)}
              onReplay={toggleReplay} canGoBack={currentMoveIndex > -1}
              canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
              isReplaying={isReplaying} isPaused={isPaused}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game info strip ──────────────────────────────────────────────────────────

function GameInfoStrip({ headers }: { headers: Record<string, string> }) {
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
      {/* Players */}
      <div className="flex items-stretch divide-x divide-border">
        {/* White player — light background */}
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

        {/* Result — center */}
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

        {/* Black player — dark background */}
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

      {/* Meta row */}
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

// ─── Controls ─────────────────────────────────────────────────────────────────

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

// ─── Moves list ───────────────────────────────────────────────────────────────
// Horizontal wrap layout: "1. e4 e5  2. Nf3 Nc6  3. Bb5 …"
// Each full move (white + black) sits on one visual row, wrapped naturally.

const MovesList = React.memo(function MovesList({
  moves,
  currentMoveIndex,
  onMoveSelect,
  compact = false,
  fillHeight = false,
}: {
  moves: UiMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  compact?: boolean;
  fillHeight?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const container = listRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    // Scroll only within the moves container — never touches page scroll
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const relTop = activeRect.top - containerRect.top + container.scrollTop;
    const relBottom = relTop + activeRect.height;
    if (relTop < container.scrollTop) {
      container.scrollTop = relTop - 4;
    } else if (relBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = relBottom - container.clientHeight + 4;
    }
  }, [currentMoveIndex]);

  // Group moves into pairs: [[white, black?], ...]
  const movePairs: Array<[UiMove, UiMove | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1] ?? null]);
  }

  if (compact) {
    return (
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden h-full flex flex-col">
        <div className="px-2 py-1 border-b border-border flex items-center justify-between flex-shrink-0">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Moves</span>
          {moves.length > 0 && <span className="text-[9px] text-muted-foreground font-mono">{currentMoveIndex >= 0 ? currentMoveIndex + 1 : 0}/{moves.length}</span>}
        </div>
        <div ref={listRef} className="overflow-y-auto p-1.5 flex-1">
          {moves.length === 0 ? (
            <p className="text-center py-2 text-xs text-muted-foreground">No moves recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {movePairs.map(([white, black], pairIndex) => {
                const whiteIndex = pairIndex * 2;
                const blackIndex = pairIndex * 2 + 1;
                return (
                  <span key={pairIndex} className="flex items-baseline gap-0.5 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono select-none">{white.moveNumber}.</span>
                    <button ref={whiteIndex === currentMoveIndex ? activeRef : undefined} onClick={() => onMoveSelect(whiteIndex)}
                      className={cn("text-xs px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none", whiteIndex === currentMoveIndex ? "bg-primary text-primary-foreground" : "hover:bg-accent/60 text-foreground")}>
                      {white.san}
                    </button>
                    {black && (
                      <button ref={blackIndex === currentMoveIndex ? activeRef : undefined} onClick={() => onMoveSelect(blackIndex)}
                        className={cn("text-xs px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none", blackIndex === currentMoveIndex ? "bg-primary text-primary-foreground" : "hover:bg-accent/60 text-foreground")}>
                        {black.san}
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
  }

  return (
    <div className={cn(
      "bg-card border border-border rounded-sm shadow-sm overflow-hidden",
      fillHeight && "flex flex-col flex-1 min-h-0"
    )}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Moves
        </h3>
        {moves.length > 0 && (
          <span className="text-[10px] font-mono text-foreground/60 tabular-nums">
            {currentMoveIndex >= 0 ? currentMoveIndex + 1 : 0}<span className="text-muted-foreground">/{moves.length}</span>
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className={cn("overflow-y-auto p-2", fillHeight && "flex-1 min-h-0")}
        style={fillHeight ? undefined : { maxHeight: "220px" }}
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
                  {/* Move number */}
                  <span className="text-[11px] text-muted-foreground font-mono select-none">
                    {white.moveNumber}.
                  </span>

                  {/* White move */}
                  <button
                    ref={
                      whiteIndex === currentMoveIndex ? activeRef : undefined
                    }
                    onClick={() => onMoveSelect(whiteIndex)}
                    className={cn(
                      "text-sm px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none",
                      whiteIndex === currentMoveIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent/60 text-foreground",
                    )}
                  >
                    {white.san}
                  </button>

                  {/* Black move */}
                  {black && (
                    <button
                      ref={
                        blackIndex === currentMoveIndex ? activeRef : undefined
                      }
                      onClick={() => onMoveSelect(blackIndex)}
                      className={cn(
                        "text-sm px-1 py-0.5 rounded-[2px] transition-colors duration-100 font-medium leading-none",
                        blackIndex === currentMoveIndex
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent/60 text-foreground",
                      )}
                    >
                      {black.san}
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

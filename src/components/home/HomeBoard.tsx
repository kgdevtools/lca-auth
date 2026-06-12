"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "@zoendev/react-chessboard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GameData, TournamentMeta } from "@/lib/chess-games/actions";

// Layout-safe measuring (same approach as chess-games' BoardShell).
const useMeasureEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Control styling lifted from chess-games' BoardControls so the home board and
// the games explorer read as the same instrument.
const btn =
  "flex-1 py-1.5 rounded bg-secondary hover:bg-accent text-secondary-foreground disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors";

const iconProps = {
  className: "inline-block shrink-0",
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "currentColor" as const,
  stroke: "none" as const,
};

function PlayIcon() {
  return (
    <svg {...iconProps}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
function PrevGameIcon() {
  return (
    <svg {...iconProps} stroke="currentColor">
      <polygon points="19 20 9 12 19 4" stroke="none" />
      <line x1="5" y1="19" x2="5" y2="5" strokeWidth={2.5} />
    </svg>
  );
}
function NextGameIcon() {
  return (
    <svg {...iconProps} stroke="currentColor">
      <polygon points="5 4 15 12 5 20" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" strokeWidth={2.5} />
    </svg>
  );
}

interface ParsedGame {
  headers: Record<string, string>;
  /** Position before move i+1; fens[0] is the start position. */
  fens: string[];
  /** from/to squares of move i, for the last-move highlight. */
  moves: { from: string; to: string }[];
}

function parseGame(pgn: string): ParsedGame {
  const c = new Chess();
  try {
    c.loadPgn(pgn);
    const headers = c.header() as Record<string, string>;
    const verbose = c.history({ verbose: true });
    const replay = new Chess();
    const fens = [replay.fen()];
    const moves: { from: string; to: string }[] = [];
    for (const m of verbose) {
      replay.move(m.san);
      fens.push(replay.fen());
      moves.push({ from: m.from, to: m.to });
    }
    return { headers, fens, moves };
  } catch {
    return { headers: {}, fens: [new Chess().fen()], moves: [] };
  }
}

export function HomeBoard({
  games,
  tournament,
}: {
  games: GameData[];
  tournament: TournamentMeta | null;
}) {
  const [gi, setGi] = useState(0);
  // Move index into `moves`: -1 = start position, moves.length-1 = final position.
  const [mi, setMi] = useState(-1);
  const [playing, setPlaying] = useState(true);

  const parsed = useMemo(() => parseGame(games[gi]?.pgn ?? ""), [games, gi]);
  const { headers, fens, moves } = parsed;
  const canPrev = mi >= 0;
  const canNext = mi < moves.length - 1;
  const atEnd = !canNext;

  // ── Board width: fill the column but stay short enough that the nameplate,
  // board AND controls all fit in the viewport under the sticky navbar (~80px
  // chrome above, ~120px of title/nameplate/controls around the board).
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useMeasureEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setBoardWidth(Math.min(Math.floor(w), 560, Math.floor(window.innerHeight - 200)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  // ── Autoplay: one move per second; at a game's end, cycle to the next game ──
  // Reads live state through refs so the interval never restarts mid-playback.
  const stateRef = useRef({ mi, moves: moves.length, gi, n: games.length });
  useEffect(() => {
    stateRef.current = { mi, moves: moves.length, gi, n: games.length };
  });
  useEffect(() => {
    if (!playing) return;
    let pause = 0; // beats to hold on the final position before cycling
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.mi < s.moves - 1) {
        setMi(s.mi + 1);
      } else if (pause < 2) {
        pause += 1;
      } else {
        pause = 0;
        setGi((s.gi + 1) % s.n);
        setMi(-1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  // Manual move-stepping takes over from the replay; game-cycling keeps it going.
  const step = (next: number) => {
    setPlaying(false);
    setMi(Math.min(Math.max(next, -1), moves.length - 1));
  };
  const cycleGame = (dir: 1 | -1) => {
    setGi((g) => (g + dir + games.length) % games.length);
    setMi(-1);
  };
  const togglePlay = () => {
    if (!playing && atEnd) setMi(-1); // replay from the start
    setPlaying((p) => !p);
  };

  const currentFen = fens[mi + 1] ?? fens[0];
  const lastMove = mi >= 0 ? moves[mi] : null;
  const squareStyles = lastMove
    ? {
        [lastMove.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        [lastMove.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
      }
    : {};

  const title =
    tournament?.alias || tournament?.display_name || tournament?.name || "Tournament games";

  return (
    <div ref={containerRef} className="w-full max-w-[560px] mx-auto lg:ml-auto lg:mr-8">
      <div style={{ width: boardWidth > 0 ? boardWidth : "100%", maxWidth: "100%" }} className="mx-auto lg:ml-auto lg:mr-0">
      {/* Title row — the one clickable section; everything else drives the board. */}
      <Link
        href="/chess-games"
        className="group flex items-baseline justify-between gap-2 pb-1.5"
      >
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
          Game archive
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>

      {/* Nameplate — same bar the games explorer uses. */}
      <div className="flex items-stretch min-w-0 rounded-t overflow-hidden border border-b-0 border-border">
        <div className="flex-1 min-w-0 bg-zinc-100 flex items-center gap-1.5 px-2.5 py-2">
          <span className="text-sm font-bold text-zinc-900 truncate">{headers.White || "White"}</span>
          {headers.WhiteElo && <span className="text-xs text-zinc-500 tabular-nums shrink-0">{headers.WhiteElo}</span>}
        </div>
        <div className="px-3 flex items-center justify-center bg-zinc-800 shrink-0">
          <span className="text-sm font-bold text-cyan-400 tabular-nums">{headers.Result || "–"}</span>
        </div>
        <div className="flex-1 min-w-0 bg-zinc-950 flex items-center justify-end gap-1.5 px-2.5 py-2">
          {headers.BlackElo && <span className="text-xs text-zinc-500 tabular-nums shrink-0">{headers.BlackElo}</span>}
          <span className="text-sm font-bold text-zinc-100 truncate">{headers.Black || "Black"}</span>
        </div>
      </div>

      {/* Board */}
      <div className="w-full">
        {boardWidth > 0 ? (
          <Chessboard
            position={currentFen}
            boardWidth={boardWidth}
            arePiecesDraggable={false}
            areArrowsAllowed={false}
            customBoardStyle={{ borderRadius: "0" }}
            customSquareStyles={squareStyles}
          />
        ) : (
          <div className="w-full aspect-square bg-muted/20 animate-pulse" />
        )}
      </div>

      {/* Controls — chess-games styling; game-cycling at the ends. */}
      <div className="flex gap-0.5 pt-2">
        <button className={`${btn} grid place-items-center`} onClick={() => cycleGame(-1)} disabled={games.length < 2} title="Previous game">
          <PrevGameIcon />
        </button>
        <button className={btn} onClick={() => step(-1)} disabled={!canPrev} title="Start">⟨⟨</button>
        <button className={btn} onClick={() => step(mi - 1)} disabled={!canPrev} title="Previous move">⟨</button>
        <button
          className={`${btn} grid place-items-center`}
          onClick={togglePlay}
          disabled={moves.length === 0}
          title={playing ? "Pause replay" : "Replay (1s/move)"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className={btn} onClick={() => step(mi + 1)} disabled={!canNext} title="Next move">⟩</button>
        <button className={btn} onClick={() => step(moves.length - 1)} disabled={!canNext} title="End">⟩⟩</button>
        <button className={`${btn} grid place-items-center`} onClick={() => cycleGame(1)} disabled={games.length < 2} title="Next game">
          <NextGameIcon />
        </button>
      </div>
      </div>
    </div>
  );
}

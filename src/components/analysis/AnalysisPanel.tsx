"use client";

import { useEffect, useRef, useState } from "react";
import { useStockfish } from "@/hooks/useStockfish";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import type { EngineEvaluation } from "@/services/stockfish";

interface AnalysisPanelProps {
  fen: string | null;
  onToggle?: (enabled: boolean) => void;
  onEvalUpdate?: (score: number | null, mate: number | null) => void;
  className?: string;
}

function formatScore(ev: EngineEvaluation): string {
  if (ev.mate !== null && ev.mate !== undefined) {
    return ev.mate > 0 ? `+M${Math.abs(ev.mate)}` : `-M${Math.abs(ev.mate)}`;
  }
  return ev.score >= 0 ? `+${ev.score.toFixed(2)}` : ev.score.toFixed(2);
}

function getScoreColor(ev: EngineEvaluation | null): string {
  if (!ev) return "text-muted-foreground";
  if (ev.mate !== null && ev.mate !== undefined) {
    return ev.mate > 0 ? "text-green-500" : "text-red-500";
  }
  if (ev.score > 1.5) return "text-green-500";
  if (ev.score < -1.5) return "text-red-500";
  if (ev.score > 0.3) return "text-green-400";
  if (ev.score < -0.3) return "text-orange-400";
  return "text-yellow-500";
}

// Convert UCI moves like "e2e4 e7e5 g1f3" to chess notation "1. e4 e5 2. Nf3 …"
// We do this by replaying from the current FEN using chess.js
function formatBestLine(pvMoves: string[], fen: string | null): string {
  if (!pvMoves || pvMoves.length === 0) return "";
  try {
    // Dynamically import Chess only when needed (client-side only)
    // We use a synchronous approach since Chess is already loaded in the app
    const { Chess } = require("chess.js");
    const chess = new Chess(fen || undefined);
    const formatted: string[] = [];
    const startMoveNumber = chess.moveNumber();
    const startTurn = chess.turn(); // 'w' or 'b'

    // Limit to 10 half-moves (5 full moves per side)
    const maxHalfMoves = 10;
    const limited = pvMoves.slice(0, maxHalfMoves);

    limited.forEach((uciMove, i) => {
      try {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length === 5 ? uciMove[4] : undefined;
        const move = chess.move({ from, to, promotion });
        if (!move) return;

        const globalHalfMove = i; // 0-based
        const isWhiteMove =
          (startTurn === "w" && globalHalfMove % 2 === 0) ||
          (startTurn === "b" && globalHalfMove % 2 === 1);
        const moveNum =
          startMoveNumber +
          Math.floor((globalHalfMove + (startTurn === "b" ? 1 : 0)) / 2);

        if (isWhiteMove) {
          formatted.push(`${moveNum}. ${move.san}`);
        } else {
          // If first move is black's, show "N..." prefix
          if (i === 0 && startTurn === "b") {
            formatted.push(`${moveNum}… ${move.san}`);
          } else {
            formatted.push(move.san);
          }
        }
      } catch {
        /* skip illegal moves */
      }
    });

    return formatted.join(" ");
  } catch {
    return pvMoves.slice(0, 10).join(" ");
  }
}

export function AnalysisPanel({
  fen,
  onToggle,
  onEvalUpdate,
  className,
}: AnalysisPanelProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [depth, setDepthState] = useState(20);
  const [showSettings, setShowSettings] = useState(false);

  const {
    isReady,
    isAnalyzing,
    isLoading,
    error,
    evaluation,
    analyze,
    stop,
    setDepth,
  } = useStockfish({ autoInit: false });

  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  useEffect(() => {
    if (onEvalUpdate) {
      onEvalUpdate(evaluation?.score ?? null, evaluation?.mate ?? null);
    }
  }, [evaluation, onEvalUpdate]);

  useEffect(() => {
    if (!isEnabled || !fen) return;
    analyzeRef.current(fen);
  }, [fen, isEnabled]);

  useEffect(() => {
    if (!isEnabled) stop();
  }, [isEnabled, stop]);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    onToggle?.(enabled);
    if (enabled && fen) {
      analyzeRef.current(fen);
    } else {
      stop();
    }
  };

  const handleDepthChange = (val: number) => {
    setDepthState(val);
    setDepth(val);
    if (isEnabled && fen && isReady) {
      analyzeRef.current(fen);
    }
  };

  const bestLine = evaluation?.pv ? formatBestLine(evaluation.pv, fen) : "";

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-sm shadow-sm overflow-hidden",
        className,
      )}
    >
      {/* Header row: icon + label | eval score | spinner + toggle */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        {/* Left: icon + label */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <img src="/stockfish16.jpeg" alt="Stockfish" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground">Stockfish 16</span>
        </div>

        {/* Center: eval score — shown when engine is on */}
        {isEnabled && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {evaluation && (
              <span
                className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  getScoreColor(evaluation),
                )}
              >
                {formatScore(evaluation)}
              </span>
            )}
            {(isLoading || (isEnabled && isAnalyzing)) && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {/* Right: toggle */}
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          aria-label="Toggle engine analysis"
          className="rounded-[3px] flex-shrink-0"
        />
      </div>

      {/* Engine details — only when enabled */}
      {isEnabled && (
        <div className="px-3 py-2 space-y-2">
          {error ? (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Depth bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Depth
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {evaluation?.depth ?? 0}/{depth}
                  </span>
                </div>
                <div className="relative h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-primary/50 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((evaluation?.depth ?? 0) / depth) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Best line in proper chess notation */}
              {bestLine && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">
                    Best line
                  </span>
                  <p className="text-xs font-mono text-foreground leading-relaxed break-words">
                    {bestLine}
                  </p>
                </div>
              )}

              {/* Stats */}
              {evaluation?.nodes && (
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                  <span>{(evaluation.nodes / 1000).toFixed(0)}k nodes</span>
                  {evaluation.nps && (
                    <span>{(evaluation.nps / 1000).toFixed(0)}k/s</span>
                  )}
                  {evaluation.time && (
                    <span>{(evaluation.time / 1000).toFixed(1)}s</span>
                  )}
                </div>
              )}

              {/* Settings toggle */}
              <div className="pt-1 border-t border-border/60">
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
                >
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform",
                      showSettings && "rotate-180",
                    )}
                  />
                  Settings
                </button>

                {showSettings && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        Analysis Depth
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {depth}
                      </span>
                    </div>
                    <Slider
                      value={[depth]}
                      onValueChange={([v]) => handleDepthChange(v)}
                      min={5}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

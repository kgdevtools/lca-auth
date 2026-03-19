"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getStockfishService,
  type EngineState,
  type EngineEvaluation,
} from "@/services/stockfish";

export interface UseStockfishOptions {
  autoInit?: boolean;
  depth?: number;
}

export interface UseStockfishReturn {
  isReady: boolean;
  isAnalyzing: boolean;
  isLoading: boolean;
  error: string | null;
  evaluation: EngineEvaluation | null;
  bestMove: string | null;
  initialize: () => Promise<void>;
  analyze: (fen: string) => void;
  stop: () => void;
  setDepth: (depth: number) => void;
}

export function useStockfish(
  options: UseStockfishOptions = {},
): UseStockfishReturn {
  const { autoInit = false, depth: defaultDepth = 20 } = options;

  const [state, setState] = useState<EngineState>({
    isReady: false,
    isAnalyzing: false,
    error: null,
    evaluation: null,
    bestMove: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const depthRef = useRef(defaultDepth);
  // Queue a FEN here if analyze() is called before engine is ready
  const pendingFenRef = useRef<string | null>(null);

  // Subscribe to engine state
  useEffect(() => {
    const service = getStockfishService();
    const unsubscribe = service.subscribe((newState) => {
      setState(newState);

      // When engine becomes ready, fire any queued analysis
      if (newState.isReady && pendingFenRef.current) {
        const fen = pendingFenRef.current;
        pendingFenRef.current = null;
        service.analyze(fen, depthRef.current);
      }
    });
    return unsubscribe;
  }, []);

  const initialize = useCallback(async () => {
    const service = getStockfishService();
    if (service.getState().isReady || isLoading) return;
    setIsLoading(true);
    try {
      await service.initialize();
    } catch (err) {
      console.error("[useStockfish] Init failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (autoInit) initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = useCallback((fen: string) => {
    const service = getStockfishService();

    if (!service.getState().isReady) {
      // Queue the FEN — it will be picked up when readyok fires
      pendingFenRef.current = fen;
      // Kick off initialization if not already running
      setIsLoading(true);
      service
        .initialize()
        .catch((err) => console.error("[useStockfish] Init failed:", err))
        .finally(() => setIsLoading(false));
      return;
    }

    service.analyze(fen, depthRef.current);
  }, []);

  const stop = useCallback(() => {
    getStockfishService().stop();
  }, []);

  const setDepth = useCallback((newDepth: number) => {
    depthRef.current = Math.max(1, Math.min(30, newDepth));
  }, []);

  return {
    isReady: state.isReady,
    isAnalyzing: state.isAnalyzing,
    isLoading,
    error: state.error,
    evaluation: state.evaluation,
    bestMove: state.bestMove,
    initialize,
    analyze,
    stop,
    setDepth,
  };
}

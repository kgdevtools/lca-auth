// src/services/stockfish.ts

export interface EngineEvaluation {
  depth: number;
  score: number;
  mate: number | null;
  pv: string[];
  nodes?: number;
  nps?: number;
  time?: number;
}

export interface EngineState {
  isReady: boolean;
  isAnalyzing: boolean;
  error: string | null;
  evaluation: EngineEvaluation | null;
  bestMove: string | null;
}

type StateChangeHandler = (state: EngineState) => void;
type MessageHandler = (data: string) => void;

class StockfishService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initResolve: (() => void) | null = null;
  private initReject: ((e: Error) => void) | null = null;

  private state: EngineState = {
    isReady: false,
    isAnalyzing: false,
    error: null,
    evaluation: null,
    bestMove: null,
  };

  private stateListeners: Set<StateChangeHandler> = new Set();
  private messageListeners: Set<MessageHandler> = new Set();

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  async initialize(): Promise<void> {
    if (!this.isBrowser()) return;
    if (this.isInitialized) return;
    if (this.worker) return; // already initializing

    return new Promise((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      try {
        this.worker = new Worker("/engine/stockfish-18-lite-single.js");

        this.worker.onmessage = (e: MessageEvent) => {
          // Engine sends either a string directly or {data: string}
          const line: string =
            e && typeof e === "object" && e.data !== undefined
              ? String(e.data)
              : String(e);

          if (!line || !line.trim()) return;

          console.log("[Stockfish]", line);
          this.messageListeners.forEach((h) => h(line));

          if (line === "uciok") {
            this.sendRaw("isready");
            return;
          }

          if (line === "readyok") {
            this.isInitialized = true;
            this.updateState({ isReady: true });
            this.initResolve?.();
            this.initResolve = null;
            this.initReject = null;
            return;
          }

          this.parseMessage(line);
        };

        this.worker.onerror = (e: ErrorEvent) => {
          const msg = e.message || "Worker failed to load";
          //console.error("[Stockfish] Worker error:", msg);

          // "unreachable" is a known Stockfish WASM crash after rapid stop/go cycles
          // Restart the worker automatically
          if (msg.includes("unreachable")) {
            console.log("[Stockfish] Restarting worker after crash...");
            this.worker = null;
            this.isInitialized = false;
            this.updateState({ isReady: false, isAnalyzing: false });
            // Small delay then reinitialize
            setTimeout(() => this.initialize(), 500);
            return;
          }

          this.updateState({ error: msg });
          this.initReject?.(new Error(msg));
          this.initResolve = null;
          this.initReject = null;
        };

        // Send uci — engine queues it until wasm is ready, then processes it
        this.sendRaw("uci");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.updateState({ error: msg });
        reject(new Error(msg));
      }
    });
  }

  // Raw postMessage — bypasses initialized check for init sequence
  private sendRaw(cmd: string): void {
    if (!this.worker) return;
    console.log("[Stockfish] >>", cmd);
    this.worker.postMessage(cmd);
  }

  private sendCommand(cmd: string): void {
    if (!this.worker || !this.isInitialized) return;
    console.log("[Stockfish] >>", cmd);
    this.worker.postMessage(cmd);
  }

  private parseMessage(msg: string): void {
    if (msg.startsWith("bestmove")) {
      const parts = msg.split(" ");
      const bestMove = parts[1] || null;
      this.updateState({ isAnalyzing: false, bestMove });
      return;
    }

    if (msg.includes("info") && msg.includes("score")) {
      this.parseInfoLine(msg);
    }
  }

  private parseInfoLine(msg: string): void {
    const parts = msg.split(" ");
    const info: Partial<EngineEvaluation> = {};

    for (let i = 0; i < parts.length; i++) {
      switch (parts[i]) {
        case "depth":
          info.depth = parseInt(parts[++i], 10);
          break;
        case "score": {
          const type = parts[++i];
          if (type === "cp") {
            info.score = parseInt(parts[++i], 10) / 100;
            info.mate = null;
          } else if (type === "mate") {
            info.mate = parseInt(parts[++i], 10);
            info.score = info.mate > 0 ? 100 : -100;
          }
          break;
        }
        case "nodes":
          info.nodes = parseInt(parts[++i], 10);
          break;
        case "nps":
          info.nps = parseInt(parts[++i], 10);
          break;
        case "time":
          info.time = parseInt(parts[++i], 10);
          break;
        case "pv":
          info.pv = parts.slice(i + 1);
          i = parts.length;
          break;
      }
    }

    if (
      info.depth !== undefined &&
      (info.score !== undefined || info.mate !== undefined)
    ) {
      this.updateState({ evaluation: info as EngineEvaluation });
    }
  }

  private updateState(partial: Partial<EngineState>): void {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((h) => h(this.state));
  }

  getState(): EngineState {
    return { ...this.state };
  }

  subscribe(handler: StateChangeHandler): () => void {
    this.stateListeners.add(handler);
    handler(this.state);
    return () => this.stateListeners.delete(handler);
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  analyze(fen: string, depth = 20): void {
    if (!this.worker || !this.isInitialized) {
      console.warn("[Stockfish] Not initialized yet");
      return;
    }
    this.stop();
    this.updateState({ isAnalyzing: true, evaluation: null, bestMove: null });
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);
  }

  stop(): void {
    if (!this.worker || !this.isInitialized) return;
    this.sendCommand("stop");
    this.updateState({ isAnalyzing: false });
  }

  newGame(): void {
    if (!this.worker || !this.isInitialized) return;
    this.sendCommand("ucinewgame");
    this.updateState({ evaluation: null, bestMove: null });
  }

  setOption(name: string, value: string | number): void {
    if (!this.worker || !this.isInitialized) return;
    this.sendCommand(`setoption name ${name} value ${value}`);
  }

  destroy(): void {
    if (this.worker) {
      this.sendCommand("stop");
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.initResolve = null;
    this.initReject = null;
    this.stateListeners.clear();
    this.messageListeners.clear();
    this.updateState({
      isReady: false,
      isAnalyzing: false,
      error: null,
      evaluation: null,
      bestMove: null,
    });
  }
}

let instance: StockfishService | null = null;

export function getStockfishService(): StockfishService {
  if (!instance) {
    instance = new StockfishService();
  }
  return instance;
}

export type { StockfishService };

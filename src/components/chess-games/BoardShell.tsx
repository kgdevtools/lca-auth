'use client';
import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';

// useLayoutEffect fires synchronously after DOM commit (before paint), so
// getBoundingClientRect always returns real values. Falls back to useEffect on
// the server where layout APIs are unavailable.
const useMeasureEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { Chessboard } from '@zoendev/react-chessboard';
import type { Square as CbSquare, Piece, PromotionPieceOption } from '@zoendev/react-chessboard/dist/chessboard/types/index';
import type { Square, PieceSymbol } from 'chess.js';
import { useBoardGame } from '@/hooks/chess-games/useBoardGame';
import { useBoardEngine } from '@/hooks/chess-games/useBoardEngine';
import { EvalBar } from './EvalBar';
import { MovesList } from './MovesList';
import { EngineLines } from './EngineLines';
import { BoardControls } from './BoardControls';
import { FenBar } from './FenBar';
import { GameInfoModal } from './GameInfoModal';
import { TournamentLibraryModal } from './TournamentLibraryModal';
import type { GameData } from '@/lib/chess-games/actions';

// ─── Game info header ─────────────────────────────────────────────────────────

// Renders the rich player card when the loaded game has player metadata, and
// stays out of the way otherwise. Clicking the card opens the editor.
function GameInfoHeader({
  headers,
  onOpen,
}: {
  headers: Record<string, string>;
  onOpen: () => void;
}) {
  const { White: white, Black: black, WhiteElo: wElo, BlackElo: bElo, Result: result, Event: event, Date: date } = headers;
  const hasPlayers = white || black;

  if (!hasPlayers) return null;

  return (
    <div className="w-full mb-2 rounded overflow-hidden border border-border hover:border-muted-foreground/40 transition-colors">
      {/* Player row — clickable to edit game data */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
        className="flex items-stretch cursor-pointer min-w-0"
      >
        {/* White */}
        <div className="flex-1 min-w-0 bg-zinc-100 flex items-center gap-1.5 px-2.5 py-2.5">
          <span className="text-sm font-bold text-zinc-900 truncate">{white ?? '?'}</span>
          {wElo && <span className="text-xs text-zinc-500 tabular-nums shrink-0">{wElo}</span>}
        </div>

        {/* Result */}
        <div className="px-3 flex items-center justify-center bg-zinc-800 shrink-0">
          <span className="text-sm font-bold text-cyan-400 tabular-nums">{result ?? '–'}</span>
        </div>

        {/* Black */}
        <div className="flex-1 min-w-0 bg-zinc-950 flex items-center justify-end gap-1.5 px-2.5 py-2.5">
          {bElo && <span className="text-xs text-zinc-500 tabular-nums shrink-0">{bElo}</span>}
          <span className="text-sm font-bold text-zinc-100 truncate">{black ?? '?'}</span>
        </div>
      </div>

      {/* Event / Date row */}
      {(event || date) && (
        <div
          role="button"
          tabIndex={-1}
          onClick={onOpen}
          className="flex items-center justify-between px-2.5 py-1.5 bg-muted border-t border-border cursor-pointer"
        >
          <span className="text-xs font-semibold text-muted-foreground truncate pr-2">{event ?? ''}</span>
          <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">{date ?? ''}</span>
        </div>
      )}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pieceColor(piece: Piece): 'w' | 'b' {
  return piece[0] as 'w' | 'b';
}

function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] as 'w' | 'b';
}

function promotionPiece(opt: PromotionPieceOption): PieceSymbol {
  return opt[1].toLowerCase() as PieceSymbol;
}

// ─── BoardShell ───────────────────────────────────────────────────────────────

/** The minimal game shape the playlist needs (a superset is fine, e.g. GameData). */
type PlaylistGame = Pick<GameData, 'title' | 'pgn'>;

interface BoardShellProps {
  initialPgn?: string;
  initialFen?: string;
  /** Seed the board's playlist with these games (loaded on mount). */
  games?: PlaylistGame[];
  /** Which playlist game to load on mount (default 0). */
  initialIndex?: number;
  /** Fires whenever the loaded playlist game changes (incl. in-board stepping). */
  onGameChange?: (index: number) => void;
  /** Hide the FEN/PGN load bar (not needed when embedding a fixed game). */
  hideFenBar?: boolean;
}

export function BoardShell({ initialPgn, initialFen, games, initialIndex, onGameChange, hideFenBar }: BoardShellProps) {
  const game = useBoardGame();
  const engine = useBoardEngine(game.currentFen);

  // ── Desktop/mobile detection ───────────────────────────────────────────────
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Board width ────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useMeasureEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = (w: number) => {
      if (w > 0) setBoardWidth(Math.min(Math.floor(w), 560));
    };

    const bcr = el.getBoundingClientRect();
    apply(bcr.width || Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 560));

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(entries => apply(entries[0]?.contentRect.width ?? 0));
      ro.observe(el);
      return () => ro.disconnect();
    }
    const onResize = () => apply(el.getBoundingClientRect().width || Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 560));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Game info modal ────────────────────────────────────────────────────────
  const [showGameInfo, setShowGameInfo] = useState(false);

  // ── Library + game playlist ──────────────────────────────────────────────────
  const [showLibrary, setShowLibrary] = useState(false);
  // The folder's games + current index, so the board can step game-to-game.
  const [playlist, setPlaylist] = useState<PlaylistGame[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  // Tournament display name for the breadcrumb (set when picked from the library).
  const [playlistLabel, setPlaylistLabel] = useState<string | null>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const gameTitle = useCallback((g: PlaylistGame): string => {
    if (g.title) return g.title;
    const w = g.pgn.match(/^\s*\[White\s+"([^"]*)"\]/m)?.[1] ?? '?';
    const b = g.pgn.match(/^\s*\[Black\s+"([^"]*)"\]/m)?.[1] ?? '?';
    return `${w} vs ${b}`;
  }, []);

  const loadGameAt = useCallback((list: PlaylistGame[], index: number) => {
    const g = list[index];
    if (!g) return;
    const ok = game.loadPgn(g.pgn);
    setPlaylistIndex(index);
    onGameChange?.(index);
    showToast(ok ? `Loaded: ${gameTitle(g)}` : 'Could not read that game');
  }, [game, showToast, gameTitle, onGameChange]);

  const handleSelectGame = useCallback((games: PlaylistGame[], index: number, label?: string) => {
    setPlaylist(games);
    if (label !== undefined) setPlaylistLabel(label);
    setShowLibrary(false);
    loadGameAt(games, index);
  }, [loadGameAt]);

  // ── Initial load (runs once) — seed from `games` playlist, else PGN/FEN ──────
  const initApplied = useRef(false);
  useEffect(() => {
    if (initApplied.current) return;
    initApplied.current = true;
    if (games && games.length > 0) {
      const idx = Math.min(Math.max(initialIndex ?? 0, 0), games.length - 1);
      setPlaylist(games);
      loadGameAt(games, idx);
      return;
    }
    if (initialPgn) { game.loadPgn(initialPgn); return; }
    if (initialFen) { game.loadFen(initialFen); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrevGame = playlistIndex > 0;
  const canNextGame = playlistIndex >= 0 && playlistIndex < playlist.length - 1;
  const handlePrevGame = useCallback(() => {
    if (playlistIndex > 0) loadGameAt(playlist, playlistIndex - 1);
  }, [playlist, playlistIndex, loadGameAt]);
  const handleNextGame = useCallback(() => {
    if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) loadGameAt(playlist, playlistIndex + 1);
  }, [playlist, playlistIndex, loadGameAt]);

  // Wrap load callbacks so errors surface to the user.
  const handlePgnLoad = useCallback((pgn: string): boolean => {
    const ok = game.loadPgn(pgn);
    if (!ok) showToast('Could not read that PGN — check the moves and try again');
    return ok;
  }, [game, showToast]);

  // ── Click-to-move ──────────────────────────────────────────────────────────
  const [selectedSq, setSelectedSq] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  // While a touch long-press arrow is in progress, pieces are temporarily locked
  // (and the page won't scroll) so the finger drag draws an arrow instead.
  const [drawingArrow, setDrawingArrow] = useState(false);

  useEffect(() => { setSelectedSq(null); }, [game.currentFen]);

  const mover = sideToMove(game.currentFen);

  const legalDests = useMemo(() => {
    if (!selectedSq) return new Set<string>();
    return new Set(
      game.legalMoves.filter((m) => m.from === selectedSq).map((m) => m.to),
    );
  }, [selectedSq, game.legalMoves]);

  // Double-tap / double-click a square toggles a highlight (standard board UX).
  const lastTap = useRef<{ square: string; time: number } | null>(null);

  const handleSquareClick = useCallback(
    (sq: CbSquare, piece: Piece | undefined) => {
      const square = sq as Square;

      // Double-tap detection (same square twice within 300ms) → highlight.
      const now = Date.now();
      if (lastTap.current && lastTap.current.square === square && now - lastTap.current.time < 300) {
        lastTap.current = null;
        setSelectedSq(null);
        game.addHighlight(square);
        return;
      }
      lastTap.current = { square, time: now };

      if (!selectedSq && game.hasAnnotations) {
        game.removeLastDecoration();
        return;
      }
      if (!selectedSq) {
        if (piece && pieceColor(piece) === mover) setSelectedSq(square);
        return;
      }
      if (legalDests.has(square)) {
        const moved = game.makeMove(selectedSq, square);
        setSelectedSq(moved ? null : selectedSq);
        return;
      }
      if (piece && pieceColor(piece) === mover) {
        setSelectedSq(square);
        return;
      }
      setSelectedSq(null);
    },
    [selectedSq, legalDests, mover, game],
  );

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const handlePieceDrop = useCallback(
    (from: CbSquare, to: CbSquare): boolean => {
      setSelectedSq(null);
      return game.makeMove(from as Square, to as Square);
    },
    [game],
  );

  // ── Promotion ──────────────────────────────────────────────────────────────
  const handlePromotionCheck = useCallback(
    (from: CbSquare, to: CbSquare, piece: Piece): boolean => {
      const isWhitePawn = piece === 'wP' && from[1] === '7' && to[1] === '8';
      const isBlackPawn = piece === 'bP' && from[1] === '2' && to[1] === '1';
      if (isWhitePawn || isBlackPawn) {
        setPendingPromo({ from: from as Square, to: to as Square });
        return true;
      }
      return false;
    },
    [],
  );

  const handlePromotionSelect = useCallback(
    (opt?: PromotionPieceOption, from?: CbSquare, to?: CbSquare): boolean => {
      const src = (from as Square | undefined) ?? pendingPromo?.from;
      const dst = (to as Square | undefined) ?? pendingPromo?.to;
      if (!src || !dst || !opt) { setPendingPromo(null); return false; }
      const result = game.makeMove(src, dst, promotionPiece(opt));
      setPendingPromo(null);
      setSelectedSq(null);
      return result;
    },
    [game, pendingPromo],
  );

  // ── Board decorations: automatic, no toggle ────────────────────────────────
  // Standard modern-board gestures, baked in:
  //   • Desktop: right-click a square = highlight, right-click-drag = arrow.
  //   • Touch:   double-tap a square = highlight (handled in handleSquareClick);
  //              long-press (~350ms) then drag = arrow.
  // The square under the pointer is resolved via elementFromPoint so it's
  // deterministic regardless of contextmenu/pointerup ordering. During a touch
  // long-press the piece becomes undraggable and the page won't scroll, so the
  // finger drag draws an arrow rather than moving a piece or scrolling.
  const LONG_PRESS_MS = 350;
  const MOVE_TOLERANCE = 10; // px before a touch counts as a drag (cancels long-press)

  const annoStart = useRef<string | null>(null);          // arrow origin square
  const touchDown = useRef<{ x: number; y: number; square: string | null } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawingRef = useRef(false);                        // mirror of drawingArrow for handlers

  const squareAtPoint = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const sqEl = el?.closest('[data-square]');
    return sqEl?.getAttribute('data-square') ?? null;
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handleBoardPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      // Right button arms an arrow/highlight gesture.
      if (e.button === 2) annoStart.current = squareAtPoint(e.clientX, e.clientY);
      return;
    }
    // Touch / pen: arm a long-press that promotes the gesture to arrow-drawing.
    const square = squareAtPoint(e.clientX, e.clientY);
    touchDown.current = { x: e.clientX, y: e.clientY, square };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      if (!touchDown.current) return;
      annoStart.current = touchDown.current.square;
      drawingRef.current = true;
      setDrawingArrow(true); // locks pieces + disables page scroll for the drag
    }, LONG_PRESS_MS);
  }, [squareAtPoint, clearLongPress]);

  const handleBoardPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || drawingRef.current || !touchDown.current) return;
    // Moved before the long-press fired → it's a piece drag / scroll, not an arrow.
    if (Math.hypot(e.clientX - touchDown.current.x, e.clientY - touchDown.current.y) > MOVE_TOLERANCE) {
      clearLongPress();
      touchDown.current = null;
    }
  }, [clearLongPress]);

  const finishArrow = useCallback((x: number, y: number) => {
    const start = annoStart.current;
    annoStart.current = null;
    if (!start) return;
    const end = squareAtPoint(x, y);
    if (!end) return;
    if (start === end) game.addHighlight(start);
    else game.addArrow(start, end);
  }, [squareAtPoint, game]);

  const handleBoardPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 2) finishArrow(e.clientX, e.clientY);
      return;
    }
    // Touch / pen
    clearLongPress();
    if (drawingRef.current) {
      finishArrow(e.clientX, e.clientY);
      drawingRef.current = false;
      setDrawingArrow(false);
    }
    touchDown.current = null;
  }, [finishArrow, clearLongPress]);

  const handleBoardPointerCancel = useCallback(() => {
    clearLongPress();
    touchDown.current = null;
    annoStart.current = null;
    if (drawingRef.current) { drawingRef.current = false; setDrawingArrow(false); }
  }, [clearLongPress]);

  // ── Square styles ──────────────────────────────────────────────────────────
  const squareStyles = useMemo(() => {
    const styles: Record<string, Record<string, string | number>> = {};
    if (game.current.move) {
      const tint = { backgroundColor: 'rgba(155, 199, 0, 0.41)' };
      styles[game.current.move.from] = tint;
      styles[game.current.move.to] = tint;
    }
    for (const sq of game.annotationHighlights) {
      styles[sq] = { backgroundColor: 'rgba(255, 128, 0, 0.5)' };
    }
    if (selectedSq) {
      styles[selectedSq] = { backgroundColor: 'rgba(20, 85, 30, 0.5)' };
      legalDests.forEach((dest) => {
        styles[dest] = {
          background: 'radial-gradient(circle, rgba(0,0,0,0.2) 28%, transparent 28%)',
        };
      });
    }
    return styles;
  }, [game.current, game.annotationHighlights, selectedSq, legalDests]);

  // ── Arrows ─────────────────────────────────────────────────────────────────
  const allArrows = useMemo((): [CbSquare, CbSquare, string][] => {
    const userArrows = game.annotationArrows.map(
      ([from, to]) => [from as CbSquare, to as CbSquare, 'rgba(255,128,0,0.85)'] as [CbSquare, CbSquare, string],
    );
    const pv0 = engine.lines[0]?.pv[0];
    const engineArrow: [CbSquare, CbSquare, string][] =
      pv0 && pv0.length >= 4
        ? [[pv0.slice(0, 2) as CbSquare, pv0.slice(2, 4) as CbSquare, 'rgba(0,120,255,0.55)']]
        : [];
    return [...engineArrow, ...userArrows];
  }, [game.annotationArrows, engine.lines]);

  const canPrev = game.current.parent !== null;
  const canNext = game.current.children.length > 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Main layout: stacked on mobile, side-by-side on desktop ─────── */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-start">

        {/* Breadcrumb + eval bar + board */}
        {/* Outer wrapper has CSS-intrinsic dimensions so getBoundingClientRect()
            always returns a real value regardless of device or SSR state. */}
        <div
          className="flex flex-col gap-2 shrink-0"
          style={{ width: 'min(90vw, 90vh, 560px)', maxWidth: '100%' }}
        >
          {/* Library breadcrumb — primary, always-visible entry point to the games
              library, and a "you are here" cue once a game is loaded. */}
          <button
            onClick={() => setShowLibrary(true)}
            title="Browse games library"
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent transition-colors text-sm"
          >
            {playlistIndex >= 0 && playlist.length > 0 ? (
              <span className="flex items-center gap-1.5 min-w-0">
                <FolderIcon />
                <span className="truncate font-medium">{playlistLabel ?? 'Games'}</span>
                <span className="shrink-0 text-muted-foreground">
                  ▸ Game {playlistIndex + 1}/{playlist.length}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <FolderIcon />
                Browse games library
              </span>
            )}
            <ChevronDownIcon />
          </button>

          <div className="flex gap-1.5 items-start">
          {boardWidth > 0 && (
            <EvalBar
              score={engine.evalScore}
              mate={engine.lines[0]?.mate}
              height={boardWidth}
            />
          )}
          <div
            ref={containerRef}
            className="flex-1 min-w-0"
            data-board-container="true"
            // touch-action:none during a long-press arrow draw so the finger drag
            // draws an arrow instead of scrolling the page.
            style={{ aspectRatio: '1 / 1', touchAction: drawingArrow ? 'none' : undefined }}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
            onPointerCancel={handleBoardPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            {boardWidth > 0 && <Chessboard
              position={game.currentFen}
              boardWidth={boardWidth}
              boardOrientation={game.flipped ? 'black' : 'white'}
              arePiecesDraggable={!drawingArrow}
              onSquareClick={handleSquareClick}
              onPieceDrop={handlePieceDrop}
              onPromotionCheck={handlePromotionCheck}
              onPromotionPieceSelect={handlePromotionSelect}
              promotionDialogVariant="modal"
              showPromotionDialog={pendingPromo !== null}
              promotionToSquare={pendingPromo?.to as CbSquare | undefined}
              areArrowsAllowed={false}
              customArrows={allArrows}
              customSquareStyles={squareStyles}
            />}
          </div>
          </div>
        </div>

        {/* Right panel */}
        <div
          className="w-full lg:flex-1 lg:min-w-[220px] bg-card border border-border rounded-md flex flex-col gap-2 lg:overflow-hidden"
          style={isDesktop && boardWidth > 0 ? { height: boardWidth } : undefined}
        >
          {/* Controls — first on mobile (order-1), last on desktop (order-3) */}
          <div className="order-1 lg:order-3 shrink-0 px-2">
            <BoardControls
              onStart={game.goStart}
              onPrev={game.goPrev}
              onNext={game.goNext}
              onEnd={game.goEnd}
              onFlip={game.flipBoard}
              canPrev={canPrev}
              canNext={canNext}
              exportPgn={game.exportPgn}
              onPrevGame={handlePrevGame}
              onNextGame={handleNextGame}
              canPrevGame={canPrevGame}
              canNextGame={canNextGame}
              onNewGame={game.newGame}
              onOpenLibrary={() => setShowLibrary(true)}
            />
          </div>

          {/* Moves list — second on mobile (order-2), first on desktop (order-1) */}
          <div className="order-2 lg:order-1 lg:flex-1 lg:min-h-0 mx-2 flex flex-col min-h-0">
            <GameInfoHeader
              headers={game.headers}
              onOpen={() => setShowGameInfo(true)}
            />
            {/* On mobile the move list is capped so long games scroll inside the
                component (its own scroll container) instead of stretching the page;
                on desktop it fills the panel height. */}
            <div className="overflow-y-auto max-h-[40vh] lg:max-h-none lg:flex-1 lg:min-h-0">
              <MovesList
                tokens={game.tokens}
                current={game.current}
                onSelect={game.goTo}
                onDeleteMove={game.deleteMove}
                onDeleteAfter={game.deleteAfter}
                comments={game.nodeComments}
                onSetComment={game.setNodeComment}
                nags={game.nags}
                onSetNags={game.setNodeNags}
                evals={game.evals}
                clocks={game.clocks}
              />
            </div>
          </div>

          {/* Engine lines — third on mobile (order-3), second on desktop (order-2) */}
          <div className="order-3 lg:order-2 shrink-0">
            <EngineLines
              lines={engine.lines}
              depth={engine.depth}
              isComputing={engine.isComputing}
              enabled={engine.enabled}
              onToggle={engine.toggleEngine}
              currentFen={game.currentFen}
            />
          </div>
        </div>
      </div>

      {/* ── FEN / PGN bar ───────────────────────────────────────────────── */}
      {!hideFenBar && (
        <FenBar
          currentFen={game.currentFen}
          onFenLoad={game.loadFen}
          onPgnLoad={handlePgnLoad}
          exportPgn={game.exportPgn}
        />
      )}

      {/* ── Game info modal ──────────────────────────────────────────────── */}
      {showGameInfo && (
        <GameInfoModal
          headers={game.headers}
          onSetHeader={game.setHeader}
          onClose={() => setShowGameInfo(false)}
        />
      )}

      {/* ── Library modal ────────────────────────────────────────────────── */}
      {showLibrary && (
        <TournamentLibraryModal
          onSelectGame={handleSelectGame}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-full text-xs text-zinc-100 shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

    </div>
  );
}

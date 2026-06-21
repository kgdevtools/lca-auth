'use client';
import { useEffect, useRef, useState } from 'react';

const iconProps = {
  className: 'inline-block shrink-0',
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function DownloadIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.5}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.5}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none" width={14} height={14}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none" width={14} height={14}>
      <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

// Previous / next GAME (whole-game step) — distinct from the move chevrons.
function PrevGameIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="currentColor" width={14} height={14}>
      <polygon points="19 20 9 12 19 4" stroke="none" />
      <line x1="5" y1="19" x2="5" y2="5" strokeWidth={2.5} />
    </svg>
  );
}

function NextGameIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="currentColor" width={14} height={14}>
      <polygon points="5 4 15 12 5 20" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" strokeWidth={2.5} />
    </svg>
  );
}

interface BoardControlsProps {
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onFlip: () => void;
  canPrev: boolean;
  canNext: boolean;
  exportPgn: () => string;
  // Whole-game navigation within the loaded tournament folder.
  onPrevGame: () => void;
  onNextGame: () => void;
  canPrevGame: boolean;
  canNextGame: boolean;
  // 3-dot menu actions
  onNewGame: () => void;
  onOpenLibrary: () => void;
}

const btn =
  'flex-1 py-1.5 rounded bg-secondary hover:bg-accent text-secondary-foreground disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors';

const menuItem =
  'flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-accent text-popover-foreground';
const sectionLabel =
  'px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground';

export function BoardControls({
  onStart, onPrev, onNext, onEnd, onFlip,
  canPrev, canNext,
  exportPgn,
  onPrevGame, onNextGame, canPrevGame, canNextGame,
  onNewGame, onOpenLibrary,
}: BoardControlsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ── Replay (auto-advance) ──────────────────────────────────────────────────
  // A persistent interval steps once per second while playing. It reads the
  // latest position/handler through refs rather than effect deps so a deps-driven
  // effect doesn't restart and only fire once.
  const [isPlaying, setIsPlaying] = useState(false);
  const onNextRef = useRef(onNext);
  const canNextRef = useRef(canNext);
  useEffect(() => { onNextRef.current = onNext; canNextRef.current = canNext; });

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (!canNextRef.current) { setIsPlaying(false); return; } // reached the end
      onNextRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  const toggleReplay = () => {
    if (isPlaying) { setIsPlaying(false); return; }
    if (!canNext) onStart(); // at the end → replay from the start
    setIsPlaying(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'Home') { e.preventDefault(); onStart(); }
      else if (e.key === 'End') { e.preventDefault(); onEnd(); }
      else if (e.key === 'f' || e.key === 'F') onFlip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStart, onPrev, onNext, onEnd, onFlip]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setShowMenu(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [showMenu]);

  const handleDownloadPgn = () => {
    const pgn = exportPgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game.pgn';
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  // Wrap menu actions so the dropdown closes after each.
  const runAndClose = (fn: () => void) => () => { fn(); setShowMenu(false); };

  return (
    <div className="relative flex gap-0.5 pt-2 border-t border-border">
      {/* Library — promoted out of the ··· menu so it's discoverable (the #1 task). */}
      <button
        className="flex-none flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
        onClick={onOpenLibrary}
        title="Browse games library"
      >
        <FolderIcon />
        <span className="hidden sm:inline">Games</span>
      </button>
      {/* Previous game (whole-game step) */}
      <button className={`${btn} grid place-items-center`} onClick={onPrevGame} disabled={!canPrevGame} title="Previous game">
        <PrevGameIcon />
      </button>
      <button className={btn} onClick={onStart} disabled={!canPrev} title="Start (Home)">⟨⟨</button>
      <button className={btn} onClick={onPrev}  disabled={!canPrev} title="Previous (←)">⟨</button>
      <button
        className={`${btn} grid place-items-center`}
        onClick={toggleReplay}
        disabled={!canNext && !canPrev}
        title={isPlaying ? 'Pause replay' : 'Replay (1s/move)'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button className={btn} onClick={onNext}  disabled={!canNext} title="Next (→)">⟩</button>
      <button className={btn} onClick={onEnd}   disabled={!canNext} title="End (End)">⟩⟩</button>
      <button className={btn} onClick={onFlip}  title="Flip board (F)">⇅</button>
      {/* Next game (whole-game step) — last control */}
      <button className={`${btn} grid place-items-center`} onClick={onNextGame} disabled={!canNextGame} title="Next game">
        <NextGameIcon />
      </button>

      {/* 3-dot menu trigger */}
      <button
        ref={triggerRef}
        className="flex-none px-2 py-1.5 rounded bg-secondary hover:bg-accent text-secondary-foreground text-sm transition-colors"
        onClick={() => setShowMenu((v) => !v)}
        title="More options"
      >
        ···
      </button>

      {/* Dropdown — opens upward */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-0 mb-1 z-50 bg-popover border border-border rounded shadow-xl py-1 min-w-[210px] text-sm max-h-[70vh] overflow-y-auto"
        >
          {/* ── Board ────────────────────────────────────────────── */}
          <div className={sectionLabel}>Board</div>
          <button className={menuItem} onClick={runAndClose(onNewGame)}>
            <PlusIcon />
            New / Empty Board
          </button>

          {/* ── Export ───────────────────────────────────────────── */}
          <div className="my-1 border-t border-border" />
          <div className={sectionLabel}>Export</div>
          <button className={menuItem} onClick={handleDownloadPgn}>
            <DownloadIcon />
            Download PGN
          </button>
        </div>
      )}
    </div>
  );
}

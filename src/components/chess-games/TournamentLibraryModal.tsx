'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  listTournaments,
  fetchGames,
  searchGames,
  type TournamentMeta,
  type GameData,
  type GameSearchResult,
} from '@/lib/chess-games/actions';
import { isNewItem } from '@/lib/chess-games/utils';

// ── Page-session cache ──────────────────────────────────────────────────────────
// Module-scoped so it survives the modal unmounting/remounting (open → close →
// reopen) for the lifetime of the page. We only refetch on a hard reload. This
// keeps reopening the browser instant instead of re-hitting Supabase each time.
let tournamentsCache: TournamentMeta[] | null = null;
const gamesCache = new Map<string, GameData[]>();

// ── Icons ─────────────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function gamePlayers(pgn: string): string {
  const w = pgn.match(/^\s*\[White\s+"([^"]*)"\]/m)?.[1] ?? '?';
  const b = pgn.match(/^\s*\[Black\s+"([^"]*)"\]/m)?.[1] ?? '?';
  return `${w} vs ${b}`;
}

const NewBadge = () => (
  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-primary text-primary-foreground shrink-0">New</span>
);

// ── Modal ─────────────────────────────────────────────────────────────────────

interface TournamentLibraryModalProps {
  // Receives the whole folder's game list + the chosen index so the board can
  // cycle to the next / previous game without reopening the modal. `label` is the
  // tournament's display name, surfaced as the board breadcrumb.
  onSelectGame: (games: GameData[], index: number, label: string) => void;
  onClose: () => void;
}

export function TournamentLibraryModal({ onSelectGame, onClose }: TournamentLibraryModalProps) {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>(tournamentsCache ?? []);
  const [folder, setFolder] = useState<TournamentMeta | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(tournamentsCache === null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Search (player / tournament name + optional date range) ─────────────────
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const searchActive = search.trim().length >= 2 || !!dateFrom || !!dateTo;

  // Debounced fuzzy search; reruns when the term or date range changes.
  useEffect(() => {
    if (!searchActive) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { results: hits, error } = await searchGames(search, { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      if (cancelled) return;
      if (error) setError(error);
      setResults(hits);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, dateFrom, dateTo, searchActive]);

  // Load tournament folders on mount — only hits the network on a cache miss.
  useEffect(() => {
    if (tournamentsCache !== null) return;
    let mounted = true;
    (async () => {
      const { tournaments: fetched, error } = await listTournaments();
      if (!mounted) return;
      if (error) setError(error);
      else tournamentsCache = fetched;
      setTournaments(fetched);
      setLoadingFolders(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const openFolder = useCallback(async (t: TournamentMeta) => {
    setFolder(t);
    setError(null);
    const cached = gamesCache.get(t.id);
    if (cached) { setGames(cached); return; }
    setLoadingGames(true);
    const { games: fetched, error } = await fetchGames(t.id);
    if (error) { setError(error); setGames([]); }
    else { gamesCache.set(t.id, fetched); setGames(fetched); }
    setLoadingGames(false);
  }, []);

  const folderLabel = (t: TournamentMeta) => t.alias || t.display_name || t.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {folder && (
              <button
                onClick={() => { setFolder(null); setGames([]); setError(null); }}
                className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="truncate text-sm font-semibold text-foreground">
              {folder ? folderLabel(folder) : 'Tournament Games'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
            <CloseIcon />
          </button>
        </div>

        {/* Search + filters */}
        <div className="border-b border-border px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded border border-border bg-background px-2.5 py-1.5">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player or tournament…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground" aria-label="Clear search">
                  <CloseIcon />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`rounded border px-2 py-1.5 text-[11px] ${dateFrom || dateTo ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Date
            </button>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <label className="flex items-center gap-1">From
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded border border-border bg-background px-1.5 py-1 text-foreground" />
              </label>
              <label className="flex items-center gap-1">To
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded border border-border bg-background px-1.5 py-1 text-foreground" />
              </label>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="underline hover:text-foreground">clear</button>
              )}
            </div>
          )}
        </div>

        {/* Breadcrumb (browse mode only) */}
        {!searchActive && (
          <div className="border-b border-border px-4 py-1.5 text-[11px] text-muted-foreground">
            <span className={folder ? 'cursor-pointer hover:text-foreground' : 'text-foreground'} onClick={() => { setFolder(null); setGames([]); }}>
              Tournaments
            </span>
            {folder && <span> / {folderLabel(folder)}</span>}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <p className="px-2 py-3 text-xs text-destructive">{error}</p>
          )}

          {/* Search results */}
          {searchActive && (
            searching ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No games match.</p>
            ) : (
              <ul className="space-y-0.5">
                {results.map((g, i) => (
                  <li key={g.id}>
                    <button
                      onClick={() => onSelectGame(results, i, search.trim() ? `Search: "${search.trim()}"` : 'Filtered games')}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <FileIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {(g.white_name || '?')} vs {(g.black_name || '?')}
                          {g.result && <span className="text-muted-foreground"> · {g.result}</span>}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {g.tournament_name || ''}{g.date ? ` · ${g.date}` : ''}
                        </span>
                      </span>
                      {isNewItem(g.created_at) && <NewBadge />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Folder list */}
          {!searchActive && !folder && (
            loadingFolders ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading tournaments…</p>
            ) : tournaments.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tournaments available.</p>
            ) : (
              <ul className="space-y-0.5">
                {tournaments.map((t) => (
                  <li key={t.name}>
                    <button
                      onClick={() => openFolder(t)}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <FolderIcon />
                      <span className="flex-1 truncate">{folderLabel(t)}</span>
                      {isNewItem(t.created_at) && <NewBadge />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Game list */}
          {!searchActive && folder && (
            loadingGames ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading games…</p>
            ) : games.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No games in this tournament.</p>
            ) : (
              <ul className="space-y-0.5">
                {games.map((g, i) => (
                  <li key={g.id}>
                    <button
                      onClick={() => onSelectGame(games, i, folderLabel(folder))}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <FileIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">{gamePlayers(g.pgn)}</span>
                        {g.title && <span className="block truncate text-[10px] text-muted-foreground">{g.title}</span>}
                      </span>
                      {isNewItem(g.created_at) && <NewBadge />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </div>
  );
}

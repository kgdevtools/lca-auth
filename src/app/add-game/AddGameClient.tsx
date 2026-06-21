// src/app/add-game/AddGameClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Trash2, Pencil, Loader2, Lock } from "lucide-react";
import Link from "next/link";

import { BoardShell } from "@/components/chess-games/BoardShell";
import {
  listTournaments, fetchGames, addGame, addMultipleGames, editGame, deleteGame,
  createTournament, renameTournament, deleteTournament,
  type GameData, type TournamentMeta,
} from "@/lib/chess-games/actions";
import { splitMultiGamePgn } from "./utils";
import { AddGameForm, EMPTY_FORM, validateGameForm, type GameForm } from "./AddGameForm";

// ─── Pure PGN helpers ───────────────────────────────────────────────────────────
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const re = /^\s*\[([^\s\]]+)\s+"([^"]*)"\]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn)) !== null) headers[m[1]] = m[2];
  return headers;
}
function generateTitleFromPgn(h: Record<string, string>): string {
  const white = h.White || "", black = h.Black || "";
  if (!white && !black) return "";
  return `${white || "?"} vs ${black || "?"}`;
}
function validatePgn(pgn: string): { valid: boolean; error?: string } {
  if (!pgn.trim()) return { valid: false, error: "PGN cannot be empty" };
  const fixed = pgn.replace(/\[TimeControl\s+"([^"]*'[^"]*)""\]/g, (_m, v: string) => `[TimeControl "${v.replace(/'/g, "+")}"]`);
  for (const candidate of [pgn, fixed]) {
    try { new Chess().loadPgn(candidate); return { valid: true }; } catch { /* try next */ }
  }
  return { valid: false, error: "Invalid PGN format" };
}
function constructPgn(movesText: string, m: Record<string, string>): string {
  const keys: [string, string][] = [
    ["Event", m.event], ["Site", ""], ["Date", m.date], ["White", m.white], ["Black", m.black],
    ["Result", m.result || "*"], ["WhiteElo", m.whiteElo], ["BlackElo", m.blackElo],
    ["TimeControl", m.timeControl], ["Opening", m.opening],
  ];
  const headers = keys.map(([k, v]) => `[${k} "${v || ""}"]`).join("\n");
  return `${headers}\n\n${movesText.trim() || "*"}`;
}
function movetextOf(pgn: string): string {
  return pgn.replace(/^(?:\[[^\]]+\][\r\n]*)+/i, "").trim();
}

// ─── Component ───────────────────────────────────────────────────────────────────
export function AddGameClient({
  isAuthed,
  initialTournaments,
}: {
  isAuthed: boolean;
  initialTournaments: TournamentMeta[];
}) {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>(initialTournaments);
  const [selectedId, setSelectedId] = useState<string | null>(initialTournaments[0]?.id ?? null);

  const [games, setGames] = useState<GameData[]>([]);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [selectedGameIndex, setSelectedGameIndex] = useState(-1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<GameForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof GameForm, string>>>({});
  const [manualEdit, setManualEdit] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [gameBeingEditedId, setGameBeingEditedId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewPgn, setPreviewPgn] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [parsedGames, setParsedGames] = useState<{ title: string; pgn: string }[]>([]);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [batchUploadErrors, setBatchUploadErrors] = useState<string[]>([]);

  // Tournament modals
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [tName, setTName] = useState("");
  const [tAlias, setTAlias] = useState("");
  const [tBusy, setTBusy] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  const isBatch = parsedGames.length > 1;
  const selectedTournament = useMemo(() => tournaments.find((t) => t.id === selectedId) ?? null, [tournaments, selectedId]);
  const tName_display = (t: TournamentMeta) => t.display_name || t.alias || t.name;

  // ── Load games for the selected tournament ──────────────────────────────────
  const loadGames = useCallback(async (id: string | null) => {
    if (!id) { setGames([]); setSelectedGameIndex(-1); return; }
    setIsLoadingGames(true); setGamesError(null);
    const { games: fetched, error } = await fetchGames(id);
    if (error) { setGamesError(error); setGames([]); setSelectedGameIndex(-1); }
    else { setGames(fetched); setSelectedGameIndex(fetched.length > 0 ? 0 : -1); }
    setIsLoadingGames(false);
  }, []);

  useEffect(() => { loadGames(selectedId); }, [selectedId, loadGames]);

  const refreshTournaments = useCallback(async (selectId?: string | null) => {
    const { tournaments: list } = await listTournaments();
    setTournaments(list);
    if (selectId !== undefined) setSelectedId(selectId);
    else if (list.length > 0 && !list.some((t) => t.id === selectedId)) setSelectedId(list[0].id);
  }, [selectedId]);

  // ── Live preview + auto-fill from typed PGN ─────────────────────────────────
  useEffect(() => {
    if (isBatch) return;
    const pgn = form.pgnText;
    if (!pgn.trim() || !validatePgn(pgn).valid) { setPreviewPgn(""); return; }
    setPreviewPgn(pgn);
    if (!manualEdit && !isEditingGame) {
      const h = parsePgnHeaders(pgn);
      setForm((prev) => ({
        ...prev,
        title: prev.title || generateTitleFromPgn(h),
        event: prev.event || h.Event || (selectedTournament ? tName_display(selectedTournament) : ""),
        date: h.Date || h.UTCDate || prev.date,
        white: h.White || prev.white,
        black: h.Black || prev.black,
        result: h.Result || prev.result,
        whiteElo: h.WhiteElo || prev.whiteElo,
        blackElo: h.BlackElo || prev.blackElo,
        timeControl: h.TimeControl || prev.timeControl,
        opening: h.Opening || prev.opening,
      }));
    }
  }, [form.pgnText, manualEdit, isEditingGame, isBatch, selectedTournament]);

  // ── Field changes ───────────────────────────────────────────────────────────
  const onChange = useCallback((field: keyof GameForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field !== "pgnText" && field !== "title") setManualEdit(true);
    if (field === "pgnText") { setSelectedFileName(null); setParsedGames([]); }
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parts = splitMultiGamePgn(content);
      const parsed = parts.map((pgn) => ({ title: generateTitleFromPgn(parsePgnHeaders(pgn)), pgn }));
      setParsedGames(parsed);
      const first = parts[0] || "";
      const h = parsePgnHeaders(first);
      setManualEdit(false);
      setForm({
        title: parsed[0]?.title || "", pgnText: first,
        event: selectedTournament ? tName_display(selectedTournament) : (h.Event || ""),
        date: h.Date || h.UTCDate || "", white: h.White || "", black: h.Black || "",
        result: h.Result || "", whiteElo: h.WhiteElo || "", blackElo: h.BlackElo || "",
        timeControl: h.TimeControl || "", opening: h.Opening || "",
      });
      if (validatePgn(first).valid) setPreviewPgn(first);
    };
    reader.readAsText(file);
  }, [selectedTournament]);

  // ── Reset / open form ───────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM); setErrors({}); setManualEdit(false);
    setIsEditingGame(false); setGameBeingEditedId(null);
    setSelectedFileName(null); setParsedGames([]); setPreviewPgn("");
    setBatchUploadErrors([]); setBatchUploadProgress(null);
  }, []);

  const openEditGame = useCallback((g: GameData, index: number) => {
    const h = parsePgnHeaders(g.pgn);
    setForm({
      title: g.title, pgnText: g.pgn,
      event: h.Event || "", date: h.Date || h.UTCDate || "", white: h.White || "", black: h.Black || "",
      result: h.Result || "", whiteElo: h.WhiteElo || "", blackElo: h.BlackElo || "",
      timeControl: h.TimeControl || "", opening: h.Opening || "",
    });
    setErrors({}); setManualEdit(true);
    setIsEditingGame(true); setGameBeingEditedId(g.id);
    setParsedGames([]); setSelectedFileName(null);
    setPreviewPgn(validatePgn(g.pgn).valid ? g.pgn : "");
    setSelectedGameIndex(index);
    setIsFormOpen(true);
    setFormMessage(null);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId) { setFormMessage({ text: "Select a tournament first.", error: true }); return; }
    setFormMessage(null); setBatchUploadErrors([]);

    // Batch upload
    if (isBatch) {
      setIsSubmitting(true); setIsBatchUploading(true);
      setBatchUploadProgress({ uploaded: 0, total: parsedGames.length });
      const valid: { title: string; pgn: string }[] = [];
      const errs: string[] = [];
      parsedGames.forEach((g, i) => {
        const v = validatePgn(g.pgn);
        if (v.valid) valid.push(g);
        else errs.push(`Game ${i + 1} (${g.title || "Untitled"}): ${v.error}`);
        setBatchUploadProgress({ uploaded: i + 1, total: parsedGames.length });
      });
      if (errs.length > 0) {
        setBatchUploadErrors(errs);
        setFormMessage({ text: `${errs.length} game(s) failed PGN validation.`, error: true });
        setIsSubmitting(false); setIsBatchUploading(false);
        return;
      }
      const res = await addMultipleGames(selectedId, valid);
      setIsSubmitting(false); setIsBatchUploading(false);
      if (!res.success) { setFormMessage({ text: res.error || "Batch upload failed.", error: true }); return; }
      setFormMessage({ text: `Uploaded ${res.count ?? valid.length} games.`, error: false });
      resetForm(); setIsFormOpen(false);
      await loadGames(selectedId);
      return;
    }

    // Single game — validate fields
    const fieldErrors = validateGameForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setFormMessage({ text: "Please fix the highlighted fields.", error: true });
      return;
    }

    const h = parsePgnHeaders(form.pgnText);
    const finalPgn = constructPgn(movetextOf(form.pgnText), {
      event: form.event || h.Event || "",
      date: form.date || h.Date || h.UTCDate || "",
      white: form.white || h.White || "",
      black: form.black || h.Black || "",
      result: form.result || h.Result || "",
      whiteElo: form.whiteElo || h.WhiteElo || "",
      blackElo: form.blackElo || h.BlackElo || "",
      timeControl: form.timeControl || h.TimeControl || "",
      opening: form.opening || h.Opening || "",
    });
    const v = validatePgn(finalPgn);
    if (!v.valid) { setFormMessage({ text: `Invalid PGN: ${v.error}`, error: true }); return; }

    const finalTitle = form.title.trim() || generateTitleFromPgn(parsePgnHeaders(finalPgn));

    setIsSubmitting(true);
    const res = isEditingGame && gameBeingEditedId
      ? await editGame(gameBeingEditedId, finalTitle, finalPgn)
      : await addGame(selectedId, finalTitle, finalPgn);
    setIsSubmitting(false);

    if (!res.success) { setFormMessage({ text: res.error || "Save failed.", error: true }); return; }
    setFormMessage({ text: isEditingGame ? "Game updated." : "Game added.", error: false });
    resetForm(); setIsFormOpen(false);
    await loadGames(selectedId);
  }, [selectedId, isBatch, parsedGames, form, isEditingGame, gameBeingEditedId, resetForm, loadGames]);

  const handleDeleteGame = useCallback(async (g: GameData) => {
    if (!window.confirm(`Delete game "${g.title || "Untitled"}"? This cannot be undone.`)) return;
    const res = await deleteGame(g.id);
    if (!res.success) { setFormMessage({ text: res.error || "Delete failed.", error: true }); return; }
    await loadGames(selectedId);
  }, [selectedId, loadGames]);

  // ── Tournament modals ───────────────────────────────────────────────────────
  const openCreate = () => { setModal("create"); setTName(""); setTAlias(""); setTError(null); };
  const openEdit = () => {
    if (!selectedTournament) return;
    setModal("edit"); setTName(tName_display(selectedTournament)); setTAlias(selectedTournament.alias || ""); setTError(null);
  };
  const openDelete = () => { if (selectedTournament) { setModal("delete"); setTError(null); } };

  const submitCreate = async () => {
    setTBusy(true); setTError(null);
    const res = await createTournament(tName, tAlias);
    setTBusy(false);
    if (!res.success || !res.id) { setTError(res.error || "Failed to create."); return; }
    setModal(null);
    await refreshTournaments(res.id);
  };
  const submitEdit = async () => {
    if (!selectedId) return;
    setTBusy(true); setTError(null);
    const res = await renameTournament(selectedId, tName, tAlias);
    setTBusy(false);
    if (!res.success) { setTError(res.error || "Failed to save."); return; }
    setModal(null);
    await refreshTournaments(selectedId);
  };
  const submitDelete = async () => {
    if (!selectedId) return;
    setTBusy(true); setTError(null);
    const res = await deleteTournament(selectedId);
    setTBusy(false);
    if (!res.success) { setTError(res.error || "Failed to delete."); return; }
    setModal(null);
    await refreshTournaments(null);
  };

  // ── Board: live preview when a valid PGN is staged, else the tournament's games ──
  const showingPreview = isFormOpen && !!previewPgn;
  const boardKey = showingPreview ? `preview:${previewPgn}` : `t:${selectedId}:${games.length}:${selectedGameIndex}`;

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Add Game to Database</h1>
          <p className="text-muted-foreground tracking-tight">
            Add games by pasting PGN or uploading a file, then preview them on the board.
          </p>
        </header>

        {!isAuthed && (
          <div className="flex items-center gap-3 p-4 rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <Lock className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">You must be logged in to add or edit games.</p>
              <p>You can browse existing games below. <Link href="/login" className="underline font-medium">Log in</Link> to make changes.</p>
            </div>
          </div>
        )}

        {/* Tournament selector + CRUD */}
        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Tournament</h3>
            {isAuthed && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
                </Button>
                <Button variant="outline" size="sm" onClick={openEdit} disabled={!selectedTournament} className="gap-1.5">
                  <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Rename</span>
                </Button>
                <Button variant="outline" size="sm" onClick={openDelete} disabled={!selectedTournament}
                  className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={tournaments.length === 0}>
              <Button variant="outline" className="w-full flex items-center justify-between bg-card rounded-md px-3 py-5">
                <span className="text-sm font-medium truncate">
                  {selectedTournament ? tName_display(selectedTournament) : "No tournaments yet"}
                </span>
                <ChevronDown className="ml-2 w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto rounded-md bg-card p-1 border border-border">
              {tournaments.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No tournaments yet</div>
              ) : tournaments.map((t, i) => (
                <DropdownMenuItem key={t.id} onSelect={() => setSelectedId(t.id)}
                  className={`cursor-pointer flex items-center gap-3 p-3 ${i % 2 === 0 ? "bg-accent/30" : ""}`}>
                  <span className="w-6 text-right shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">{i + 1}</span>
                  <span className="truncate font-medium">{tName_display(t)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Add game form (auth only) */}
        {isAuthed && (
          <div className="bg-card border border-border rounded-md p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5" /> {isEditingGame ? "Edit Game" : "Add Game"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { isFormOpen ? (resetForm(), setIsFormOpen(false)) : setIsFormOpen(true); }}>
                {isFormOpen ? "Close" : "Open"}
              </Button>
            </div>
            {isFormOpen && (
              <AddGameForm
                form={form} errors={errors} onChange={onChange} onFileChange={onFileChange} onSubmit={handleSubmit}
                selectedFileName={selectedFileName} isSubmitting={isSubmitting} isEditingGame={isEditingGame}
                isBatch={isBatch} batchCount={parsedGames.length}
                isBatchUploading={isBatchUploading} batchUploadProgress={batchUploadProgress}
                batchUploadErrors={batchUploadErrors} formMessage={formMessage}
              />
            )}
          </div>
        )}

        {/* Games list */}
        <div className="bg-card border border-border rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Games {games.length > 0 && <span className="text-foreground">({games.length})</span>}
            </h3>
            {gamesError && <span className="text-xs text-destructive" title={gamesError}>Error loading games</span>}
          </div>
          {isLoadingGames ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : games.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No games in this tournament yet.</p>
          ) : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {games.map((g, i) => {
                const h = parsePgnHeaders(g.pgn);
                return (
                  <li key={g.id} className={`flex items-center gap-3 p-2 ${i === selectedGameIndex ? "bg-accent/40" : ""}`}>
                    <button onClick={() => setSelectedGameIndex(i)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <span className="w-6 text-right shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">{i + 1}</span>
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{(h.White || "?")} vs {(h.Black || "?")}</span>
                        <span className="block text-xs text-muted-foreground truncate">{g.title || h.Event || ""}</span>
                      </div>
                    </button>
                    {isAuthed && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditGame(g, i)} title="Edit game"
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteGame(g)} title="Delete game"
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Board preview / replay */}
        {(showingPreview || games.length > 0) && (
          <BoardShell
            key={boardKey}
            initialPgn={showingPreview ? previewPgn : undefined}
            games={showingPreview ? undefined : games.map((g) => ({ title: g.title, pgn: g.pgn }))}
            initialIndex={showingPreview ? undefined : Math.max(0, selectedGameIndex)}
            hideFenBar={showingPreview}
          />
        )}
      </div>

      {/* ── Tournament modals ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !tBusy && setModal(null)} />
          <div className="relative z-[101] w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-5">
            {modal === "delete" ? (
              <>
                <h3 className="text-lg font-semibold mb-3 text-destructive">Delete Tournament</h3>
                <p className="text-sm mb-3">
                  Delete <span className="font-semibold">{selectedTournament && tName_display(selectedTournament)}</span> and
                  all {games.length} of its games? This cannot be undone.
                </p>
                {tError && <div className="text-sm p-2 rounded border border-destructive bg-destructive/10 text-destructive mb-3">{tError}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModal(null)} disabled={tBusy}>Cancel</Button>
                  <Button onClick={submitDelete} disabled={tBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
                    {tBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-3">{modal === "create" ? "Create Tournament" : "Rename Tournament"}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Display name</label>
                    <input type="text" value={tName} onChange={(e) => setTName(e.target.value)} autoFocus disabled={tBusy}
                      placeholder="e.g. LCA Open 2026" className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alias (optional)</label>
                    <input type="text" value={tAlias} onChange={(e) => setTAlias(e.target.value)} disabled={tBusy}
                      placeholder="Shown in lists" className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" />
                  </div>
                  {tError && <div className="text-sm p-2 rounded border border-destructive bg-destructive/10 text-destructive">{tError}</div>}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModal(null)} disabled={tBusy}>Cancel</Button>
                  <Button onClick={modal === "create" ? submitCreate : submitEdit} disabled={tBusy || !tName.trim()}>
                    {tBusy ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
                      : modal === "create" ? "Create" : "Save"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

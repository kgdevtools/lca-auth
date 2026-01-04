// src/app/add-game/page.tsx

"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move, Square } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import {
  ChevronDown, ChevronUp, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Upload,
  Plus, RefreshCcw, Undo2, FileSymlink, MousePointer, Loader2, Trash2, Pencil
} from "lucide-react"
import { fetchGames, addGameToDB, editGame, createTournament, listTournaments, deleteTournament, editTournament, addMultipleGamesToDB, type GameData, type TournamentMeta } from "./actions"
import { splitMultiGamePgn } from "./utils"
import type { TournamentId } from "./config"

// --- TYPE DEFINITIONS ---
type UiMove = Move & { moveNumber: number }
interface GameHistory { moves: UiMove[]; fenHistory: string[] }
type DynamicTournament = TournamentMeta

// --- CONSTANTS ---
const BOARD_CUSTOM_SQUARE_STYLES = {
  lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
  legalMove: { background: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)" },
  legalCapture: { background: "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" },
  selectedPiece: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
}

// --- HELPERS ---
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerRegex = /^\s*\[([^\s\]]+)\s+"([^"]*)"\]/gm;
  let match;
  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }
  return headers;
}
function generateTitleFromPgn(headers: Record<string, string>): string {
  const white = headers.White || "";
  0
  const black = headers.Black || "";
  const event = headers.Event;
  const date = headers.Date;
  if (!white && !black) return "";
  if (event && event !== "?" && event !== "rated blitz game") return `${event}: ${white} vs ${black}`;
  if (date && date !== "????.??.??") return `${white} vs ${black} (${date})`;
  return `${white} vs ${black}`;
}
function validatePgn(pgn: string): { valid: boolean; error?: string } {
  if (!pgn.trim()) return { valid: false, error: "PGN cannot be empty" };

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return { valid: true };
  } catch (e) {
    // If standard validation fails, try to fix common PGN issues and re-validate
    let fixedPgn = pgn;

    // Fix problematic characters in headers that chess.js can't handle
    // Handle TimeControl with prime symbols: [TimeControl "30'+30""] should become [TimeControl "30+30"]
    fixedPgn = fixedPgn.replace(/\[TimeControl\s+"([^"]*'[^"]*)""\]/g, (match, fullValue) => {
      // Replace prime symbols with regular + for time controls like "30'+30" -> "30+30"
      const fixedValue = fullValue.replace(/'/g, '+');
      return `[TimeControl "${fixedValue}"]`;
    });

    try {
      const chess = new Chess();
      chess.loadPgn(fixedPgn);
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid PGN format" };
    }
  }
}
function constructLichessStylePgn(movesText: string, metadata: Record<string, string>): string {
  const orderedKeys = ['Event', 'Site', 'Date', 'White', 'Black', 'Result', 'GameId', 'UTCDate', 'UTCTime', 'WhiteElo', 'BlackElo', 'WhiteRatingDiff', 'BlackRatingDiff', 'Variant', 'TimeControl', 'ECO', 'Opening', 'Termination'];
  const headerValues: Record<string, string> = {
    Event: metadata.event || "",
    Site: "",
    Date: metadata.date || "",
    White: metadata.white || "",
    Black: metadata.black || "",
    Result: metadata.result || "",
    GameId: "",
    UTCDate: "",
    UTCTime: "",
    WhiteElo: metadata.whiteElo || "",
    BlackElo: metadata.blackElo || "",
    AppendRatingDiff: "",
    ListPrice: "",
    Variant: "",
    TimeControl: metadata.timeControl || "",
    ECO: "",
    Opening: metadata.opening || "",
    Termination: "",
  };
  let headerString = '';
  for (const key of orderedKeys) {
    const value = headerValues[key] ?? '';
    headerString += `[${key} "${value}"]\r\n`;
  }
  const moves = movesText.trim() || '*';
  return `${headerString}\r\n${moves}`;
}
function normalizeTournamentId(input: string): string {
  let id = (input || '').toLowerCase().trim();
  id = id.replace(/[^a-z0-9]+/g, '_');
  id = id.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!id.endsWith('_games')) id = `${id}_games`;
  if (id.length > 63) id = id.slice(0, 63);
  return id;
}

/**
 * Helper function to convert table name to display name
 * e.g., "cdc_tournament_3_2025_games" -> "CDC Tournament 3 2025"
 */
function tableNameToDisplayName(tableName: string): string {
  if (!tableName) return '';

  // Remove '_games' suffix
  let displayName = tableName.replace(/_games$/, '');

  // Replace underscores with spaces
  displayName = displayName.replace(/_/g, ' ');

  // Capitalize each word
  displayName = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return displayName;
}
function useGameForm() {
  const [formState, setFormState] = useState({
    title: "",
    pgnText: "",
    event: "",
    date: "",
    white: "",
    black: "",
    result: "",
    whiteElo: "",
    blackElo: "",
    timeControl: "",
    opening: "",
  });
  const updateField = useCallback((field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);
  return { formState, updateField, setFormState };
}

// --- MAIN PAGE COMPONENT ---
export default function GameViewerPage() {
  // --- STATE MANAGEMENT ---
  const [dynamicTournaments, setDynamicTournaments] = useState<DynamicTournament[]>([]);
  // IMPORTANT: This holds the actual table name (tournaments_meta.name)
  const [selectedTableName, setSelectedTableName] = useState<TournamentId | null>(null);
  const [mode, setMode] = useState<'view' | 'interactive'>('view');
  
  const [games, setGames] = useState<GameData[]>([]);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(-1);
  const [viewerHistory, setViewerHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [viewerGameHeaders, setViewerGameHeaders] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const interactiveGame = useRef(new Chess());
  const [interactiveFen, setInteractiveFen] = useState('start');
  const [interactiveHistory, setInteractiveHistory] = useState<GameHistory>({ moves: [], fenHistory: [] });
  const [moveFrom, setMoveFrom] = useState<Square | ''>('');
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [gameBeingEdited, setGameBeingEdited] = useState<string | null>(null);
  const { formState, updateField, setFormState } = useGameForm();
  const { title, pgnText, event, date, white, black, result, whiteElo, blackElo, timeControl, opening } = formState;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasManuallyEditedTitle, setHasManuallyEditedTitle] = useState(false);
  const [hasManuallyEditedFields, setHasManuallyEditedFields] = useState(false);
  
  const [previewMode, setPreviewMode] = useState(false);
  const [previewPgn, setPreviewPgn] = useState("");
  const [multiGamePgn, setMultiGamePgn] = useState<string | null>(null);
  const [parsedGames, setParsedGames] = useState<Omit<GameData, 'id' | 'created_at'>[]>([]);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [batchUploadErrors, setBatchUploadErrors] = useState<string[]>([]);

  // Add Tournament modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentAlias, setNewTournamentAlias] = useState('');
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [createTournamentError, setCreateTournamentError] = useState<string | null>(null);
  const newIdPreview = useMemo(() => normalizeTournamentId(newTournamentName), [newTournamentName]);
  const idConflicts = useMemo(
    () => dynamicTournaments.some(t => t.name === newIdPreview),
    [dynamicTournaments, newIdPreview]
  );
  const isNameValid = useMemo(
    () => !!newTournamentName.trim() && /^[a-z0-9_]+$/.test(newIdPreview.replace(/_games$/, '')) && !idConflicts,
    [newTournamentName, newIdPreview, idConflicts]
  );

  // Edit Tournament modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tournamentToEdit, setTournamentToEdit] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState('');
  const [editTournamentAlias, setEditTournamentAlias] = useState('');
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editTournamentError, setEditTournamentError] = useState<string | null>(null);
  const editIdPreview = useMemo(() => tournamentToEdit && editTournamentName ? normalizeTournamentId(editTournamentName) : '', [editTournamentName, tournamentToEdit]);

  // Delete Tournament modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [deleteTournamentError, setDeleteTournamentError] = useState<string | null>(null);

  const isInteractive = useMemo(() => mode === 'interactive', [mode]);
  const currentPgn = useMemo(() => { if (previewMode && previewPgn) return previewPgn; if (currentGameIndex < 0) return ""; return games[currentGameIndex]?.pgn || ""; }, [games, currentGameIndex, previewMode, previewPgn]);
  const currentFen = useMemo(() => isInteractive ? interactiveFen : (viewerHistory.fenHistory[currentMoveIndex + 1] || "start"), [isInteractive, interactiveFen, currentMoveIndex, viewerHistory]);
  const currentHistory = useMemo(() => isInteractive ? interactiveHistory : viewerHistory, [isInteractive, interactiveHistory, viewerHistory]);
  const lastMove = useMemo(() => { if (currentMoveIndex < 0 || isInteractive) return undefined; const move = viewerHistory.moves[currentMoveIndex]; return move ? { from: move.from, to: move.to } : undefined; }, [currentMoveIndex, viewerHistory.moves, isInteractive]);
  const customSquareStyles = useMemo(() => { const styles = { ...optionSquares }; if (lastMove) { styles[lastMove.from] = BOARD_CUSTOM_SQUARE_STYLES.lastMove; styles[lastMove.to] = BOARD_CUSTOM_SQUARE_STYLES.lastMove; } return styles; }, [optionSquares, lastMove]);

  // Load tournaments
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { tournaments, error } = await listTournaments();
      if (!mounted) return;
      if (error) {
        console.error('Failed to load tournaments:', error);
      }
      setDynamicTournaments(tournaments);
      // Auto-select first tournament by its table name
      if (tournaments.length > 0) {
        setSelectedTableName(tournaments[0].name as TournamentId);
      } else {
        setSelectedTableName(null);
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load games for the selected table (tournaments_meta.name)
  useEffect(() => {
    async function loadGamesForTournament() {
      if (!selectedTableName) {
        setGames([]); setCurrentGameIndex(-1); setIsLoading(false); return;
      }
      setIsLoading(true); setGames([]); setCurrentGameIndex(-1); setGamesError(null);
      const { games: fetchedGames, error } = await fetchGames(selectedTableName as TournamentId);
      if (error) {
        console.error(`Error fetching games for ${selectedTableName}:`, error);
        setGamesError(error);
      } else {
        setGames(fetchedGames);
        if (fetchedGames.length > 0) setCurrentGameIndex(0);
      }
      setIsLoading(false);
    }
    loadGamesForTournament();
  }, [selectedTableName]);

  // Parse current PGN for viewer
  useEffect(() => {
    if (!currentPgn || isInteractive) { setViewerHistory({ moves: [], fenHistory: [] }); setViewerGameHeaders({}); setCurrentMoveIndex(-1); return; }
    try {
      // If this is a multi-game PGN (contains multiple [Event tags), only parse the first game
      let singleGamePgn = currentPgn;
      // Use a more robust regex to detect multiple [Event tags at the start of lines
      const eventMatches = currentPgn.match(/^ *\[Event /gm);
      if (eventMatches && eventMatches.length > 1) {
        // Split by the pattern and take only the first game
        const games = splitMultiGamePgn(currentPgn);
        if (games.length > 0) {
          singleGamePgn = games[0];
        }
      }

      // Apply the same fix for TimeControl headers when loading for display
      let displayPgn = singleGamePgn;
      displayPgn = displayPgn.replace(/\[TimeControl\s+"([^"]*'[^"]*)""\]/g, (match, fullValue) => {
        const fixedValue = fullValue.replace(/'/g, '+');
        return `[TimeControl "${fixedValue}"]`;
      });

      const chess = new Chess(); chess.loadPgn(displayPgn);
      const headers = chess.header() as Record<string, string>; setViewerGameHeaders(headers);
      const history = chess.history({ verbose: true });
      const tempChess = new Chess(); const fenHistory: string[] = [tempChess.fen()];
      history.forEach((move) => { try { tempChess.move(move.san); fenHistory.push(tempChess.fen()) } catch {} });
      const movesWithNumbers: UiMove[] = history.map((move, index) => ({ ...(move as any), moveNumber: Math.floor(index / 2) + 1 }));
      setViewerHistory({ moves: movesWithNumbers, fenHistory }); setCurrentMoveIndex(-1);
    } catch (error) { console.error("Failed to load PGN:", error); setViewerHistory({ moves: [], fenHistory: [] }); setViewerGameHeaders({}); }
  }, [currentPgn, isInteractive]);

  // Auto-populate Event Name when tournament changes
  useEffect(() => {
    if (selectedTableName && !hasManuallyEditedFields) {
      const displayName = tableNameToDisplayName(selectedTableName);
      updateField('event', displayName);
    }
  }, [selectedTableName, hasManuallyEditedFields, updateField]);

  // Live preview of PGN typed in form
  useEffect(() => {
    if (!pgnText.trim() || isInteractive) { setPreviewMode(false); setPreviewPgn(""); return; }
    const validation = validatePgn(pgnText); if (!validation.valid) { setPreviewMode(false); setPreviewPgn(""); return; }
    try {
      const headers = parsePgnHeaders(pgnText);
      // Only auto-update title if not manually edited and not in edit mode
      if (!hasManuallyEditedTitle && !isEditingGame) updateField('title', generateTitleFromPgn(headers));
      // Only auto-fill fields if not manually edited and not in edit mode
      if (!hasManuallyEditedFields && !isEditingGame) {
        const autoEventName = selectedTableName ? tableNameToDisplayName(selectedTableName) : (headers.Event || "");
        setFormState(prev => ({ ...prev, event: autoEventName, date: headers.Date || headers.UTCDate || "", white: headers.White || "", black: headers.Black || "", result: headers.Result || "", whiteElo: headers.WhiteElo || "", blackElo: headers.BlackElo || "", timeControl: headers.TimeControl || "", opening: headers.Opening || "" }));
      }
      setPreviewMode(true); setPreviewPgn(pgnText); setShowValidation(true);
    } catch (error) { console.error("Failed to parse PGN:", error); setPreviewMode(false); setPreviewPgn(""); }
  }, [pgnText, hasManuallyEditedTitle, hasManuallyEditedFields, updateField, setFormState, isInteractive, selectedTableName, isEditingGame]);

  // --- INTERACTIVE MODE HANDLERS ---
  const updateInteractiveGameState = useCallback(() => {
    setInteractiveFen(interactiveGame.current.fen());
    const moves = interactiveGame.current.history({ verbose: true });
    const movesWithNumbers: UiMove[] = moves.map((m, i) => ({ ...(m as any), moveNumber: Math.floor(i / 2) + 1 }));
    const tempChess = new Chess();
    const fenHistory = [tempChess.fen()];
    moves.forEach(m => { tempChess.move(m.san); fenHistory.push(tempChess.fen()) });
    setInteractiveHistory({ moves: movesWithNumbers, fenHistory });
  }, []);
  const makeMove = useCallback((move: { from: Square; to: Square; promotion?: string }) => {
    try { const result = interactiveGame.current.move(move); if (result === null) return false; updateInteractiveGameState(); setMoveFrom(''); setOptionSquares({}); return true; } catch { return false; }
  }, [updateInteractiveGameState]);
  const onPieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
  }, [makeMove]);
  const showLegalMoves = useCallback((square: Square) => {
    const moves = interactiveGame.current.moves({ square, verbose: true });
    if (moves.length === 0) return;
    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach(move => {
      const isCapture = interactiveGame.current.get(move.to) && interactiveGame.current.get(move.to)?.color !== interactiveGame.current.get(square)?.color;
      newSquares[move.to] = isCapture ? BOARD_CUSTOM_SQUARE_STYLES.legalCapture : BOARD_CUSTOM_SQUARE_STYLES.legalMove;
    });
    newSquares[square] = BOARD_CUSTOM_SQUARE_STYLES.selectedPiece;
    setOptionSquares(newSquares);
  }, []);
  const onSquareClick = useCallback((square: Square) => {
    if (!moveFrom) {
      const piece = interactiveGame.current.get(square);
      if (piece && piece.color === interactiveGame.current.turn()) {
        showLegalMoves(square);
        setMoveFrom(square);
      }
      return;
    }
    if (!makeMove({ from: moveFrom, to: square, promotion: 'q' })) {
      setMoveFrom('');
      setOptionSquares({});
    }
  }, [moveFrom, makeMove, showLegalMoves]);
  const onPieceDragBegin = useCallback((_piece: string, sourceSquare: Square) => { showLegalMoves(sourceSquare); }, [showLegalMoves]);
  const onPieceDragEnd = useCallback(() => setOptionSquares({}), []);
  const handleUndo = useCallback(() => { interactiveGame.current.undo(); updateInteractiveGameState(); }, [updateInteractiveGameState]);
  const handleReset = useCallback(() => { interactiveGame.current.reset(); updateInteractiveGameState(); }, [updateInteractiveGameState]);
  const loadInteractivePgnToForm = useCallback(() => { updateField('pgnText', interactiveGame.current.pgn()); setMode('view'); setIsFormOpen(true); }, [updateField]);
  const navigateToInteractiveMove = useCallback((index: number) => {
    const moves = interactiveGame.current.history();
    interactiveGame.current.reset();
    for (let i = 0; i <= index; i++) { if (moves[i]) interactiveGame.current.move(moves[i]); }
    updateInteractiveGameState();
  }, [updateInteractiveGameState]);

  // --- HANDLERS ---
  const handleTournamentSelect = (tableName: TournamentId) => {
    if (tableName !== selectedTableName) {
      setSelectedTableName(tableName);
    }
  };
  const handleGameSelect = useCallback((index: number) => { setCurrentGameIndex(index); setPreviewMode(false); setPreviewPgn(""); }, []);

  const handleEditGame = useCallback((index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const game = games[index];
    if (!game) return;

    // Parse PGN to extract headers
    const headers = parsePgnHeaders(game.pgn);

    // Pre-fill the form with game data
    setFormState({
      title: game.title,
      pgnText: game.pgn,
      event: headers.Event || '',
      date: headers.Date || headers.UTCDate || '',
      white: headers.White || '',
      black: headers.Black || '',
      result: headers.Result || '',
      whiteElo: headers.WhiteElo || '',
      blackElo: headers.BlackElo || '',
      timeControl: headers.TimeControl || '',
      opening: headers.Opening || '',
    });

    // Set editing mode
    setIsEditingGame(true);
    setGameBeingEdited(game.id);
    setIsFormOpen(true);
    setHasManuallyEditedTitle(true); // Prevent auto-override
    setHasManuallyEditedFields(true); // Prevent auto-override
    setCurrentGameIndex(index);
  }, [games, setFormState]);
  const navigateToViewerMove = useCallback((index: number) => { setCurrentMoveIndex(Math.max(-1, Math.min(index, viewerHistory.moves.length - 1))) }, [viewerHistory.moves.length]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const pgnContent = event.target?.result as string;
        setMultiGamePgn(pgnContent);
        const games = splitMultiGamePgn(pgnContent);
        const parsedGameData = games.map(pgn => {
          const headers = parsePgnHeaders(pgn);
          const title = generateTitleFromPgn(headers);
          return { title, pgn };
        });
        setParsedGames(parsedGameData as Omit<GameData, 'id' | 'created_at'>[]);
        // For single game display in form, use the first game or clear if no games
        updateField('pgnText', games[0] || '');
        if (parsedGameData.length > 0) {
          updateField('title', parsedGameData[0].title);
          const headers = parsePgnHeaders(parsedGameData[0].pgn);
          setFormState(prev => ({
            ...prev,
            event: selectedTableName ? tableNameToDisplayName(selectedTableName) : (headers.Event || ""),
            date: headers.Date || headers.UTCDate || "",
            white: headers.White || "",
            black: headers.Black || "",
            result: headers.Result || "",
            whiteElo: headers.WhiteElo || "",
            blackElo: headers.BlackElo || "",
            timeControl: headers.TimeControl || "",
            opening: headers.Opening || ""
          }));
          setPreviewMode(true);
          setPreviewPgn(parsedGameData[0].pgn);
        }
      };
      reader.readAsText(file);
    }
  }, [updateField, setFormState, selectedTableName]);
  const handlePgnTextChange = useCallback((value: string) => { updateField('pgnText', value); setSelectedFile(null); }, [updateField]);
  const handleTitleChange = useCallback((value: string) => { updateField('title', value); setTitleTouched(true); setHasManuallyEditedTitle(true); if (showValidation && value.trim()) setShowValidation(false); }, [showValidation, updateField]);
  const handleTitleBlur = useCallback(() => { setTitleTouched(true); if (!title.trim() && pgnText.trim()) setShowValidation(true); }, [title, pgnText]);
  const handleFieldChange = useCallback((field: string, value: string) => { updateField(field, value); setHasManuallyEditedFields(true); }, [updateField]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!title.trim() && !multiGamePgn) { setFormMessage({ text: "Please enter a title for the game.", error: true }); return; }
    if (!pgnText.trim() && !multiGamePgn) { setFormMessage({ text: "Please provide PGN data.", error: true }); return; }

    setIsSubmitting(true);
    setFormMessage(null);
    setBatchUploadErrors([]);
    setBatchUploadProgress(null);

    let apiResult;

    if (multiGamePgn && parsedGames.length > 0) {
      if (!selectedTableName) {
        setFormMessage({ text: "Please select a tournament to upload batch games.", error: true });
        setIsSubmitting(false);
        return;
      }
      setIsBatchUploading(true);
      setBatchUploadProgress({ uploaded: 0, total: parsedGames.length });

      // Validate all games before attempting to upload
      const errors: string[] = [];
      const validGames = [];

      for (let i = 0; i < parsedGames.length; i++) {
        let game = parsedGames[i];

        // Apply the same PGN fixes that are used elsewhere in the code
        let fixedPgn = game.pgn;
        // Handle TimeControl with prime symbols: [TimeControl "30'+30""] should become [TimeControl "30+30"]
        fixedPgn = fixedPgn.replace(/\[TimeControl\s+"([^"]*'[^"]*)""\]/g, (match, fullValue) => {
          // Replace prime symbols with regular + for time controls like "30'+30" -> "30+30"
          const fixedValue = fullValue.replace(/'/g, '+');
          return `[TimeControl "${fixedValue}"]`;
        });

        // Update the game with the fixed PGN
        game = { ...game, pgn: fixedPgn };

        const validation = validatePgn(game.pgn);
        if (!validation.valid) {
          errors.push(`Game ${i + 1} (Title: ${game.title || 'N/A'}): Invalid PGN format - ${validation.error}`);
          setBatchUploadProgress(prev => prev ? { ...prev, uploaded: prev.uploaded + 1 } : null);
          continue;
        }
        validGames.push(game);
        setBatchUploadProgress(prev => prev ? { ...prev, uploaded: prev.uploaded + 1 } : null);
      }

      if (errors.length > 0) {
        setBatchUploadErrors(errors);
        setFormMessage({ text: `Batch upload failed with ${errors.length} PGN validation error(s).`, error: true });
        setIsSubmitting(false);
        setIsBatchUploading(false);
        return;
      }

      // Use the efficient batch upload function
      const batchResult = await addMultipleGamesToDB(selectedTableName as TournamentId, validGames);

      setIsBatchUploading(false);

      if (batchResult.error) {
        setFormMessage({ text: `Batch upload failed: ${batchResult.error}`, error: true });
        apiResult = { success: false, error: batchResult.error };
      } else {
        setFormMessage({ text: `Successfully uploaded ${validGames.length} games!`, error: false });
        apiResult = { success: true, error: null };
      }

    } else if (isEditingGame && gameBeingEdited && selectedTableName) {
      // Existing single game edit logic
      const parsedHeaders = parsePgnHeaders(pgnText);
      const movesOnly = pgnText.replace(/^(?:\[[^\]]+\][\r\n]*)+/i, '').trim();
      const mergedMetadata = {
        event: (event && event.trim()) || parsedHeaders.Event || '',
        date: (date && date.trim()) || parsedHeaders.Date || parsedHeaders.UTCDate || '',
        white: (white && white.trim()) || parsedHeaders.White || '',
        black: (black && black.trim()) || parsedHeaders.Black || '',
        result: (result && result.trim()) || parsedHeaders.Result || '',
        whiteElo: (whiteElo && whiteElo.trim()) || parsedHeaders.WhiteElo || '',
        blackElo: (blackElo && blackElo.trim()) || parsedHeaders.BlackElo || '',
        timeControl: (timeControl && timeControl.trim()) || parsedHeaders.TimeControl || '',
        opening: (opening && opening.trim()) || parsedHeaders.Opening || ''
      };
      const finalPgn = constructLichessStylePgn(movesOnly, mergedMetadata);
      const validation = validatePgn(finalPgn);
      if (!validation.valid) { setFormMessage({ text: `Invalid PGN: ${validation.error}`, error: true }); setIsSubmitting(false); return; }

      apiResult = await editGame(gameBeingEdited, selectedTableName as TournamentId, title, finalPgn);
      setFormMessage({ text: apiResult.success ? 'Game updated successfully!' : (apiResult.error || 'Failed to update game'), error: !apiResult.success });
      setIsSubmitting(false);

    } else {
      // Existing single game add logic
      const parsedHeaders = parsePgnHeaders(pgnText);
      const movesOnly = pgnText.replace(/^(?:\[[^\]]+\][\r\n]*)+/i, '').trim();
      const mergedMetadata = {
        event: (event && event.trim()) || parsedHeaders.Event || '',
        date: (date && date.trim()) || parsedHeaders.Date || parsedHeaders.UTCDate || '',
        white: (white && white.trim()) || parsedHeaders.White || '',
        black: (black && black.trim()) || parsedHeaders.Black || '',
        result: (result && result.trim()) || parsedHeaders.Result || '',
        whiteElo: (whiteElo && whiteElo.trim()) || parsedHeaders.WhiteElo || '',
        blackElo: (blackElo && blackElo.trim()) || parsedHeaders.BlackElo || '',
        timeControl: (timeControl && timeControl.trim()) || parsedHeaders.TimeControl || '',
        opening: (opening && opening.trim()) || parsedHeaders.Opening || ''
      };
      const finalPgn = constructLichessStylePgn(movesOnly, mergedMetadata);
      const validation = validatePgn(finalPgn);
      if (!validation.valid) { setFormMessage({ text: `Invalid PGN: ${validation.error}`, error: true }); setIsSubmitting(false); return; }

      const formData = new FormData(e.currentTarget);
      formData.append('pgn', finalPgn);
      formData.append('tableName', (selectedTableName || '') as TournamentId);
      const addResult = await addGameToDB({ message: '', error: false }, formData);
      apiResult = { success: !addResult.error, error: addResult.error ? addResult.message : null };
      setFormMessage({ text: addResult.message, error: addResult.error });
      setIsSubmitting(false);
    }

    if (apiResult.success) {
      // Reset form
      setFormState({ title: '', pgnText: '', event: '', date: '', white: '', black: '', result: '', whiteElo: '', blackElo: '', timeControl: '', opening: '' });
      setSelectedFile(null); setTitleTouched(false); setShowValidation(false); setHasManuallyEditedTitle(false); setHasManuallyEditedFields(false);
      setPreviewMode(false); setPreviewPgn(''); setIsFormOpen(false);
      setIsEditingGame(false); setGameBeingEdited(null); setMultiGamePgn(null); setParsedGames([]);
      // Refresh games list
      if (selectedTableName) {
        const { games: refreshedGames } = await fetchGames(selectedTableName as TournamentId);
        setGames(refreshedGames); setCurrentGameIndex(refreshedGames.length > 0 ? 0 : -1);
      }
    }
  };

  // Create tournament
  const openAddTournament = () => {
    setNewTournamentName('');
    setNewTournamentAlias('');
    setCreateTournamentError(null);
    setIsAddModalOpen(true);
  };

  const submitNewTournament = async () => {
    if (!isNameValid) return;
    setIsCreatingTournament(true);
    setCreateTournamentError(null);

    const res = await createTournament(newTournamentName, newTournamentAlias || tableNameToDisplayName(newTournamentName));
    setIsCreatingTournament(false);

    if (!res.success) {
      setCreateTournamentError(res.error || 'Failed to create tournament.');
      return;
    }

    // res.id is the new table name (safe_id). Insert optimistically.
    const createdTableName = (res.id || newIdPreview) as string;
    const createdDisplay = newTournamentAlias || tableNameToDisplayName(createdTableName); // Use alias if provided

    setDynamicTournaments(prev => [{ id: createdTableName, name: createdTableName, alias: newTournamentAlias || tableNameToDisplayName(newTournamentName) }, ...prev]);
    setSelectedTableName(createdTableName as TournamentId);
    setIsAddModalOpen(false);
  };

  // Edit tournament handlers
  const openEditTournament = (tableName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTournamentToEdit(tableName);

    // Find the tournament object to get the alias
    const tournament = dynamicTournaments.find(t => t.name === tableName);
    setEditTournamentName(tableNameToDisplayName(tableName));
    setEditTournamentAlias(tournament?.alias || tableNameToDisplayName(tableName));
    setEditTournamentError(null);
    setIsEditModalOpen(true);
  };

  const submitEditTournament = async () => {
    if (!tournamentToEdit || !editTournamentName.trim()) return;

    setIsEditingTournament(true);
    setEditTournamentError(null);

    const res = await editTournament(tournamentToEdit, editTournamentName, editTournamentAlias);
    setIsEditingTournament(false);

    if (!res.success) {
      setEditTournamentError(res.error || 'Failed to edit tournament.');
      return;
    }

    // Update tournament in list
    const newTableName = res.newTableName || tournamentToEdit;
    setDynamicTournaments(prev =>
      prev.map(t => t.name === tournamentToEdit ? { ...t, name: newTableName, alias: editTournamentAlias } : t)
    );

    // If the edited tournament was selected, update the selection
    if (selectedTableName === tournamentToEdit) {
      setSelectedTableName(newTableName as TournamentId);
    }

    setIsEditModalOpen(false);
    setTournamentToEdit(null);
    setEditTournamentName('');
    setEditTournamentAlias('');
  };

  // Delete tournament handlers
  const openDeleteTournament = (tableName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTournamentToDelete(tableName);
    setDeleteTournamentError(null);
    setIsDeleteModalOpen(true);
  };

  const submitDeleteTournament = async () => {
    if (!tournamentToDelete) return;

    setIsDeletingTournament(true);
    setDeleteTournamentError(null);

    const res = await deleteTournament(tournamentToDelete);
    setIsDeletingTournament(false);

    if (!res.success) {
      setDeleteTournamentError(res.error || 'Failed to delete tournament.');
      return;
    }

    // Remove tournament from list
    setDynamicTournaments(prev => prev.filter(t => t.name !== tournamentToDelete));

    // If the deleted tournament was selected, switch to another one
    if (selectedTableName === tournamentToDelete) {
      const remaining = dynamicTournaments.filter(t => t.name !== tournamentToDelete);
      setSelectedTableName(remaining.length > 0 ? remaining[0].name as TournamentId : null);
    }

    setIsDeleteModalOpen(false);
    setTournamentToDelete(null);
  };

  const selectedTournamentName = selectedTableName
    ? (dynamicTournaments.find(t => t.name === selectedTableName)?.alias || tableNameToDisplayName(selectedTableName))
    : 'Select Tournament';
  const selectedGameTitle = games[currentGameIndex]?.title || (games.length > 0 ? 'Select a game' : 'No games in tournament');
  const isTitleInvalid = showValidation && !title.trim();

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-3">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Add Game to Database</h1>
          <p className="text-muted-foreground tracking-tight">Add games by pasting PGN, uploading a file, or creating one on the interactive board.</p>
        </header>

        <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-2">
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full flex items-center justify-between p-4 transition-colors bg-accent text-accent-foreground hover:bg-accent/90 rounded-[2px]">
            <div className="flex items-center gap-2"><Plus className="w-5 h-5" /> <h2 className="text-lg font-semibold">Add Game Form</h2></div>
            {isFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button onClick={() => setMode(isInteractive ? 'view' : 'interactive')} className={`w-full flex items-center justify-between p-4 transition-colors rounded-[2px] ${isInteractive ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}>
            <div className="flex items-center gap-2"><MousePointer className="w-5 h-5" /> <h2 className="text-lg font-semibold">{isInteractive ? 'Exit Interactive' : 'Interactive Board'}</h2></div>
          </button>
        </div>
        
        {isFormOpen && (
          <div className="bg-card border border-border rounded-[2px] shadow-sm overflow-hidden p-4 sm:p-6 animate-fade-in">
            <AddGameForm
              title={title}
              pgnText={pgnText}
              selectedFile={selectedFile}
              isSubmitting={isSubmitting}
              formMessage={formMessage}
              isTitleInvalid={isTitleInvalid}
              isEditingGame={isEditingGame}
              event={event}
              date={date}
              white={white}
              black={black}
              result={result}
              whiteElo={whiteElo}
              blackElo={blackElo}
              timeControl={timeControl}
              opening={opening}
              onTitleChange={handleTitleChange}
              onTitleBlur={handleTitleBlur}
              onPgnTextChange={handlePgnTextChange}
              onFileChange={handleFileChange}
              onEventChange={(val: string) => handleFieldChange('event', val)}
              onDateChange={(val: string) => handleFieldChange('date', val)}
              onWhiteChange={(val: string) => handleFieldChange('white', val)}
              onBlackChange={(val: string) => handleFieldChange('black', val)}
              onResultChange={(val: string) => handleFieldChange('result', val)}
              onWhiteEloChange={(val: string) => handleFieldChange('whiteElo', val)}
              onBlackEloChange={(val: string) => handleFieldChange('blackElo', val)}
              onTimeControlChange={(val: string) => handleFieldChange('timeControl', val)}
              onOpeningChange={(val: string) => handleFieldChange('opening', val)}
              onSubmit={handleSubmit}
              isBatchUploading={isBatchUploading}
              batchUploadProgress={batchUploadProgress}
              batchUploadErrors={batchUploadErrors}
              parsedGames={parsedGames}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
            {!isInteractive && !isFormOpen && <GameInfo headers={viewerGameHeaders} previewMode={previewMode || isEditingGame} previewData={{ white, black, event, result }} />}
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Select Tournament</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openAddTournament}
                        className="gap-1.5 flex-shrink-0"
                        title="Create New Tournament"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Tournament</span>
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-between bg-card rounded-md px-3 py-5"
                          disabled={dynamicTournaments.length === 0}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">{selectedTournamentName}</span>
                            <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">
                              {selectedTableName || ''}
                            </span>
                          </div>
                          <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] rounded-md bg-card p-1 border border-border">
                        {dynamicTournaments.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No tournaments yet</div>
                        ) : dynamicTournaments.map((t, i) => (
                          <DropdownMenuItem
                            key={t.name}
                            onSelect={() => handleTournamentSelect(t.name as TournamentId)}
                            className={`cursor-pointer flex items-center justify-between gap-3 p-3 ${i % 2 === 0 ? 'bg-accent/30' : ''}`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-6 text-right flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="block truncate font-medium text-foreground">
                                  {t.alias || tableNameToDisplayName(t.name)}
                                </span>
                                <span className="block text-xs text-muted-foreground truncate mt-0.5 font-mono">
                                  {t.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => openEditTournament(t.name, e)}
                                className="flex-shrink-0 p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                title="Edit tournament"
                                aria-label={`Edit ${t.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => openDeleteTournament(t.name, e)}
                                className="flex-shrink-0 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete tournament"
                                aria-label={`Delete ${t.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">Current Games in Tournament</h3>
                      {gamesError && (
                        <span className="text-xs text-destructive" title={gamesError}>Error loading games</span>
                      )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isLoading || games.length === 0}>
                          <Button variant="outline" className="w-full flex items-center justify-between bg-card rounded-md px-3 py-5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm font-medium text-foreground truncate">
                                {isLoading ? 'Loading games...' : selectedGameTitle}
                              </span>
                              {currentGameIndex >= 0 && games[currentGameIndex] && (
                                <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">
                                  ID: {games[currentGameIndex]?.id.substring(0, 8)}...
                                </span>
                              )}
                            </div>
                            <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-md bg-card p-1 border border-border">
                            {games.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No games in tournament</div>
                            ) : games.map((g, i) => (
                              <DropdownMenuItem
                                key={g.id}
                                className={`flex items-center justify-between gap-3 p-3 ${i % 2 === 0 ? 'bg-accent/30' : ''}`}
                                onSelect={() => handleGameSelect(i)}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="w-6 text-right flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="block truncate font-medium text-foreground">
                                      {(() => {
                                        const headers = parsePgnHeaders(g.pgn);
                                        const white = headers.White || "Unknown";
                                        const black = headers.Black || "Unknown";
                                        return `${white} vs ${black}`;
                                      })()}
                                    </span>
                                    <span className="block text-xs text-muted-foreground truncate mt-0.5">
                                      {g.title}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleEditGame(i, e)}
                                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                  title="Edit game"
                                  aria-label={`Edit ${g.title}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>

        {/* Add Tournament Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative z-[101] w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-2xl p-5">
              <h3 className="text-lg font-semibold mb-3">Create New Tournament</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tournament Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-input border border-border rounded-[2px]"
                    placeholder="e.g., LCA Launch Open 2025 Juniors"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    disabled={isCreatingTournament}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tournament Alias</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-input border border-border rounded-[2px]"
                    placeholder="e.g., LCA Championship 2025"
                    value={newTournamentAlias}
                    onChange={(e) => setNewTournamentAlias(e.target.value)}
                    disabled={isCreatingTournament}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Table ID preview: <span className="font-mono text-foreground">{newIdPreview || '...'}</span>
                </div>
                {idConflicts && (
                  <div className="text-xs text-destructive">A tournament with this ID already exists.</div>
                )}
                {createTournamentError && (
                  <div className="text-sm p-2 rounded border border-destructive bg-destructive/10 text-destructive">
                    {createTournamentError}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isCreatingTournament}>
                  Cancel
                </Button>
                <Button onClick={submitNewTournament} disabled={!isNameValid || isCreatingTournament}>
                  {isCreatingTournament ? (<span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>) : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Tournament Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isEditingTournament && setIsEditModalOpen(false)} />
            <div className="relative z-[101] w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-2xl p-5">
              <h3 className="text-lg font-semibold mb-3">Edit Tournament</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tournament Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-input border border-border rounded-[2px]"
                    placeholder="e.g., CDC Tournament 8 2025"
                    value={editTournamentName}
                    onChange={(e) => setEditTournamentName(e.target.value)}
                    disabled={isEditingTournament}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tournament Alias</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-input border border-border rounded-[2px]"
                    placeholder="e.g., CDC Championship 2025"
                    value={editTournamentAlias}
                    onChange={(e) => setEditTournamentAlias(e.target.value)}
                    disabled={isEditingTournament}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Current: <span className="font-mono text-foreground">{tournamentToEdit || '...'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  New table ID: <span className="font-mono text-foreground">{editIdPreview || '...'}</span>
                </div>
                {editTournamentError && (
                  <div className="text-sm p-2 rounded border border-destructive bg-destructive/10 text-destructive">
                    {editTournamentError}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isEditingTournament}>
                  Cancel
                </Button>
                <Button onClick={submitEditTournament} disabled={!editTournamentName.trim() || isEditingTournament}>
                  {isEditingTournament ? (<span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>) : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Tournament Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeletingTournament && setIsDeleteModalOpen(false)} />
            <div className="relative z-[101] w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-2xl p-5">
              <h3 className="text-lg font-semibold mb-3 text-destructive">Delete Tournament</h3>
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete the tournament <span className="font-mono font-semibold">{tournamentToDelete}</span>?
                </p>
                <div className="text-sm p-3 rounded border border-destructive/50 bg-destructive/10 text-destructive">
                  <p className="font-semibold mb-1">⚠️ Warning: This action cannot be undone!</p>
                  <p>This will permanently delete:</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>The tournament table from the database</li>
                    <li>All games in this tournament</li>
                    <li>The tournament metadata</li>
                  </ul>
                </div>
                {deleteTournamentError && (
                  <div className="text-sm p-2 rounded border border-destructive bg-destructive/10 text-destructive">
                    {deleteTournamentError}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeletingTournament}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={submitDeleteTournament}
                  disabled={isDeletingTournament}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingTournament ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Tournament
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isInteractive && ( <div className="bg-card border-border p-4 rounded-lg shadow-md text-center mt-3"> <h2 className="text-lg font-semibold">Interactive Mode</h2> <p className="text-muted-foreground text-sm">Create a game on the board below. When finished, load it into the form.</p> </div> )}
        
        {isLoading && !isInteractive ? (<LoadingSpinner />) 
        : (games.length > 0 || previewMode || isInteractive) ? (
          <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 mt-3">
            <div>
              <Board
                fen={currentFen}
                isInteractive={isInteractive}
                customSquareStyles={customSquareStyles}
                onPieceDrop={onPieceDrop}
                onSquareClick={onSquareClick}
                onPieceDragBegin={onPieceDragBegin}
                onPieceDragEnd={onPieceDragEnd}
              />
               <div className="mt-3">
                {isInteractive ? (
                  <InteractiveControls
                    onUndo={handleUndo}
                    onReset={handleReset}
                    onLoadPgn={loadInteractivePgnToForm}
                    canUndo={interactiveHistory.moves.length > 0}
                  />
                ) : (
                  <Controls
                    onStart={() => navigateToViewerMove(-1)}
                    onPrev={() => navigateToViewerMove(currentMoveIndex - 1)}
                    onNext={() => navigateToViewerMove(currentMoveIndex + 1)}
                    onEnd={() => navigateToViewerMove(viewerHistory.moves.length - 1)}
                    canGoBack={currentMoveIndex > -1}
                    canGoForward={currentMoveIndex < viewerHistory.moves.length - 1}
                  />
                )}
              </div>
              {!isInteractive && viewerHistory.moves.length > 0 && ( <div className="mt-2 text-center text-sm text-muted-foreground">Move {currentMoveIndex + 1} of {viewerHistory.moves.length}</div> )}
            </div>
            <MovesList
              moves={currentHistory.moves}
              currentMoveIndex={isInteractive ? interactiveHistory.moves.length - 1 : currentMoveIndex}
              onMoveSelect={isInteractive ? navigateToInteractiveMove : navigateToViewerMove}
            />
          </main>
        ) : !isInteractive ? ( <div className="bg-card border border-border p-8 rounded-[2px] text-center shadow-sm mt-3"> <p className="text-muted-foreground">No games available for this tournament. Add a new game to get started.</p> </div> ) : null}
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS ---

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh] bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-muted-foreground">Loading...</div>
    </div>
  </div>
);

const AddGameForm = React.memo(({
  title, pgnText, selectedFile, isSubmitting, formMessage, isTitleInvalid, isEditingGame,
  event, date, white, black, result, whiteElo, blackElo, timeControl, opening,
  onTitleChange, onTitleBlur, onPgnTextChange, onFileChange, onEventChange, onDateChange,
  onWhiteChange, onBlackChange, onResultChange, onWhiteEloChange, onBlackEloChange, onTimeControlChange, onOpeningChange,
  onSubmit, isBatchUploading, batchUploadProgress, batchUploadErrors, parsedGames
}: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {parsedGames.length > 1 && (
        <div className="p-3 rounded-[2px] text-sm border bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200">
          <p className="font-medium">Batch Upload Detected:</p>
          <p>This PGN file contains {parsedGames.length} games. Only the first game is shown in the form fields. All {parsedGames.length} games will be uploaded as a batch to the selected tournament.</p>

          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
            <p className="font-medium mb-1">Preview of first {Math.min(5, parsedGames.length)} games:</p>
            <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 p-2 rounded border">
              {parsedGames.slice(0, 5).map((game: Omit<GameData, 'id' | 'created_at'>, index: number) => (
                <div key={index} className="text-xs py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <span className="font-medium">Game {index + 1}:</span> {game.title || 'Untitled Game'}
                </div>
              ))}
              {parsedGames.length > 5 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                  ... and {parsedGames.length - 5} more games
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Game Title {parsedGames.length <= 1 && <span className="text-destructive">*</span>}
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder="e.g., World Championship 2024 - Game 1"
          className={`w-full px-3 py-2 bg-input border rounded-[2px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all ${isTitleInvalid && parsedGames.length <= 1 ? "border-destructive focus:ring-destructive/20" : "border-border focus:ring-ring/20 focus:border-ring"}`}
          disabled={isSubmitting || parsedGames.length > 1}
        />
        {isTitleInvalid && parsedGames.length <= 1 && <p className="text-destructive text-xs mt-1">Title is required</p>}
        {parsedGames.length > 1 && <p className="text-muted-foreground text-xs mt-1">Title is auto-generated from PGN headers for batch uploads.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="White Player" value={white} onChange={(e) => onWhiteChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
        <input type="text" placeholder="Black Player" value={black} onChange={(e) => onBlackChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Date (YYYY.MM.DD)" value={date} onChange={(e) => onDateChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
        <input type="text" placeholder="Result (1-0, 0-1, 1/2-1/2)" value={result} onChange={(e) => onResultChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
      </div>

      <input type="text" placeholder="Event Name" value={event} onChange={(e) => onEventChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="White Elo" value={whiteElo} onChange={(e) => onWhiteEloChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
        <input type="text" placeholder="Black Elo" value={blackElo} onChange={(e) => onBlackEloChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Time Control" value={timeControl} onChange={(e) => onTimeControlChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
        <input type="text" placeholder="Opening" value={opening} onChange={(e) => onOpeningChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={isSubmitting || parsedGames.length > 1} />
      </div>

      <div>
        <label htmlFor="pgnText" className="block text-sm font-medium mb-2">
          PGN Data {parsedGames.length <= 1 && <span className="text-destructive">*</span>}
        </label>
        <textarea
          id="pgnText"
          name="pgnText"
          value={pgnText}
          onChange={(e) => onPgnTextChange(e.target.value)}
          placeholder={`[Event ""]\n[Site ""]\n...\n\n*`}
          rows={8}
          className="w-full px-3 py-2 bg-input border border-border rounded-[2px] font-mono text-sm resize-y"
          disabled={isSubmitting || parsedGames.length > 1}
        />
        {parsedGames.length > 1 && <p className="text-muted-foreground text-xs mt-1">Only the first game's PGN is displayed for batch uploads.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Or Upload PGN File</label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" onChange={onFileChange} className="hidden" accept=".pgn" disabled={isSubmitting} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="gap-2">
            <Upload className="w-4 h-4" /> Choose File
          </Button>
          {selectedFile && <span className="text-sm text-muted-foreground truncate">{selectedFile.name}</span>}
        </div>
      </div>

      {formMessage && !isBatchUploading && (
        <div className={`p-3 rounded-[2px] text-sm border ${formMessage.error ? "bg-destructive/10 border-destructive text-destructive" : "bg-primary/10 border-primary text-primary"}`}>
          {formMessage.text}
        </div>
      )}

      {isBatchUploading && batchUploadProgress && (
        <div className="p-3 rounded-[2px] text-sm border bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading batch games: {batchUploadProgress.uploaded} of {batchUploadProgress.total}...
        </div>
      )}

      {batchUploadErrors.length > 0 && (
        <div className="p-3 rounded-[2px] text-sm border bg-destructive/10 border-destructive text-destructive space-y-1">
          <p className="font-medium">Batch Upload Errors ({batchUploadErrors.length}):</p>
          <ul className="list-disc list-inside ml-4">
            {batchUploadErrors.map((error: string, index: number) => <li key={index}>{error}</li>)}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isBatchUploading
          ? "Uploading Batch..."
          : isSubmitting
            ? (isEditingGame ? "Updating Game..." : "Adding Game...")
            : (isEditingGame ? "Update Game" : (parsedGames.length > 1 ? `Add ${parsedGames.length} Games` : "Add Game"))
        }
      </Button>
    </form>
  )
});
AddGameForm.displayName = "AddGameForm";

const GameInfo = React.memo(({ headers, previewMode, previewData }: any) => {
  const white = previewMode && previewData.white ? previewData.white : headers.White;
  const black = previewMode && previewData.black ? previewData.black : headers.Black;
  const event = previewMode && previewData.event ? previewData.event : headers.Event;
  const result = previewMode && previewData.result ? previewData.result : headers.Result;
  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">
        Game Details {previewMode && <span className="text-xs font-normal text-muted-foreground ml-2">(Live Preview)</span>}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
        <div><span className="font-medium text-foreground">White:</span> {white || "N/A"}</div>
        <div><span className="font-medium text-foreground">Black:</span> {black || "N/A"}</div>
        <div><span className="font-medium text-foreground">Event:</span> {event || "N/A"}</div>
        <div><span className="font-medium text-foreground">Result:</span> {result || "N/A"}</div>
      </div>
    </div>
  );
});
GameInfo.displayName = "GameInfo";

const Board = React.memo(({ fen, isInteractive, customSquareStyles, onPieceDrop, onSquareClick, onPieceDragBegin, onPieceDragEnd }: any) => {
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>();
  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div ref={boardWrapperRef} className="w-full max-w-lg mx-auto lg:mx-0 aspect-square shadow-lg rounded-[2px] overflow-hidden border border-border">
      {boardWidth && boardWidth > 0 ? (
        <Chessboard
          boardWidth={boardWidth}
          position={fen}
          arePiecesDraggable={isInteractive}
          customSquareStyles={customSquareStyles}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          onPieceDragBegin={onPieceDragBegin}
          onPieceDragEnd={onPieceDragEnd}
        />
      ) : <div className="w-full h-full bg-muted animate-pulse" />}
    </div>
  );
});
Board.displayName = "Board";

const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }: any) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onStart} disabled={!canGoBack} className="flex-1 rounded-[2px] bg-transparent"><ChevronsLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onPrev} disabled={!canGoBack} className="flex-1 rounded-[2px] bg-transparent"><ChevronLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onNext} disabled={!canGoForward} className="flex-1 rounded-[2px] bg-transparent"><ChevronRight className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onEnd} disabled={!canGoForward} className="flex-1 rounded-[2px] bg-transparent"><ChevronsRight className="w-5 h-5" /></Button>
  </div>
));
Controls.displayName = "Controls";

const InteractiveControls = React.memo(({ onUndo, onReset, onLoadPgn, canUndo }: any) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onUndo} disabled={!canUndo} className="flex-1 rounded-[2px] bg-transparent gap-2"><Undo2 className="w-5 h-5" /> Undo</Button>
    <Button variant="outline" size="lg" onClick={onReset} className="flex-1 rounded-[2px] bg-transparent text-destructive gap-2"><RefreshCcw className="w-5 h-5" /> Reset</Button>
    <Button size="lg" onClick={onLoadPgn} className="flex-1 rounded-[2px] gap-2"><FileSymlink className="w-5 h-5" /> Load to Form</Button>
  </div>
));
InteractiveControls.displayName = "InteractiveControls";

const MovesList = React.memo(({ moves, currentMoveIndex, onMoveSelect }: any) => {
  const activeMoveRef = useRef<HTMLButtonElement>(null);
  const movesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
      const container = movesListRef.current;
      const element = activeMoveRef.current;
      const { top, bottom } = container.getBoundingClientRect();
      const { top: elTop, bottom: elBottom } = element.getBoundingClientRect();
      if (elTop < top || elBottom > bottom) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentMoveIndex]);

  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full flex flex-col min-h-[400px]">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">Moves</h2>
      <div ref={movesListRef} className="flex-1 overflow-y-auto pr-1 text-sm lg:min-h-0">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center max-w-[300px]">
          {moves.map((move: UiMove, index: number) => index % 2 === 0 ? (
            <React.Fragment key={index}>
              <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
              <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
              {moves[index + 1] && <MoveButton move={moves[index + 1]} index={index + 1} isCurrent={currentMoveIndex === index + 1} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index + 1 ? activeMoveRef : null} />}
            </React.Fragment>
          ) : null)}
        </div>
      </div>
    </div>
  );
});
MovesList.displayName = "MovesList";

const MoveButton = React.forwardRef<HTMLButtonElement, any>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button
    ref={ref}
    onClick={() => onMoveSelect(index)}
    className={`w-full text-left px-2 py-1 rounded-[2px] transition-colors font-mono text-sm ${isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
  >
    {move.san}
  </button>
));
MoveButton.displayName = "MoveButton"
MoveButton.displayName = "MoveButton"
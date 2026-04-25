"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardEditor } from "@/components/lessons/BoardEditor";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";

export interface PuzzleData {
  id: string;
  fen: string;
  solution: string[];
  description: string;
  themes?: string[];
  rating?: number;
  orientation?: 'white' | 'black';
}

interface PuzzleLessonBoardProps {
  puzzles: PuzzleData[];
  onPuzzlesChange: (puzzles: PuzzleData[]) => void;
}

const BOARD_CUSTOM_SQUARE_STYLES = {
  lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
  legalMove: { background: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)" },
  legalCapture: { background: "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" },
  selectedPiece: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function parseLichessPuzzleUrl(url: string): { puzzleId?: string; fen?: string } {
  const patterns = [
    /lichess\.org\/training\/([a-zA-Z0-9]+)/,
    /lichess\.org\/puzzle\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { puzzleId: match[1] };
    }
  }
  
  const fenMatch = url.match(/fen=([^\s&]+)/);
  if (fenMatch) {
    return { fen: fenMatch[1].replace(/_/g, " ") };
  }
  
  return {};
}

export function PuzzleLessonBoard({
  puzzles,
  onPuzzlesChange,
}: PuzzleLessonBoardProps) {
  const [selectedPuzzleIndex, setSelectedPuzzleIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLichessImportOpen, setIsLichessImportOpen] = useState(false);
  
  // Add puzzle form state
  const [newPuzzle, setNewPuzzle] = useState({
    url: "",
    solution: "",
    description: "",
  });
  
  // Lichess import state
  const [lichessUrl, setLichessUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [editPhase, setEditPhase] = useState<'position' | 'solution'>('position');
  const [startingFen, setStartingFen] = useState(
    puzzles[0]?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );

  // Board state for editing
  const [boardFen, setBoardFen] = useState(
    puzzles[0]?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );
  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);

  // PGN import state (Edit Position mode)
  const [pgnImportText, setPgnImportText] = useState('');
  const [pgnParseError, setPgnParseError] = useState<string | null>(null);
  const [pgnFenHistory, setPgnFenHistory] = useState<string[]>([]);
  const [pgnMoveHistory, setPgnMoveHistory] = useState<string[]>([]);
  const [pgnPlyIndex, setPgnPlyIndex] = useState(0);

  const selectedPuzzle = puzzles[selectedPuzzleIndex];

  const handleAddPuzzle = () => {
    if (!startingFen || solutionMoves.length === 0) return;

    const puzzle: PuzzleData = {
      id: generateId(),
      fen: startingFen,
      solution: solutionMoves,
      description: newPuzzle.description,
      orientation: startingFen.split(' ')[1] === 'w' ? 'white' : 'black',
    };

    onPuzzlesChange([...puzzles, puzzle]);
    setSelectedPuzzleIndex(puzzles.length);
    setIsAddModalOpen(false);
    setNewPuzzle({ url: "", solution: "", description: "" });
    setSolutionMoves([]);
    setBoardFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setStartingFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setEditPhase('position');
  };

  const handleImportFromLichess = async () => {
    if (!lichessUrl.trim()) return;
    
    setIsImporting(true);
    setImportError(null);

    try {
      const parsed = parseLichessPuzzleUrl(lichessUrl);
      
      if (parsed.puzzleId) {
        const response = await fetch(`/api/puzzles/lichess/${parsed.puzzleId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch puzzle from Lichess");
        }
        const data = await response.json();
        
        const puzzle: PuzzleData = {
          id: generateId(),
          fen: data.fen,
          solution: data.solution || [],
          description: data.themes?.join(", ") || "",
          themes: data.themes,
          rating: data.rating,
        };
        
        onPuzzlesChange([...puzzles, puzzle]);
        setSelectedPuzzleIndex(puzzles.length);
      } else if (parsed.fen) {
        const puzzle: PuzzleData = {
          id: generateId(),
          fen: parsed.fen,
          solution: [],
          description: "Imported from FEN",
        };
        
        onPuzzlesChange([...puzzles, puzzle]);
        setSelectedPuzzleIndex(puzzles.length);
      } else {
        setImportError("Invalid Lichess puzzle URL");
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import puzzle");
    } finally {
      setIsImporting(false);
      setIsLichessImportOpen(false);
      setLichessUrl("");
    }
  };

  const handleDeletePuzzle = (index: number) => {
    const newPuzzles = puzzles.filter((_, i) => i !== index);
    onPuzzlesChange(newPuzzles);
    if (selectedPuzzleIndex >= newPuzzles.length) {
      setSelectedPuzzleIndex(Math.max(0, newPuzzles.length - 1));
    }
  };

  const handleMovePuzzle = (index: number, direction: "up" | "down") => {
    const newPuzzles = [...puzzles];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= puzzles.length) return;
    
    [newPuzzles[index], newPuzzles[newIndex]] = [newPuzzles[newIndex], newPuzzles[index]];
    onPuzzlesChange(newPuzzles);
    setSelectedPuzzleIndex(newIndex);
  };

  const showLegalMoves = (square: Square) => {
    const game = new Chess(boardFen);
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) return;
    
    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move: any) => {
      newSquares[move.to] = game.get(move.to as Square)
        ? BOARD_CUSTOM_SQUARE_STYLES.legalCapture
        : BOARD_CUSTOM_SQUARE_STYLES.legalMove;
    });
    newSquares[square] = BOARD_CUSTOM_SQUARE_STYLES.selectedPiece;
    setOptionSquares(newSquares);
  };

  const onSquareClick = (square: Square) => {
    if (!moveFrom) {
      const game = new Chess(boardFen);
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        showLegalMoves(square);
      }
      return;
    }

    // Make the move
    const game = new Chess(boardFen);
    const move = game.move({ from: moveFrom, to: square, promotion: "q" });
    
    if (move) {
      setBoardFen(game.fen());
      setSolutionMoves([...solutionMoves, move.san]);
    }
    
    setMoveFrom("");
    setOptionSquares({});
  };

  const undoLastMove = () => {
    if (solutionMoves.length === 0) return;
    const newMoves = solutionMoves.slice(0, -1);
    const game = new Chess(startingFen);
    for (const san of newMoves) game.move(san);
    setBoardFen(game.fen());
    setSolutionMoves(newMoves);
  };

  const resetBoard = () => {
    setBoardFen(startingFen);
    setSolutionMoves([]);
    setMoveFrom("");
    setOptionSquares({});
  };

  const handleParsePgn = () => {
    setPgnParseError(null);
    const raw = pgnImportText.trim();
    if (!raw) return;
    try {
      // chess.js loadPgn handles both headered PGN and bare move-text (Lichess game.pgn format)
      const loader = new Chess();
      loader.loadPgn(raw);
      const moves = loader.history();
      if (moves.length === 0) {
        setPgnParseError('No moves found in PGN.');
        return;
      }
      // Replay from scratch to build full FEN history
      const fenHistory: string[] = [];
      const replay = new Chess();
      fenHistory.push(replay.fen());
      for (const san of moves) {
        replay.move(san);
        fenHistory.push(replay.fen());
      }
      const lastPly = fenHistory.length - 1;
      setPgnFenHistory(fenHistory);
      setPgnMoveHistory(moves);
      setPgnPlyIndex(lastPly);
      setBoardFen(fenHistory[lastPly]);
    } catch {
      setPgnParseError('Could not parse PGN. Check the format and try again.');
      setPgnFenHistory([]);
      setPgnMoveHistory([]);
    }
  };

  const handleEnterSolutionMode = () => {
    setStartingFen(boardFen);
    setSolutionMoves([]);
    setMoveFrom("");
    setOptionSquares({});
    setEditPhase('solution');
  };

  const handleEnterEditMode = () => {
    setBoardFen(startingFen);
    setSolutionMoves([]);
    setMoveFrom("");
    setOptionSquares({});
    setEditPhase('position');
  };

  const customSquareStyles: Record<string, React.CSSProperties> = {
    ...optionSquares,
  };
  
  if (selectedPuzzle) {
    customSquareStyles.lastMove = BOARD_CUSTOM_SQUARE_STYLES.lastMove;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Puzzle Manually
        </Button>
        <Button variant="outline" onClick={() => setIsLichessImportOpen(true)}>
          <Link2 className="w-4 h-4 mr-2" />
          Import from Lichess
        </Button>
      </div>

      {puzzles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No puzzles added yet. Add your first puzzle to get started.
            </p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Puzzle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Puzzle List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              PUZZLES ({puzzles.length})
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {puzzles.map((puzzle, index) => (
                <Card
                  key={puzzle.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedPuzzleIndex === index && "border-primary"
                  )}
                  onClick={() => setSelectedPuzzleIndex(index)}
                >
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePuzzle(index, "up");
                        }}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePuzzle(index, "down");
                        }}
                        disabled={index === puzzles.length - 1}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Puzzle #{index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {puzzle.description || "No description"}
                      </p>
                      {puzzle.rating && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Rating: {puzzle.rating}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePuzzle(index);
                      }}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Board Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {editPhase === 'position' ? 'Step 1: Set Up Position' : 'Step 2: Record Solution'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={editPhase === 'position' ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleEnterEditMode}
                    >
                      Edit Position
                    </Button>
                    <Button
                      variant={editPhase === 'solution' ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleEnterSolutionMode}
                    >
                      Record Solution
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {editPhase === 'position'
                    ? 'Use the piece palette to freely place pieces and set up the starting position.'
                    : 'Click or drag pieces to record the correct solution moves.'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {editPhase === 'position' ? (
                  <div className="space-y-4">
                    {/* PGN Import */}
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Import from PGN
                      </Label>
                      <Textarea
                        value={pgnImportText}
                        onChange={(e) => {
                          setPgnImportText(e.target.value);
                          setPgnParseError(null);
                          if (!e.target.value.trim()) {
                            setPgnFenHistory([]);
                            setPgnMoveHistory([]);
                          }
                        }}
                        placeholder={'Paste PGN or bare move-text (e.g. Lichess game.pgn)\n\ne4 e5 Nf3 Nc6 Bc4 Nf6 ...'}
                        className="font-mono text-[11px] resize-none"
                        rows={4}
                      />
                      {pgnParseError && (
                        <p className="text-[10px] text-destructive">{pgnParseError}</p>
                      )}
                      {/* Ply navigator — shown after a successful parse */}
                      {pgnFenHistory.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const i = Math.max(0, pgnPlyIndex - 1);
                              setPgnPlyIndex(i);
                              setBoardFen(pgnFenHistory[i]);
                            }}
                            disabled={pgnPlyIndex === 0}
                            className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] text-muted-foreground tabular-nums flex-1 min-w-0 truncate">
                            Ply {pgnPlyIndex} / {pgnFenHistory.length - 1}
                            {pgnPlyIndex > 0 && (
                              <span className="ml-1.5 font-mono font-medium text-foreground">
                                {Math.ceil(pgnPlyIndex / 2)}{pgnPlyIndex % 2 === 1 ? '.' : '...'}{' '}
                                {pgnMoveHistory[pgnPlyIndex - 1]}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => {
                              const i = Math.min(pgnFenHistory.length - 1, pgnPlyIndex + 1);
                              setPgnPlyIndex(i);
                              setBoardFen(pgnFenHistory[i]);
                            }}
                            disabled={pgnPlyIndex === pgnFenHistory.length - 1}
                            className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setBoardFen(pgnFenHistory[pgnPlyIndex])}
                          >
                            Use This Position
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={handleParsePgn}
                        disabled={!pgnImportText.trim()}
                      >
                        Parse PGN
                      </Button>
                    </div>

                    {/* Free-placement board editor */}
                    <BoardEditor
                      initialFen={boardFen}
                      onFenChange={(fen) => setBoardFen(fen)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <div className="w-full max-w-md aspect-square">
                        <Chessboard
                          position={boardFen}
                          onSquareClick={onSquareClick}
                          customSquareStyles={customSquareStyles}
                          arePiecesDraggable={true}
                          onPieceDrop={(source, target) => {
                            const game = new Chess(boardFen);
                            const move = game.move({ from: source, to: target, promotion: "q" });
                            if (move) {
                              setBoardFen(game.fen());
                              setSolutionMoves([...solutionMoves, move.san]);
                            }
                            return !!move;
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={resetBoard}>
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undoLastMove}
                        disabled={solutionMoves.length === 0}
                      >
                        Undo Move
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Solution Moves</Label>
                      <div className="flex flex-wrap gap-1 min-h-[40px] p-2 bg-muted rounded-md">
                        {solutionMoves.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            Click or drag pieces to record solution moves
                          </span>
                        ) : (
                          solutionMoves.map((move, index) => (
                            <Badge key={index} variant="secondary" className="gap-1">
                              {index + 1}. {move}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Engine Analysis — coach only */}
                <AnalysisPanel fen={boardFen} />

                <div className="space-y-2">
                  <Label htmlFor="description">Description / Theme</Label>
                  <Input
                    id="description"
                    value={newPuzzle.description}
                    onChange={(e) =>
                      setNewPuzzle({ ...newPuzzle, description: e.target.value })
                    }
                    placeholder="e.g., pin, discovered attack, fork"
                  />
                </div>

                <Button
                  onClick={handleAddPuzzle}
                  className="w-full"
                  disabled={editPhase === 'position' || solutionMoves.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Puzzle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add Puzzle Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Puzzle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Board Position</Label>
              <p className="text-xs text-muted-foreground">
                Set up the position using the board above, then click Save Puzzle
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPuzzle}>Add Puzzle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lichess Import Modal */}
      <Dialog open={isLichessImportOpen} onOpenChange={setIsLichessImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from Lichess</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lichess-url">Lichess Puzzle URL</Label>
              <Input
                id="lichess-url"
                value={lichessUrl}
                onChange={(e) => setLichessUrl(e.target.value)}
                placeholder="https://lichess.org/training/abc123"
              />
              <p className="text-xs text-muted-foreground">
                Paste a Lichess puzzle URL to import it
              </p>
            </div>
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLichessImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromLichess}
              disabled={isImporting || !lichessUrl.trim()}
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
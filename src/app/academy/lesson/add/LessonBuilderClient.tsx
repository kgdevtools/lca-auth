"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Chess } from "chess.js";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { LessonTypeSelectionModal, type LessonType } from "@/components/lessons/LessonTypeSelectionModal";
import { BoardEditor } from "@/components/lessons/BoardEditor";
import { Chessboard } from "react-chessboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  X, Plus, RotateCcw, Trash2, ChevronUp, ChevronDown, ChevronLeft,
  Check, Loader2, ArrowRight, ChevronRight, Pencil,
} from "lucide-react";
import {
  createPuzzleLesson, createStudyLesson, createInteractiveStudyLesson,
  updatePuzzleLesson, updateStudyLesson, updateInteractiveStudyLesson,
  fetchStudentsForAssignment,
} from "./actions";
import { fetchCategories } from "./categories";
import { parsePgn, parsePgnStudy, type MoveAnnotation } from "@/lib/pgnParser";
import StudyEditorBoard from "@/components/lessons/StudyEditorBoard";
import InteractiveStudyEditorBoard, { type SolvePoint } from "@/components/lessons/InteractiveStudyEditorBoard";
import type { LessonWithCategory, LessonBlock } from "@/repositories/lesson/lessonRepository";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PuzzleData {
  id: string;
  fen: string;
  pgn?: string;
  solution: string;
  description: string;
  hint?: string;
  orientation: 'white' | 'black';
}

interface BatchPreview {
  lichessId: string; fen: string; pgn: string; solution: string[]; themes: string[]
  rating: number | null; orientation: 'white' | 'black'
  editSolution: string; editHint: string; editThemes: string
  editOrientation: 'white' | 'black'; removed: boolean
}

interface StudyChapter {
  id: string;
  name: string;
  pgn: string;
  orientation: "white" | "black";
}

export interface EditData {
  lesson: LessonWithCategory;
  assignedStudentIds: string[];
  coaches: Array<{ id: string; full_name: string }>;
  isAdmin: boolean;
}

export interface LessonBuilderClientProps {
  mode?: 'create' | 'edit';
  editData?: EditData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const BATCH_THEMES = [
  { group: 'Openings', options: [
    { value: 'caroKann',         label: 'Caro-Kann'       },
    { value: 'slavDefense',      label: 'Slav Defense'    },
    { value: 'frenchDefense',    label: 'French Defense'  },
    { value: 'sicilianDefense',  label: 'Sicilian Defense'},
    { value: 'italianGame',      label: 'Italian Game'    },
    { value: 'spanishGame',      label: 'Spanish Game'    },
    { value: 'kingsGambit',      label: "King's Gambit"   },
    { value: 'queensGambit',     label: "Queen's Gambit"  },
    { value: 'englishOpening',   label: 'English Opening' },
    { value: 'scotchGame',       label: 'Scotch Game'     },
    { value: 'viennaGame',       label: 'Vienna Game'     },
    { value: 'kingIndianDefense',  label: "King's Indian"   },
    { value: 'nimzoIndianDefense', label: 'Nimzo-Indian'    },
    { value: 'dutchDefense',     label: 'Dutch Defense'   },
  ]},
  { group: 'Tactics', options: [
    { value: 'fork',             label: 'Fork'             },
    { value: 'pin',              label: 'Pin'              },
    { value: 'skewer',           label: 'Skewer'           },
    { value: 'discoveredAttack', label: 'Discovered Attack'},
    { value: 'doubleCheck',      label: 'Double Check'     },
    { value: 'deflection',       label: 'Deflection'       },
    { value: 'hangingPiece',     label: 'Hanging Piece'    },
    { value: 'trappedPiece',     label: 'Trapped Piece'    },
    { value: 'attraction',       label: 'Attraction'       },
    { value: 'interference',     label: 'Interference'     },
    { value: 'clearance',        label: 'Clearance'        },
    { value: 'overloading',      label: 'Overloading'      },
    { value: 'sacrifice',        label: 'Sacrifice'        },
    { value: 'quietMove',        label: 'Quiet Move'       },
  ]},
  { group: 'Mates', options: [
    { value: 'mateIn1',        label: 'Mate in 1'       },
    { value: 'mateIn2',        label: 'Mate in 2'       },
    { value: 'mateIn3',        label: 'Mate in 3'       },
    { value: 'mateIn4',        label: 'Mate in 4'       },
    { value: 'mateIn5',        label: 'Mate in 5'       },
    { value: 'backRankMate',   label: 'Back Rank Mate'  },
    { value: 'smotheredMate',  label: 'Smothered Mate'  },
    { value: 'arabianMate',    label: 'Arabian Mate'    },
    { value: 'hookMate',       label: 'Hook Mate'       },
    { value: 'anastasiasMate', label: "Anastasia's Mate"},
    { value: 'epauletteMate',  label: 'Epaulette Mate'  },
  ]},
  { group: 'Endgame', options: [
    { value: 'endgame',       label: 'Endgame (General)'},
    { value: 'pawnEndgame',   label: 'Pawn Endgame'    },
    { value: 'rookEndgame',   label: 'Rook Endgame'    },
    { value: 'queenEndgame',  label: 'Queen Endgame'   },
    { value: 'bishopEndgame', label: 'Bishop Endgame'  },
    { value: 'knightEndgame', label: 'Knight Endgame'  },
  ]},
  { group: 'Strategy', options: [
    { value: 'advancedPawn',       label: 'Advanced Pawn'      },
    { value: 'attackingF2F7',      label: 'Attack on f2/f7'    },
    { value: 'capturingDefender',  label: 'Removing Defender'  },
    { value: 'exposedKing',        label: 'Exposed King'       },
    { value: 'kingsideAttack',     label: 'Kingside Attack'    },
    { value: 'queensideAttack',    label: 'Queenside Attack'   },
    { value: 'crushing',           label: 'Crushing'           },
    { value: 'defensiveMove',      label: 'Defensive Move'     },
  ]},
  { group: 'Special', options: [
    { value: 'enPassant', label: 'En Passant' },
    { value: 'promotion', label: 'Promotion'  },
    { value: 'zugzwang',  label: 'Zugzwang'   },
    { value: 'xRayAttack',label: 'X-Ray Attack'},
    { value: 'coercion',  label: 'Coercion'   },
  ]},
];

const validTypes: LessonType[] = ["puzzle", "study", "interactive"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function contentTypeToLessonType(ct: string): LessonType {
  if (ct === 'study') return 'study';
  if (ct === 'interactive_study') return 'interactive';
  return 'puzzle';
}

function blocksToEditPuzzles(blocks: LessonBlock[]): PuzzleData[] {
  return blocks
    .filter(b => b.type === 'puzzle')
    .map(b => {
      const d = b.data as Record<string, any>;
      return {
        id: b.id,
        fen: String(d.fen ?? ''),
        solution: Array.isArray(d.solution) ? d.solution.join(' ') : String(d.solution ?? ''),
        description: Array.isArray(d.themes) ? d.themes.join(', ') : String(d.themes ?? ''),
        hint: String(d.hint ?? ''),
        orientation: (d.orientation as 'white' | 'black') ?? 'white',
      };
    });
}

function blocksToEditChapters(blocks: LessonBlock[]): StudyChapter[] {
  const block = blocks.find(b => b.type === 'study' || b.type === 'interactive_study');
  if (!block) return [];
  const chapters = (block.data as Record<string, any>).chapters;
  if (!Array.isArray(chapters)) return [];
  return chapters.map((c: any) => ({
    id: String(c.id ?? generateId()),
    name: String(c.name ?? 'Chapter'),
    pgn: String(c.pgn ?? c.fullPgn ?? ''),
    orientation: (c.orientation as 'white' | 'black') ?? 'white',
  }));
}

function blocksToSolveMoves(blocks: LessonBlock[]): Record<string, SolvePoint[]> {
  const block = blocks.find(b => b.type === 'interactive_study');
  if (!block) return {};
  const chapters = (block.data as Record<string, any>).chapters;
  if (!Array.isArray(chapters)) return {};
  const result: Record<string, SolvePoint[]> = {};
  for (const c of chapters) {
    if (c.solveMoves && Array.isArray(c.solveMoves) && c.solveMoves.length > 0) {
      result[String(c.id)] = c.solveMoves;
    }
  }
  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CollapsibleSection({
  label, preview, defaultOpen = false, children,
}: {
  label: string; preview?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          {!open && preview && <span className="text-sm text-foreground/70 truncate">{preview}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

function StudentMultiSelect({
  students, selectedIds, onToggle,
}: {
  students: Array<{ id: string; full_name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedStudents = students.filter(s => selectedIds.includes(s.id));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-start h-auto min-h-9 py-1.5">
          {selectedStudents.length === 0 ? (
            <span className="text-muted-foreground text-sm">Select students...</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedStudents.map(s => (
                <Badge key={s.id} variant="secondary" className="text-xs">
                  {s.full_name}
                  <span
                    role="button"
                    tabIndex={0}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onToggle(s.id); }}
                    className="ml-1 cursor-pointer hover:text-destructive"
                  >×</span>
                </Badge>
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search students..." />
          <CommandEmpty>No students found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {students.map(student => {
              const isSelected = selectedIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  onMouseDown={e => { e.preventDefault(); onToggle(student.id); }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {student.full_name}
                </div>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LessonInfoForm({
  lessonInfo, categories, students, selectedStudentIds, onToggleStudent,
  tagInput, setTagInput, onChange, onTitleChange, onAddTag, onRemoveTag,
  readOnly, coaches, assignedTo, onAssignedToChange,
}: {
  lessonInfo: { title: string; slug: string; description: string; categoryId: string; difficulty: string; estimatedDurationMinutes: string; tags: string[] };
  categories: Array<{ id: string; name: string }>;
  students: Array<{ id: string; full_name: string }>;
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  onChange: (info: Partial<typeof lessonInfo>) => void;
  onTitleChange: (title: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  readOnly?: boolean;
  coaches?: Array<{ id: string; full_name: string }>;
  assignedTo?: string;
  onAssignedToChange?: (id: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); onAddTag(); } };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">

      {/* Title */}
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="title" className="text-xs text-muted-foreground">
          Title {readOnly && <span className="text-[10px] ml-1 text-muted-foreground/50">(read-only)</span>}
        </Label>
        <Input
          id="title"
          placeholder="e.g. Ruy Lopez: Exchange Variation"
          value={lessonInfo.title}
          onChange={e => !readOnly && onTitleChange(e.target.value)}
          readOnly={readOnly}
          className={cn(readOnly && 'opacity-60 cursor-default bg-muted')}
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label htmlFor="slug" className="text-xs text-muted-foreground">
          Slug {readOnly && <span className="text-[10px] ml-1 text-muted-foreground/50">(read-only)</span>}
        </Label>
        <Input
          id="slug"
          placeholder="ruy-lopez-exchange"
          value={lessonInfo.slug}
          onChange={e => !readOnly && onChange({ slug: e.target.value })}
          readOnly={readOnly}
          className={cn('font-mono text-sm', readOnly && 'opacity-60 cursor-default bg-muted')}
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
        <Select value={lessonInfo.categoryId} onValueChange={v => onChange({ categoryId: v })}>
          <SelectTrigger id="category"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <Label htmlFor="difficulty" className="text-xs text-muted-foreground">Difficulty</Label>
        <Select value={lessonInfo.difficulty} onValueChange={v => onChange({ difficulty: v })}>
          <SelectTrigger id="difficulty"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {DIFFICULTY_LEVELS.map(level => (
              <SelectItem key={level} value={level} className="capitalize">
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label htmlFor="duration" className="text-xs text-muted-foreground">Duration (min)</Label>
        <Input
          id="duration" type="number" min={1} max={480} placeholder="30"
          value={lessonInfo.estimatedDurationMinutes}
          onChange={e => onChange({ estimatedDurationMinutes: e.target.value })}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label className="text-xs text-muted-foreground">Tags</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag and press Enter"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={onAddTag} type="button">Add</Button>
        </div>
        {lessonInfo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {lessonInfo.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                {tag}
                <button onClick={() => onRemoveTag(tag)} className="hover:text-foreground transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          id="description"
          placeholder="What will students learn from this lesson?"
          value={lessonInfo.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Assign to coach (admin edit mode only) */}
      {coaches && coaches.length > 0 && onAssignedToChange && (
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label className="text-xs text-muted-foreground">Assign to coach</Label>
          <Select value={assignedTo ?? ''} onValueChange={onAssignedToChange}>
            <SelectTrigger><SelectValue placeholder="Select coach…" /></SelectTrigger>
            <SelectContent>
              {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assign students */}
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label className="text-xs text-muted-foreground">Assign students</Label>
        <StudentMultiSelect students={students} selectedIds={selectedStudentIds} onToggle={onToggleStudent} />
      </div>
    </div>
  );
}

function SuccessBanner({
  lessonId, label, mode, onCreateAnother,
}: {
  lessonId: string; label: string; mode: 'create' | 'edit'; onCreateAnother: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card flex-wrap">
      <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
        <Check className="w-4 h-4 text-background" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{mode === 'edit' ? `${label} updated` : `${label} created`}</p>
        <p className="text-xs text-muted-foreground">
          {mode === 'edit' ? 'Changes saved. Student progress has been reset if content changed.' : 'Saved as draft — publish when ready.'}
        </p>
      </div>
      <div className="flex gap-2">
        {mode === 'create' && (
          <Button variant="outline" size="sm" onClick={onCreateAnother}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create another
          </Button>
        )}
        <a href={`/academy/lesson/${lessonId}`}>
          <Button size="sm">
            View <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </a>
        {mode === 'edit' && (
          <a href="/academy/lesson">
            <Button variant="outline" size="sm">Back to lessons</Button>
          </a>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ isSubmitting, label, onClick }: { isSubmitting: boolean; label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={isSubmitting} className="w-full">
      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Check className="w-4 h-4 mr-2" />{label}</>}
    </Button>
  );
}

function LichessKnightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="5.89 5.91 68.19 68.14" width={size} height={size} style={{ flexShrink: 0 }}>
      <path fill="#bfad1e" strokeWidth=".92274" d="m37.656 74.009c-4.8354-0.36436-9.6886-1.699-13.955-3.8378-3.4383-1.7236-6.4517-3.92-9.0933-6.628-7.0896-7.2676-10.055-17.334-8.1548-27.684 1.5646-8.5227 6.1202-15.614 12.927-20.122 6.4164-4.2497 14.836-6.2637 24.632-5.8922l2.1764 0.082493 0.71448-0.46162c2.8371-1.8331 5.781-2.7675 10.74-3.409 1.3469-0.17424 1.5334-0.18309 1.7288-0.082031 0.24019 0.1242 0.31608 0.26074 0.31608 0.56864 0 0.11136-0.4595 2.1736-1.0211 4.5828-1.0078 4.3233-1.0194 4.3838-0.89332 4.6483 0.07031 0.14737 0.50749 0.95627 0.97159 1.7975 0.4641 0.84128 0.96793 1.7581 1.1196 2.0374 0.15171 0.2793 1.5664 2.8457 3.1439 5.7031 1.5774 2.8574 3.8363 6.9531 5.0198 9.1016 3.237 5.8763 4.9952 9.0631 5.4255 9.8339 0.50792 0.90969 0.63287 1.4871 0.62769 2.9005-0.0037 0.91614-0.03691 1.2203-0.20664 1.8732-0.86524 3.328-3.915 6.1562-8.8068 8.167-1.1079 0.45544-2.3332 0.85827-2.6106 0.85827-0.25397 0-0.38898-0.15415-1.129-1.2891-1.3352-2.0478-3.9112-4.9986-6.541-7.4929-1.5045-1.427-2.0154-1.8499-5.6466-4.6744-4.6142-3.5891-6.2759-5.0009-8.48-7.2045-3.9949-3.9941-5.887-7.2765-6.1716-10.706-0.08995-1.0838 0.18839-2.7981 0.50585-3.1155 0.41619-0.41619 1.1662-0.01476 1.064 0.56953-0.02694 0.15422-0.06902 0.65348-0.09347 1.1095-0.03663 0.68284-0.01606 0.94126 0.11629 1.4648 0.63768 2.5217 3.041 5.405 7.3949 8.8718 2.0126 1.6025 3.381 2.5855 7.6172 5.4717 5.194 3.5387 5.6984 3.9377 8.1641 6.4574 2.308 2.3586 3.494 3.8269 4.3474 5.3817 0.22404 0.4082 0.4147 0.75294 0.42366 0.7661 0.03949 0.05785 1.0174-0.24498 1.6091-0.49822 2.5156-1.0767 4.1441-3.2328 4.6375-6.1402l0.12817-0.75512-2.3219-3.8933c-1.2771-2.1413-2.9627-4.9656-3.7459-6.2761-2.1258-3.5573-10.258-17.183-10.81-18.114-0.26416-0.44496-0.4989-0.88442-0.52166-0.97656-0.0251-0.10167 0.35524-1.304 0.96742-3.0582 1.1589-3.3208 1.1586-3.0658 0.0028-2.7713-1.7885 0.45585-3.5267 1.2861-7.057 3.3706-0.71397 0.4216-1.2524 0.68973-1.385 0.68973-0.11934 0-0.6484-0.06957-1.1757-0.15451-2.4739-0.39872-5.0621-0.55615-7.5603-0.45987-5.5228 0.21286-10.604 1.8776-14.844 4.8634-4.762 3.3535-8.8329 8.8527-10.751 14.524-2.991 8.8413-0.68144 19.066 6.03 26.696 4.991 5.6739 11.828 9.2927 19.487 10.315 1.578 0.21053 4.5386 0.28823 6.1195 0.16059 7.0509-0.56924 13.253-3.3262 18.267-8.1207 0.79159-0.75686 0.94438-0.87009 1.174-0.87009 0.61003 0 0.83436 0.48111 0.49462 1.0608-0.76303 1.302-2.9045 3.6393-4.5382 4.9532-4.0237 3.236-9.0858 5.1841-14.924 5.7434-1.1092 0.10625-4.5728 0.1453-5.655 0.06376z"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LessonBuilderClient({ mode = 'create', editData }: LessonBuilderClientProps) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const isEdit = mode === 'edit';

  // ── State — lazy-initialised from editData in edit mode ────────────────────

  const [selectedType, setSelectedType] = useState<LessonType | null>(() => {
    if (isEdit && editData) return contentTypeToLessonType(editData.lesson.content_type);
    const typeParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('type') as LessonType | null : null;
    if (typeParam && validTypes.includes(typeParam)) return typeParam;
    return null;
  });
  const [showModal, setShowModal] = useState(() => !isEdit && !selectedType);

  // Puzzle state
  const [puzzles, setPuzzles] = useState<PuzzleData[]>(() =>
    isEdit && editData ? blocksToEditPuzzles(editData.lesson.blocks) : []
  );
  const [editingPuzzleId, setEditingPuzzleId] = useState<string | null>(null);
  const [editingOrientation, setEditingOrientation] = useState<'white' | 'black' | undefined>(undefined);
  const [currentFen, setCurrentFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [fenError, setFenError] = useState<string | null>(null);
  const [solutionInput, setSolutionInput] = useState("");
  const [puzzleDescInput, setPuzzleDescInput] = useState("");
  const [puzzleHintInput, setPuzzleHintInput] = useState("");
  const [lichessUrl, setLichessUrl] = useState("");
  const [isLichessImportOpen, setIsLichessImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importTab, setImportTab] = useState<'single' | 'batch'>('single');
  const [batchThemes, setBatchThemes] = useState<string[]>(['fork']);
  const [batchMixed, setBatchMixed] = useState(false);
  const [batchDifficulty, setBatchDifficulty] = useState('normal');
  const [collapsedBatchGroups, setCollapsedBatchGroups] = useState<Set<string>>(new Set());
  const [batchNb, setBatchNb] = useState(10);
  const [batchPreviews, setBatchPreviews] = useState<BatchPreview[]>([]);
  const [isBatchFetching, setIsBatchFetching] = useState(false);

  // Puzzle engine eval state
  const [puzzleEvalScore, setPuzzleEvalScore] = useState<number | null>(null);
  const [puzzleEvalMate, setPuzzleEvalMate] = useState<number | null>(null);
  const [puzzleEngineEnabled, setPuzzleEngineEnabled] = useState(false);

  // Puzzle PGN import state
  const [puzzlePgnText, setPuzzlePgnText] = useState('');
  const [puzzlePgnError, setPuzzlePgnError] = useState<string | null>(null);
  const [puzzlePgnFenHistory, setPuzzlePgnFenHistory] = useState<string[]>([]);
  const [puzzlePgnMoveHistory, setPuzzlePgnMoveHistory] = useState<string[]>([]);
  const [puzzlePgnPlyIndex, setPuzzlePgnPlyIndex] = useState(0);

  // Study state
  const [chapters, setChapters] = useState<StudyChapter[]>(() =>
    isEdit && editData ? blocksToEditChapters(editData.lesson.blocks) : []
  );
  const [chapterNameInput, setChapterNameInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
  const [chapterOrientation, setChapterOrientation] = useState<"white" | "black">("white");
  const [moveAnnotations, setMoveAnnotations] = useState<Map<string, MoveAnnotation>>(new Map());
  const [isLichessStudyImportOpen, setIsLichessStudyImportOpen] = useState(false);
  const [lichessStudyUrl, setLichessStudyUrl] = useState("");
  const [isLichessImporting, setIsLichessImporting] = useState(false);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);

  // Interactive study solve points
  const [interactiveSolveMoves, setInteractiveSolveMoves] = useState<Record<string, SolvePoint[]>>(() =>
    isEdit && editData ? blocksToSolveMoves(editData.lesson.blocks) : {}
  );

  // Shared submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);

  // Lesson metadata
  const [lessonInfo, setLessonInfo] = useState(() => {
    if (isEdit && editData) {
      const l = editData.lesson;
      return {
        title: l.title,
        slug: l.slug,
        description: l.description ?? '',
        categoryId: l.category_id ?? '',
        difficulty: l.difficulty ?? '',
        estimatedDurationMinutes: l.estimated_duration_minutes?.toString() ?? '',
        tags: [] as string[],
      };
    }
    return { title: '', slug: '', description: '', categoryId: '', difficulty: '', estimatedDurationMinutes: '', tags: [] as string[] };
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [tagInput, setTagInput] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() =>
    isEdit && editData ? editData.assignedStudentIds : []
  );
  const [assignedTo, setAssignedTo] = useState<string>(() =>
    isEdit && editData?.isAdmin ? (editData.lesson.created_by ?? '') : ''
  );

  // Read type from URL on mount (create mode only)
  useEffect(() => {
    if (isEdit) return;
    const typeParam = searchParams.get("type") as LessonType | null;
    if (typeParam && validTypes.includes(typeParam)) {
      setSelectedType(typeParam);
      setShowModal(false);
    }
  }, [searchParams, isEdit]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchStudentsForAssignment().then(setStudents).catch(console.error);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTypeSelect = (type: LessonType) => {
    setSelectedType(type);
    setShowModal(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleReset = () => {
    setSelectedType(null);
    setShowModal(true);
    router.replace(pathname, { scroll: false });
  };

  const handleCreateAnother = () => {
    setPuzzles([]); setEditingPuzzleId(null); setEditingOrientation(undefined);
    setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); setFenError(null);
    setSolutionInput(""); setPuzzleDescInput(""); setPuzzleHintInput("");
    setPuzzlePgnText(""); setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]); setPuzzlePgnPlyIndex(0);
    setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null);
    setSelectedStudentIds([]);
    setLessonInfo({ title: "", slug: "", description: "", categoryId: "", difficulty: "", estimatedDurationMinutes: "", tags: [] });
    setIsCompleted(false); setSavedLessonId(null); setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFenChange = useCallback((value: string) => {
    setCurrentFen(value);
    try { new Chess(value); setFenError(null); }
    catch { setFenError("Invalid FEN position"); }
  }, []);

  const handleParsePuzzlePgn = () => {
    setPuzzlePgnError(null);
    const raw = puzzlePgnText.trim();
    if (!raw) return;
    try {
      const loader = new Chess();
      loader.loadPgn(raw);
      const moves = loader.history();
      if (moves.length === 0) { setPuzzlePgnError('No moves found in PGN.'); return; }
      const fenHistory: string[] = [];
      const replay = new Chess();
      fenHistory.push(replay.fen());
      for (const san of moves) { replay.move(san); fenHistory.push(replay.fen()); }
      const lastPly = fenHistory.length - 1;
      setPuzzlePgnFenHistory(fenHistory); setPuzzlePgnMoveHistory(moves);
      setPuzzlePgnPlyIndex(lastPly); handleFenChange(fenHistory[lastPly]);
    } catch {
      setPuzzlePgnError('Could not parse PGN. Check the format and try again.');
      setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]);
    }
  };

  const handleTitleChange = (title: string) => {
    if (isEdit) return;
    const autoSlug = !lessonInfo.slug || lessonInfo.slug === generateSlug(lessonInfo.title);
    setLessonInfo(prev => ({ ...prev, title, ...(autoSlug ? { slug: generateSlug(title) } : {}) }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !lessonInfo.tags.includes(tag)) {
      setLessonInfo(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setLessonInfo(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const handleAddPuzzle = () => {
    if (!currentFen || !solutionInput.trim()) return;
    let sol = solutionInput.trim();
    if (!sol.includes("-")) {
      try {
        const g = new Chess(currentFen);
        const result = g.move(sol);
        if (result) sol = `${result.from}-${result.to}`;
      } catch {}
    }
    const turn = currentFen.split(' ')[1];
    const orientation: 'white' | 'black' = turn === 'b' ? 'black' : 'white';
    if (editingPuzzleId) {
      setPuzzles(prev => prev.map(p => p.id === editingPuzzleId
        ? { ...p, fen: currentFen, solution: sol, description: puzzleDescInput.trim(), hint: puzzleHintInput.trim(), orientation }
        : p
      ));
      setEditingPuzzleId(null);
    } else {
      setPuzzles(prev => [...prev, { id: generateId(), fen: currentFen, solution: sol, description: puzzleDescInput.trim(), hint: puzzleHintInput.trim(), orientation }]);
    }
    setSolutionInput(""); setPuzzleDescInput(""); setPuzzleHintInput("");
  };

  const handleEditPuzzle = (puzzle: PuzzleData) => {
    setCurrentFen(puzzle.fen); setEditingOrientation(puzzle.orientation);
    setSolutionInput(puzzle.solution); setPuzzleDescInput(puzzle.description); setPuzzleHintInput(puzzle.hint || '');
    setEditingPuzzleId(puzzle.id);
    const pgn = puzzle.pgn || '';
    setPuzzlePgnText(pgn); setPuzzlePgnError(null);
    if (pgn) {
      try {
        const loader = new Chess(); loader.loadPgn(pgn);
        const moves = loader.history();
        if (moves.length > 0) {
          const fenHistory: string[] = [];
          const replay = new Chess(); fenHistory.push(replay.fen());
          for (const san of moves) { replay.move(san); fenHistory.push(replay.fen()); }
          setPuzzlePgnFenHistory(fenHistory); setPuzzlePgnMoveHistory(moves); setPuzzlePgnPlyIndex(fenHistory.length - 1);
        }
      } catch { setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]); }
    } else { setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]); }
  };

  const handleCancelEdit = () => {
    setEditingPuzzleId(null); setEditingOrientation(undefined);
    setSolutionInput(''); setPuzzleDescInput(''); setPuzzleHintInput('');
    setPuzzlePgnText(''); setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]);
  };

  const closeImportModal = () => {
    setIsLichessImportOpen(false); setImportTab('single'); setBatchPreviews([]); setLichessUrl("");
  };

  const handleImportFromLichess = async () => {
    if (!lichessUrl.trim()) return;
    setIsImporting(true);
    try {
      const match = lichessUrl.match(/lichess\.org\/(?:training|puzzle)\/([a-zA-Z0-9]+)/);
      if (!match) { alert("Invalid Lichess puzzle URL"); return; }
      const res = await fetch(`/api/puzzles/lichess/${match[1]}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const importedTurn = (data.fen as string)?.split(' ')?.[1];
      setPuzzles(prev => [...prev, {
        id: generateId(), fen: data.fen,
        solution: data.solution?.join(" ") || "",
        description: data.themes?.join(", ") || "",
        orientation: importedTurn === 'b' ? 'black' : 'white',
      }]);
    } catch { alert("Failed to import puzzle"); }
    finally { setIsImporting(false); closeImportModal(); }
  };

  const handleBatchFetch = async () => {
    setIsBatchFetching(true); setBatchPreviews([]);
    try {
      const themesParam = batchMixed ? 'mixed' : batchThemes.join(',');
      const res = await fetch(`/api/puzzles/lichess/batch?themes=${themesParam}&nb=${batchNb}&difficulty=${batchDifficulty}`);
      if (!res.ok) {
        let reason = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j?.error) reason = j.error; } catch {}
        throw new Error(reason);
      }
      const data = await res.json();
      setBatchPreviews((data.puzzles ?? []).map((p: any) => ({
        ...p, editSolution: (p.solution as string[]).join(' '), editHint: '',
        editThemes: (p.themes as string[]).join(', '), editOrientation: p.orientation, removed: false,
      })));
    } catch (err) { alert(`Failed to fetch batch puzzles: ${err instanceof Error ? err.message : 'Unknown error'}`); }
    finally { setIsBatchFetching(false); }
  };

  const handleBatchImport = () => {
    const toAdd = batchPreviews.filter(p => !p.removed).map(p => ({
      id: generateId(), fen: p.fen, pgn: p.pgn,
      solution: p.editSolution, description: p.editThemes, hint: p.editHint, orientation: p.editOrientation,
    }));
    setPuzzles(prev => [...prev, ...toAdd]);
    closeImportModal();
  };

  const handleDeleteChapter = (index: number) => {
    setChapters(prev => prev.filter((_, i) => i !== index));
    setSelectedChapterIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleRenameChapter = (index: number, name: string) => {
    if (!name.trim()) return;
    setChapters(prev => prev.map((c, i) => i === index ? { ...c, name: name.trim() } : c));
  };

  const handleAddChapter = () => {
    if (!pgnInput.trim() || !chapterNameInput.trim()) return;
    const newIndex = chapters.length;
    setChapters(prev => [...prev, { id: generateId(), name: chapterNameInput.trim(), pgn: pgnInput.trim(), orientation: chapterOrientation }]);
    setSelectedChapterIndex(newIndex); setChapterNameInput(""); setPgnInput("");
  };

  const handleImportFromLichessStudy = async () => {
    if (!lichessStudyUrl.trim()) return;
    setIsLichessImporting(true);
    try {
      const match = lichessStudyUrl.match(/lichess\.org\/study\/([a-zA-Z0-9]+)/);
      if (!match) {
        alert("Invalid Lichess study URL.\n\nExpected format: https://lichess.org/study/STUDY_ID");
        return;
      }
      const res = await fetch(`/api/study/lichess/${match[1]}`);
      const data = await res.json();
      if (!res.ok) {
        alert(`Import failed: ${data.error || `HTTP ${res.status}`}`);
        return;
      }
      if (data.chapters?.length > 0) {
        setChapters(prev => [...prev, ...data.chapters.map((c: any, i: number) => ({
          id: generateId(), name: c.name || `Chapter ${i + 1}`, pgn: c.pgn || "", orientation: c.orientation || "white",
        }))]);
      } else {
        alert("The study imported successfully but contained no chapters.");
      }
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "Network error — check your connection."}`);
    } finally {
      setIsLichessImporting(false);
      setIsLichessStudyImportOpen(false);
      setLichessStudyUrl("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (!content) return;
      const parsed = parsePgnStudy(content);
      if (parsed.chapters.length > 0) {
        setChapters(prev => [...prev, ...parsed.chapters.map((c, i) => {
          const h = c.headers || {};
          const name = h.ChapterName || (h.White && h.Black ? `${h.White} – ${h.Black}` : null) || h.Event || `Game ${chapters.length + i + 1}`;
          return { id: generateId(), name, pgn: c.fullPgn, orientation: "white" as const };
        })]);
      } else {
        const single = parsePgn(content);
        if (single.moves.length > 0) {
          const h = single.headers;
          const name = h.ChapterName || (h.White && h.Black ? `${h.White} – ${h.Black}` : null) || h.Event || `Chapter ${chapters.length + 1}`;
          setChapters(prev => [...prev, { id: generateId(), name, pgn: content, orientation: "white" }]);
        } else { setPgnInput(content); }
      }
    };
    reader.readAsText(file);
  };

  const validateLesson = () => {
    if (!lessonInfo.title.trim()) { alert("Please enter a lesson title"); return false; }
    if (!lessonInfo.slug.trim())  { alert("Please enter a lesson slug");  return false; }
    return true;
  };

  const displaySettings = { showEval: true, showClocks: true, showArrows: true, showHighlights: true };

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handlePuzzleSubmit = async () => {
    if (!validateLesson()) return;
    if (puzzles.length === 0) { alert("At least one puzzle is required"); return; }
    setIsSubmitting(true);
    try {
      if (isEdit && editData) {
        await updatePuzzleLesson(editData.lesson.id, lessonInfo, puzzles, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createPuzzleLesson(lessonInfo, puzzles, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleStudySubmit = async () => {
    if (!validateLesson()) return;
    if (chapters.length === 0) { alert("Please add at least one chapter"); return; }
    setIsSubmitting(true);
    try {
      if (isEdit && editData) {
        await updateStudyLesson(editData.lesson.id, lessonInfo, chapters, displaySettings, moveAnnotations, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createStudyLesson(lessonInfo, chapters, displaySettings, moveAnnotations, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null); setMoveAnnotations(new Map());
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleInteractiveSubmit = async () => {
    if (!validateLesson()) return;
    if (chapters.length === 0) { alert("Please add at least one chapter"); return; }
    setIsSubmitting(true);
    try {
      if (isEdit && editData) {
        await updateInteractiveStudyLesson(editData.lesson.id, lessonInfo, chapters, displaySettings, interactiveSolveMoves, moveAnnotations, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createInteractiveStudyLesson(lessonInfo, chapters, displaySettings, interactiveSolveMoves, moveAnnotations, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null);
        setMoveAnnotations(new Map()); setInteractiveSolveMoves({});
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const submitLabel = isEdit ? "Save changes" : "Create lesson";

  // ── Puzzle editor ──────────────────────────────────────────────────────────

  const renderPuzzleEditor = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsLichessImportOpen(true)}>
          <LichessKnightIcon size={16} />
          <span className="ml-1.5">Import from Lichess</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
        <div className="rounded-lg border border-border bg-card p-4 min-w-0 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Board editor</p>
          <BoardEditor
            initialFen={currentFen}
            initialOrientation={editingOrientation}
            onFenChange={handleFenChange}
            evalScore={puzzleEvalScore}
            evalMate={puzzleEvalMate}
            engineEnabled={puzzleEngineEnabled}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Puzzle details</p>
          <AnalysisPanel
            fen={currentFen}
            onToggle={enabled => { setPuzzleEngineEnabled(enabled); if (!enabled) { setPuzzleEvalScore(null); setPuzzleEvalMate(null); } }}
            onEvalUpdate={(score, mate) => { setPuzzleEvalScore(score); setPuzzleEvalMate(mate); }}
          />

          <div className="space-y-1.5">
            <Label htmlFor="fen" className="text-xs text-muted-foreground">FEN position</Label>
            <Input id="fen" value={currentFen} onChange={e => handleFenChange(e.target.value)} className="font-mono text-xs" />
            {fenError && <p className="text-xs text-destructive">{fenError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Set position from PGN</Label>
            <Textarea
              value={puzzlePgnText}
              onChange={e => { setPuzzlePgnText(e.target.value); setPuzzlePgnError(null); if (!e.target.value.trim()) { setPuzzlePgnFenHistory([]); setPuzzlePgnMoveHistory([]); } }}
              placeholder={'Paste PGN or bare move-text (Lichess game.pgn)\n\ne4 e5 Nf3 Nc6 Bc4 Nf6 ...'}
              className="font-mono text-[11px] resize-none"
              rows={3}
            />
            {puzzlePgnError && <p className="text-[10px] text-destructive">{puzzlePgnError}</p>}
            {puzzlePgnFenHistory.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { const i = Math.max(0, puzzlePgnPlyIndex - 1); setPuzzlePgnPlyIndex(i); handleFenChange(puzzlePgnFenHistory[i]); }}
                  disabled={puzzlePgnPlyIndex === 0}
                  className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-muted-foreground tabular-nums flex-1 min-w-0 truncate">
                  Ply {puzzlePgnPlyIndex} / {puzzlePgnFenHistory.length - 1}
                  {puzzlePgnPlyIndex > 0 && (
                    <span className="ml-1.5 font-mono font-medium text-foreground">
                      {Math.ceil(puzzlePgnPlyIndex / 2)}{puzzlePgnPlyIndex % 2 === 1 ? '.' : '...'}{' '}
                      {puzzlePgnMoveHistory[puzzlePgnPlyIndex - 1]}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => { const i = Math.min(puzzlePgnFenHistory.length - 1, puzzlePgnPlyIndex + 1); setPuzzlePgnPlyIndex(i); handleFenChange(puzzlePgnFenHistory[i]); }}
                  disabled={puzzlePgnPlyIndex === puzzlePgnFenHistory.length - 1}
                  className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={handleParsePuzzlePgn} disabled={!puzzlePgnText.trim()}>
              Parse PGN
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="solution" className="text-xs text-muted-foreground">Solution</Label>
            <Textarea
              id="solution" value={solutionInput} onChange={e => setSolutionInput(e.target.value)}
              placeholder="e.g. Nf6# or Qxh7+ Kxh7 Rh1#"
              className="font-mono text-sm resize-none" rows={3}
            />
            <p className="text-xs text-muted-foreground">Separate moves with spaces (SAN notation)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="puzzle-desc" className="text-xs text-muted-foreground">Theme / description</Label>
            <Input id="puzzle-desc" value={puzzleDescInput} onChange={e => setPuzzleDescInput(e.target.value)} placeholder="e.g. pin, fork, discovered attack" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="puzzle-hint" className="text-xs text-muted-foreground">Hint (optional)</Label>
            <Input id="puzzle-hint" value={puzzleHintInput} onChange={e => setPuzzleHintInput(e.target.value)} placeholder="e.g. Look for a forcing move on the kingside" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddPuzzle} className="flex-1" disabled={!solutionInput.trim()}>
              {editingPuzzleId ? <><Check className="w-4 h-4 mr-2" />Save changes</> : <><Plus className="w-4 h-4 mr-2" />Add puzzle</>}
            </Button>
            {editingPuzzleId && <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
          </div>
        </div>
      </div>

      {puzzles.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Puzzles ({puzzles.length})</p>
          </div>
          <div className="divide-y divide-border">
            {puzzles.map((puzzle, index) => (
              <div key={puzzle.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${editingPuzzleId === puzzle.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => { if (index === 0) return; const arr = [...puzzles]; [arr[index], arr[index-1]] = [arr[index-1], arr[index]]; setPuzzles(arr); }} disabled={index === 0} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => { if (index === puzzles.length-1) return; const arr = [...puzzles]; [arr[index], arr[index+1]] = [arr[index+1], arr[index]]; setPuzzles(arr); }} disabled={index === puzzles.length-1} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <div className="flex-shrink-0 w-[80px] h-[80px]">
                  <Chessboard position={puzzle.fen} boardWidth={80} arePiecesDraggable={false} customBoardStyle={{ borderRadius: "4px" }} boardOrientation={puzzle.orientation} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">#{index + 1}</p>
                  {puzzle.description && <p className="text-sm truncate">{puzzle.description}</p>}
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{puzzle.solution}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEditPuzzle(puzzle)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (editingPuzzleId === puzzle.id) handleCancelEdit(); setPuzzles(prev => prev.filter(p => p.id !== puzzle.id)); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border">
            {isCompleted && savedLessonId ? (
              <SuccessBanner lessonId={savedLessonId} label="Puzzle lesson" mode={mode} onCreateAnother={handleCreateAnother} />
            ) : (
              <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handlePuzzleSubmit} />
            )}
          </div>
        </div>
      )}

      {/* Submit button when no puzzles yet (edit mode, normally has puzzles) */}
      {puzzles.length === 0 && isEdit && (
        <div className="rounded-lg border border-border bg-card p-4">
          {isCompleted && savedLessonId ? (
            <SuccessBanner lessonId={savedLessonId} label="Puzzle lesson" mode={mode} onCreateAnother={handleCreateAnother} />
          ) : (
            <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handlePuzzleSubmit} />
          )}
        </div>
      )}

      {isLichessImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-lg rounded-md border border-border bg-card shadow-xl mx-4 flex flex-col max-h-[90vh]">

            {/* Tab switcher — fixed header */}
            <div className="px-6 pt-5 pb-3 flex-shrink-0">
              <div className="flex gap-1 p-1 bg-muted rounded-sm">
                {(['single', 'batch'] as const).map(tab => (
                  <button key={tab} onClick={() => setImportTab(tab)}
                    className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${importTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {tab === 'single' ? 'Single URL' : 'Batch Import'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 space-y-4 pb-2">

              {importTab === 'single' && (
                <div className="space-y-1.5">
                  <Label htmlFor="lichess-url" className="text-xs text-muted-foreground">Lichess puzzle URL</Label>
                  <Input id="lichess-url" value={lichessUrl} onChange={e => setLichessUrl(e.target.value)} placeholder="https://lichess.org/training/abc123" autoFocus />
                </div>
              )}

              {importTab === 'batch' && (
                <>
                  {/* Theme chip grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Themes</Label>
                      <div className="flex items-center gap-2">
                        {!batchMixed && batchThemes.length > 0 && (
                          <button type="button" onClick={() => setBatchThemes([])}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBatchMixed(v => !v)}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-sm border transition-colors',
                            batchMixed ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground'
                          )}
                        >
                          Mixed
                        </button>
                      </div>
                    </div>
                    <div className={cn('space-y-1', batchMixed && 'opacity-40 pointer-events-none')}>
                      {BATCH_THEMES.map(g => {
                        const isCollapsed = collapsedBatchGroups.has(g.group);
                        const activeInGroup = g.options.filter(o => batchThemes.includes(o.value)).length;
                        return (
                          <div key={g.group} className="border border-border rounded-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setCollapsedBatchGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(g.group)) next.delete(g.group); else next.add(g.group);
                                return next;
                              })}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/40 transition-colors"
                            >
                              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">{g.group}</span>
                              <div className="flex items-center gap-2">
                                {activeInGroup > 0 && (
                                  <span className="text-[10px] font-medium text-foreground/60">{activeInGroup} selected</span>
                                )}
                                <ChevronRight className={cn('w-3 h-3 text-muted-foreground transition-transform', !isCollapsed && 'rotate-90')} />
                              </div>
                            </button>
                            {!isCollapsed && (
                              <div className="flex flex-wrap gap-1 px-2.5 pb-2.5">
                                {g.options.map(o => {
                                  const isActive = batchThemes.includes(o.value);
                                  return (
                                    <button
                                      key={o.value}
                                      type="button"
                                      onClick={() => setBatchThemes(prev =>
                                        prev.includes(o.value) ? prev.filter(t => t !== o.value) : [...prev, o.value]
                                      )}
                                      className={cn(
                                        'text-xs px-2 py-0.5 rounded-sm border transition-colors',
                                        isActive ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/50'
                                      )}
                                    >
                                      {o.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Difficulty pill row + Count */}
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Difficulty</Label>
                      <div className="flex flex-wrap gap-1">
                        {(['easiest', 'easier', 'normal', 'harder', 'hardest', 'mixed'] as const).map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setBatchDifficulty(d)}
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-sm border capitalize transition-colors',
                              batchDifficulty === d ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/50'
                            )}
                          >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Count</Label>
                      <Input type="number" min={1} max={50} value={batchNb}
                        onChange={e => setBatchNb(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="h-9 w-20" />
                    </div>
                  </div>

                  <Button size="sm" className="w-full" onClick={handleBatchFetch}
                    disabled={isBatchFetching || (!batchMixed && batchThemes.length === 0)}>
                    {isBatchFetching ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Fetching…</> : 'Fetch Puzzles'}
                  </Button>

                  {batchPreviews.length > 0 && (
                    <div className="space-y-2">
                      {batchPreviews.map((p, i) => p.removed ? null : (
                        <div key={p.lichessId} className="border border-border rounded-sm p-3">
                          <div className="flex gap-3">
                            <div className="w-[65%] space-y-2 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-semibold">#{p.lichessId}</span>
                                  {p.rating && <span className="text-xs text-muted-foreground">★ {p.rating}</span>}
                                </div>
                                <button onClick={() => setBatchPreviews(prev => prev.map((x, j) => j === i ? { ...x, removed: true } : x))} className="text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Solution</Label>
                                <Input value={p.editSolution} onChange={e => setBatchPreviews(prev => prev.map((x, j) => j === i ? { ...x, editSolution: e.target.value } : x))} className="h-7 text-xs font-mono" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Hint</Label>
                                <Input value={p.editHint} onChange={e => setBatchPreviews(prev => prev.map((x, j) => j === i ? { ...x, editHint: e.target.value } : x))} placeholder="Optional" className="h-7 text-xs" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Themes</Label>
                                  <Input value={p.editThemes} onChange={e => setBatchPreviews(prev => prev.map((x, j) => j === i ? { ...x, editThemes: e.target.value } : x))} className="h-7 text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Plays as</Label>
                                  <div className="flex gap-1 h-7 items-center">
                                    {(['white', 'black'] as const).map(side => (
                                      <button key={side} onClick={() => setBatchPreviews(prev => prev.map((x, j) => j === i ? { ...x, editOrientation: side } : x))}
                                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${p.editOrientation === side ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground'}`}>
                                        {side.charAt(0).toUpperCase() + side.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="w-[35%] flex-shrink-0">
                              <Chessboard position={p.fen} boardOrientation={p.editOrientation} arePiecesDraggable={false} areArrowsAllowed={false} customBoardStyle={{ borderRadius: '4px' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky footer — always visible */}
            <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={closeImportModal}>Cancel</Button>
              {importTab === 'single' && (
                <Button size="sm" onClick={handleImportFromLichess} disabled={isImporting || !lichessUrl.trim()}>
                  {isImporting ? "Importing…" : "Import"}
                </Button>
              )}
              {importTab === 'batch' && batchPreviews.filter(p => !p.removed).length > 0 && (
                <Button size="sm" onClick={handleBatchImport}>
                  Add {batchPreviews.filter(p => !p.removed).length} puzzle{batchPreviews.filter(p => !p.removed).length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );

  // ── Study editor ───────────────────────────────────────────────────────────

  const renderStudyEditor = () => (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setIsLichessStudyImportOpen(true)}>
          <LichessKnightIcon size={16} /><span className="ml-1.5">Import Lichess study</span>
        </Button>
        <input type="file" accept=".pgn,.pgn.txt" ref={el => setFileInputEl(el)} onChange={handleFileUpload} className="hidden" />
        <Button variant="outline" size="sm" onClick={() => fileInputEl?.click()}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload PGN
        </Button>
      </div>

      <StudyEditorBoard
        chapters={chapters}
        selectedChapterIndex={selectedChapterIndex}
        onSelectChapter={setSelectedChapterIndex}
        onDeleteChapter={handleDeleteChapter}
        onRenameChapter={handleRenameChapter}
        chapterNameInput={chapterNameInput}
        setChapterNameInput={setChapterNameInput}
        chapterOrientation={chapterOrientation}
        setChapterOrientation={setChapterOrientation}
        pgnInput={pgnInput}
        setPgnInput={setPgnInput}
        onAddChapter={handleAddChapter}
        moveAnnotations={moveAnnotations}
        onAnnotationsChange={setMoveAnnotations}
      />

      {isCompleted && savedLessonId ? (
        <SuccessBanner lessonId={savedLessonId} label="Study lesson" mode={mode} onCreateAnother={handleCreateAnother} />
      ) : (
        <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleStudySubmit} />
      )}

      {isLichessStudyImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6 mx-4 space-y-4">
            <h2 className="text-base font-semibold">Import Lichess study</h2>
            <div className="space-y-1.5">
              <Label htmlFor="study-url" className="text-xs text-muted-foreground">Lichess study URL</Label>
              <Input id="study-url" value={lichessStudyUrl} onChange={e => setLichessStudyUrl(e.target.value)} placeholder="https://lichess.org/study/abc123" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsLichessStudyImportOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleImportFromLichessStudy} disabled={isLichessImporting || !lichessStudyUrl.trim()}>
                {isLichessImporting ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Interactive study editor ───────────────────────────────────────────────

  const renderInteractiveEditor = () => (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setIsLichessStudyImportOpen(true)}>
          <LichessKnightIcon size={16} /><span className="ml-1.5">Import Lichess study</span>
        </Button>
        <input type="file" accept=".pgn,.pgn.txt" ref={el => setFileInputEl(el)} onChange={handleFileUpload} className="hidden" />
        <Button variant="outline" size="sm" onClick={() => fileInputEl?.click()}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload PGN
        </Button>
      </div>

      <InteractiveStudyEditorBoard
        chapters={chapters}
        selectedChapterIndex={selectedChapterIndex}
        onSelectChapter={setSelectedChapterIndex}
        onDeleteChapter={handleDeleteChapter}
        onRenameChapter={handleRenameChapter}
        chapterNameInput={chapterNameInput}
        setChapterNameInput={setChapterNameInput}
        chapterOrientation={chapterOrientation}
        setChapterOrientation={setChapterOrientation}
        pgnInput={pgnInput}
        setPgnInput={setPgnInput}
        onAddChapter={handleAddChapter}
        moveAnnotations={moveAnnotations}
        onAnnotationsChange={setMoveAnnotations}
        solveMovesByChapterId={interactiveSolveMoves}
        onSolveMovesByChapterIdChange={setInteractiveSolveMoves}
        onChapterPgnChange={(index, pgn) =>
          setChapters(prev => prev.map((ch, i) => i === index ? { ...ch, pgn } : ch))
        }
      />

      {isCompleted && savedLessonId ? (
        <SuccessBanner lessonId={savedLessonId} label="Interactive study" mode={mode} onCreateAnother={handleCreateAnother} />
      ) : (
        <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleInteractiveSubmit} />
      )}

      {isLichessStudyImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6 mx-4 space-y-4">
            <h2 className="text-base font-semibold">Import Lichess study</h2>
            <div className="space-y-1.5">
              <Label htmlFor="study-url-2" className="text-xs text-muted-foreground">Lichess study URL</Label>
              <Input id="study-url-2" value={lichessStudyUrl} onChange={e => setLichessStudyUrl(e.target.value)} placeholder="https://lichess.org/study/abc123" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsLichessStudyImportOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleImportFromLichessStudy} disabled={isLichessImporting || !lichessStudyUrl.trim()}>
                {isLichessImporting ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {!isEdit && (
        <LessonTypeSelectionModal
          open={showModal}
          initialType={selectedType || undefined}
          onSelect={handleTypeSelect}
        />
      )}

      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4 min-w-0">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {isEdit ? `Edit: ${editData?.lesson.title ?? 'Lesson'}` : 'Create lesson'}
          </h1>
          {selectedType && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground capitalize">
                {selectedType}
              </span>
              {!isEdit && (
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Change
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Lesson details — collapsible */}
        {selectedType && (
          <CollapsibleSection
            label="Lesson details"
            preview={lessonInfo.title || "Untitled lesson"}
            defaultOpen={isEdit}
          >
            <LessonInfoForm
              lessonInfo={lessonInfo}
              categories={categories}
              students={students}
              selectedStudentIds={selectedStudentIds}
              onToggleStudent={handleToggleStudent}
              tagInput={tagInput}
              setTagInput={setTagInput}
              onChange={info => setLessonInfo(prev => ({ ...prev, ...info }))}
              onTitleChange={handleTitleChange}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              readOnly={isEdit}
              coaches={isEdit && editData?.isAdmin ? editData.coaches : undefined}
              assignedTo={assignedTo}
              onAssignedToChange={isEdit && editData?.isAdmin ? setAssignedTo : undefined}
            />
          </CollapsibleSection>
        )}

        {/* Type-specific editor */}
        {selectedType === "puzzle"      && renderPuzzleEditor()}
        {selectedType === "study"       && renderStudyEditor()}
        {selectedType === "interactive" && renderInteractiveEditor()}
      </div>
    </>
  );
}

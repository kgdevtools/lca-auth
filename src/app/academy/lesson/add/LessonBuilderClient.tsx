"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LessonTypeSelectionModal, type LessonType } from "@/components/lessons/LessonTypeSelectionModal";
import { DEFAULT_TIMER, type TimerConfig } from "@/components/lessons/TimerConfigField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  X, Plus, RotateCcw,
  Check, Loader2, ArrowRight, Pencil, SlidersHorizontal,
} from "lucide-react";
import {
  createPuzzleLesson, createStudyLesson, createInteractiveStudyLesson,
  updatePuzzleLesson, updateStudyLesson, updateInteractiveStudyLesson,
  createMcqLesson, updateMcqLesson, createQaLesson, updateQaLesson,
  createPuzzleStormLesson, updatePuzzleStormLesson,
  createCombinedLesson, updateCombinedLesson, type CombinedBlockInput,
  fetchStudentsForAssignment,
} from "./actions";
import { PuzzleAuthoringPanel, type PuzzleData as AuthoredPuzzle } from "@/components/lessons/PuzzleAuthoringPanel";
import { fetchCategories } from "./categories";
import { parsePgn, parsePgnStudy } from "@/lib/pgnParser";
import { type StoredAnnotationSet } from "@/hooks/useBoardDecorations";
import StudyEditorBoard from "@/components/lessons/StudyEditorBoard";
import InteractiveStudyEditorBoard, { type SolvePoint } from "@/components/lessons/InteractiveStudyEditorBoard";
import McqEditorPanel, { type McqQuestionData } from "@/components/lessons/McqEditorPanel";
import QaEditorPanel, { type QaCardData } from "@/components/lessons/QaEditorPanel";
import { CombinedLessonCreator, type CombinedBlock } from "@/components/lessons/CombinedLessonCreator";
import type { StudyBlockData, InteractiveStudyBlockData, StudyChapterData } from "@/components/lessons/CombinedStudyBlockEditor";
import StudySettingsPanel from "@/components/lessons/StudySettingsPanel";
import type { LessonWithCategory, LessonBlock } from "@/repositories/lesson/lessonRepository";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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


const validTypes: LessonType[] = ["puzzle", "study", "interactive", "mcq", "qa", "puzzle_storm", "combined"];
const STORM_TIME_PRESETS = [
  { label: "Off (∞)", value: 0 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
] as const;

// Whole puzzle-SET countdown (one clock for the whole batch, not per-puzzle).
const PUZZLE_SET_TIME_PRESETS = [
  { label: "Off (∞)", value: 0 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
] as const;

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
  if (ct === 'mcq') return 'mcq';
  if (ct === 'qa') return 'qa';
  if (ct === 'puzzle_storm') return 'puzzle_storm';
  return 'puzzle';
}

function blocksToEditPuzzles(blocks: LessonBlock[]): AuthoredPuzzle[] {
  return blocks
    .filter(b => b.type === 'puzzle')
    .map(b => {
      const d = b.data as Record<string, any>;
      return {
        id: b.id,
        fen: String(d.fen ?? ''),
        solution: Array.isArray(d.solution) ? d.solution : String(d.solution ?? '').split(/\s+/).filter(Boolean),
        description: Array.isArray(d.themes) ? d.themes.join(', ') : String(d.themes ?? ''),
        hint: d.hint ? String(d.hint) : undefined,
        orientation: (d.orientation as 'white' | 'black') ?? 'white',
        rating: typeof d.rating === 'number' ? d.rating : undefined,
        timer: d.timer as TimerConfig | undefined,
        annotations: d.annotations as Record<string, StoredAnnotationSet> | undefined,
      };
    });
}

/** Reads a single study/interactive_study block's per-chapter `annotations`
 *  field back into the compound `${chapterIndex}:${ply}` key format the
 *  editor boards use — the inverse of parseStudyChapters' persistence in
 *  actions.ts. */
function chaptersDataToAnnotations(d: Record<string, any>): Map<string, StoredAnnotationSet> {
  const out = new Map<string, StoredAnnotationSet>();
  const chapters = d.chapters;
  if (!Array.isArray(chapters)) return out;
  chapters.forEach((c: any, index: number) => {
    const raw = c.annotations;
    if (raw && typeof raw === 'object') {
      for (const [ply, set] of Object.entries(raw)) out.set(`${index}:${ply}`, set as StoredAnnotationSet);
    }
  });
  return out;
}

/** Same lookup as blocksToEditChapters (either standalone type, at most one
 *  such block per lesson) — reads its saved decoration annotations back. */
function blocksToEditAnnotations(blocks: LessonBlock[]): Map<string, StoredAnnotationSet> {
  const block = blocks.find(b => b.type === 'study' || b.type === 'interactive_study');
  if (!block) return new Map();
  return chaptersDataToAnnotations(block.data as Record<string, any>);
}

/** Whole-set countdown, stored redundantly on every puzzle block's data
 *  (see createPuzzleLesson) — read it off whichever block has it. */
function blocksToEditPuzzleSetTimer(blocks: LessonBlock[]): number {
  const withTimer = blocks.find(b => b.type === 'puzzle' && typeof (b.data as Record<string, any>)?.puzzleSetTimer === 'number');
  return withTimer ? (withTimer.data as Record<string, any>).puzzleSetTimer : 0;
}

// Reads a saved combined lesson's heterogeneous blocks back into the
// creator's CombinedBlock[] shape — one case per supported type, mirroring
// combinedBlocksToLessonBlocks in actions.ts (the inverse of it).
/** Reads a saved study/interactive_study block's chapters back into
 *  StudyChapterData[] — same shape blocksToEditChapters already produces for
 *  the standalone types. Decoration annotations are hydrated separately, see
 *  chaptersDataToAnnotations. */
function blockToStudyChapters(d: Record<string, any>): StudyChapterData[] {
  const chapters = d.chapters;
  if (!Array.isArray(chapters)) return [];
  return chapters.map((c: any) => ({
    id: String(c.id ?? generateId()),
    name: String(c.name ?? 'Chapter'),
    pgn: String(c.pgn ?? c.fullPgn ?? ''),
    orientation: (c.orientation as 'white' | 'black') ?? 'white',
  }));
}

function blocksToEditCombined(blocks: LessonBlock[]): CombinedBlock[] {
  return blocks
    .filter(b => b.type === 'puzzle' || b.type === 'mcq' || b.type === 'qa' || b.type === 'study' || b.type === 'interactive_study')
    .map(b => {
      const d = b.data as Record<string, any>;
      if (b.type === 'puzzle') {
        return {
          id: b.id, type: 'puzzle' as const,
          puzzle: {
            id: b.id,
            fen: String(d.fen ?? ''),
            solution: Array.isArray(d.solution) ? d.solution : String(d.solution ?? '').split(/\s+/).filter(Boolean),
            description: Array.isArray(d.themes) ? d.themes.join(', ') : String(d.themes ?? ''),
            hint: d.hint ? String(d.hint) : undefined,
            orientation: (d.orientation as 'white' | 'black') ?? 'white',
            rating: typeof d.rating === 'number' ? d.rating : undefined,
            annotations: d.annotations as Record<string, StoredAnnotationSet> | undefined,
          },
        };
      }
      if (b.type === 'mcq') {
        return {
          id: b.id, type: 'mcq' as const,
          mcq: { id: b.id, question: String(d.question ?? ''), options: Array.isArray(d.options) ? d.options : [], explanation: d.explanation, media: d.media, timer: d.timer },
        };
      }
      if (b.type === 'qa') {
        return {
          id: b.id, type: 'qa' as const,
          qa: { id: b.id, question: String(d.question ?? ''), answer: String(d.answer ?? ''), media: d.media, timer: d.timer },
        };
      }
      const studyChapters = blockToStudyChapters(d);
      const displaySettings = d.displaySettings
        ? { showEval: !!d.displaySettings.showEval, showClocks: !!d.displaySettings.showClocks, showArrows: !!d.displaySettings.showArrows, showHighlights: !!d.displaySettings.showHighlights }
        : { showEval: true, showClocks: true, showArrows: true, showHighlights: true };
      const timer = readTimer(d) ?? DEFAULT_TIMER;
      if (b.type === 'study') {
        return {
          id: b.id, type: 'study' as const,
          study: { chapters: studyChapters, displaySettings, timer, annotations: chaptersDataToAnnotations(d) } satisfies StudyBlockData,
        };
      }
      const solveMovesByChapterId: Record<string, any> = {};
      for (const c of Array.isArray(d.chapters) ? d.chapters : []) {
        if (Array.isArray(c.solveMoves) && c.solveMoves.length > 0) solveMovesByChapterId[String(c.id)] = c.solveMoves;
      }
      return {
        id: b.id, type: 'interactive_study' as const,
        interactiveStudy: { chapters: studyChapters, displaySettings, timer, annotations: chaptersDataToAnnotations(d), solveMovesByChapterId } satisfies InteractiveStudyBlockData,
      };
    });
}

function blocksToEditStorm(blocks: LessonBlock[]): { puzzles: AuthoredPuzzle[]; timeLimit: number } {
  const block = blocks.find(b => b.type === 'puzzle_storm');
  if (!block) return { puzzles: [], timeLimit: 180 };
  const d = block.data as Record<string, any>;
  const rawPuzzles = Array.isArray(d.puzzles) ? d.puzzles : [];
  const puzzles: AuthoredPuzzle[] = rawPuzzles.map((p: any) => ({
    id: generateId(),
    fen: String(p.fen ?? ''),
    solution: Array.isArray(p.solution) ? p.solution : [],
    description: Array.isArray(p.themes) ? p.themes.join(', ') : '',
    themes: Array.isArray(p.themes) ? p.themes : undefined,
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    orientation: (p.orientation as 'white' | 'black') ?? 'white',
  }));
  return { puzzles, timeLimit: typeof d.timeLimit === 'number' ? d.timeLimit : 180 };
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

function readTimer(d: Record<string, any>): TimerConfig | undefined {
  const t = d.timer;
  if (!t || typeof t !== 'object' || !t.enabled) return undefined;
  return { enabled: true, seconds: Number(t.seconds) || DEFAULT_TIMER.seconds };
}

function blocksToEditMcq(blocks: LessonBlock[]): McqQuestionData[] {
  return blocks
    .filter(b => b.type === 'mcq')
    .map(b => {
      const d = b.data as Record<string, any>;
      return {
        id: b.id,
        question: String(d.question ?? ''),
        options: Array.isArray(d.options) ? d.options.map((o: any) => ({
          id: String(o.id ?? generateId()), text: String(o.text ?? ''), isCorrect: !!o.isCorrect,
        })) : [],
        explanation: d.explanation ? String(d.explanation) : undefined,
        media: d.media,
        timer: readTimer(d),
      };
    });
}

function blocksToEditQa(blocks: LessonBlock[]): QaCardData[] {
  return blocks
    .filter(b => b.type === 'qa')
    .map(b => {
      const d = b.data as Record<string, any>;
      return {
        id: b.id,
        question: String(d.question ?? ''),
        answer: String(d.answer ?? ''),
        media: d.media,
        timer: readTimer(d),
      };
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  lessonInfo: { title: string; slug: string; description: string; categoryId: string; difficulty: string; estimatedDurationMinutes: string; tags: string[]; published: boolean };
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

      {/* Published */}
      <div className="space-y-1.5">
        <Label htmlFor="published" className="text-xs text-muted-foreground">Visibility</Label>
        <div className="flex items-center gap-2 h-9">
          <Switch id="published" checked={lessonInfo.published} onCheckedChange={v => onChange({ published: v })} />
          <span className="text-sm">{lessonInfo.published ? 'Published' : 'Draft'}</span>
        </div>
        {!lessonInfo.published && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            Draft lessons are invisible to assigned students until published.
          </p>
        )}
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
  const [isLessonDetailsOpen, setIsLessonDetailsOpen] = useState(false);

  // MCQ / Q&A state
  const [mcqQuestions, setMcqQuestions] = useState<McqQuestionData[]>(() =>
    isEdit && editData ? blocksToEditMcq(editData.lesson.blocks) : []
  );
  const [qaCards, setQaCards] = useState<QaCardData[]>(() =>
    isEdit && editData ? blocksToEditQa(editData.lesson.blocks) : []
  );

  // Puzzle state — PuzzleAuthoringPanel owns per-puzzle editing internally;
  // this file only holds the list + the Lichess single/batch import flow
  // (kept separate — a bulk review grid isn't a single-puzzle authoring UI).
  const [puzzles, setPuzzles] = useState<AuthoredPuzzle[]>(() =>
    isEdit && editData ? blocksToEditPuzzles(editData.lesson.blocks) : []
  );
  // Whole-set countdown for the "puzzle" lesson type — one clock for the
  // entire batch (replaces the old per-puzzle timer for this lesson type).
  const [puzzleSetTimeLimit, setPuzzleSetTimeLimit] = useState<number>(() =>
    isEdit && editData ? blocksToEditPuzzleSetTimer(editData.lesson.blocks) : 0
  );
  // Puzzle Storm state — shares the PuzzleAuthoringPanel core, adds a time limit
  const [stormPuzzles, setStormPuzzles] = useState<AuthoredPuzzle[]>(() =>
    isEdit && editData ? blocksToEditStorm(editData.lesson.blocks).puzzles : []
  );
  const [stormTimeLimit, setStormTimeLimit] = useState<number>(() =>
    isEdit && editData ? blocksToEditStorm(editData.lesson.blocks).timeLimit : 180
  );

  // Combined lesson state — reuses the puzzle set timer above (puzzleSetTimeLimit)
  const [combinedBlocks, setCombinedBlocks] = useState<CombinedBlock[]>(() =>
    isEdit && editData ? blocksToEditCombined(editData.lesson.blocks) : []
  );

  // Study state
  const [chapters, setChapters] = useState<StudyChapter[]>(() =>
    isEdit && editData ? blocksToEditChapters(editData.lesson.blocks) : []
  );
  const [chapterNameInput, setChapterNameInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
  const [chapterOrientation, setChapterOrientation] = useState<"white" | "black">("white");
  const [annotations, setAnnotations] = useState<Map<string, StoredAnnotationSet>>(() =>
    isEdit && editData ? blocksToEditAnnotations(editData.lesson.blocks) : new Map()
  );
  const [isLichessStudyImportOpen, setIsLichessStudyImportOpen] = useState(false);
  const [lichessStudyUrl, setLichessStudyUrl] = useState("");
  const [isLichessImporting, setIsLichessImporting] = useState(false);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);
  const [studyDisplaySettings, setStudyDisplaySettings] = useState(() => {
    if (isEdit && editData) {
      const block = editData.lesson.blocks.find(b => b.type === 'study' || b.type === 'interactive_study');
      const ds = (block?.data as Record<string, any> | undefined)?.displaySettings;
      if (ds) return { showEval: !!ds.showEval, showClocks: !!ds.showClocks, showArrows: !!ds.showArrows, showHighlights: !!ds.showHighlights };
    }
    return { showEval: true, showClocks: true, showArrows: true, showHighlights: true };
  });
  const [studyTimer, setStudyTimer] = useState<TimerConfig>(() => {
    if (isEdit && editData) {
      const block = editData.lesson.blocks.find(b => b.type === 'study' || b.type === 'interactive_study');
      const t = readTimer((block?.data as Record<string, any>) ?? {});
      if (t) return t;
    }
    return DEFAULT_TIMER;
  });

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
        published: l.published,
      };
    }
    return { title: '', slug: '', description: '', categoryId: '', difficulty: '', estimatedDurationMinutes: '', tags: [] as string[], published: true };
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
    setMcqQuestions([]); setQaCards([]);
    setPuzzles([]);
    setStormPuzzles([]); setStormTimeLimit(180);
    setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null);
    setStudyDisplaySettings({ showEval: true, showClocks: true, showArrows: true, showHighlights: true });
    setStudyTimer(DEFAULT_TIMER);
    setSelectedStudentIds([]);
    setLessonInfo({ title: "", slug: "", description: "", categoryId: "", difficulty: "", estimatedDurationMinutes: "", tags: [], published: true });
    setIsCompleted(false); setSavedLessonId(null); setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handlePuzzleSubmit = async () => {
    if (!validateLesson()) return;
    if (puzzles.length === 0) { alert("At least one puzzle is required"); return; }
    setIsSubmitting(true);
    const puzzlesPayload = puzzles.map(p => ({
      id: p.id,
      fen: p.fen,
      solution: p.solution.join(' '),
      description: p.description,
      hint: p.hint,
      orientation: p.orientation,
      rating: p.rating ?? null,
      timer: p.timer,
      annotations: p.annotations,
    }));
    try {
      if (isEdit && editData) {
        await updatePuzzleLesson(editData.lesson.id, lessonInfo, puzzlesPayload, selectedStudentIds, assignedTo || undefined, puzzleSetTimeLimit);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createPuzzleLesson(lessonInfo, puzzlesPayload, selectedStudentIds, puzzleSetTimeLimit);
        setSavedLessonId(id); setIsCompleted(true);
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleStormSubmit = async () => {
    if (!validateLesson()) return;
    if (stormPuzzles.length === 0) { alert("At least one puzzle is required"); return; }
    setIsSubmitting(true);
    // Puzzle Storm deliberately doesn't forward `annotations` — its own
    // persistence path (createPuzzleStormLesson/mapStormPuzzle) is out of
    // the decorations-engine rollout's scope, see .claude/plans/
    // glistening-stirring-locket.md.
    const puzzlesPayload = stormPuzzles.map(p => ({
      id: p.id,
      fen: p.fen,
      solution: p.solution.join(' '),
      description: p.description,
      orientation: p.orientation,
      rating: p.rating ?? null,
    }));
    try {
      if (isEdit && editData) {
        await updatePuzzleStormLesson(editData.lesson.id, lessonInfo, puzzlesPayload, stormTimeLimit, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createPuzzleStormLesson(lessonInfo, puzzlesPayload, stormTimeLimit, selectedStudentIds);
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
        await updateStudyLesson(editData.lesson.id, lessonInfo, chapters, studyDisplaySettings, studyTimer, annotations, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createStudyLesson(lessonInfo, chapters, studyDisplaySettings, studyTimer, annotations, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null); setAnnotations(new Map());
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
        await updateInteractiveStudyLesson(editData.lesson.id, lessonInfo, chapters, studyDisplaySettings, studyTimer, interactiveSolveMoves, annotations, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createInteractiveStudyLesson(lessonInfo, chapters, studyDisplaySettings, studyTimer, interactiveSolveMoves, annotations, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setChapters([]); setChapterNameInput(""); setPgnInput(""); setSelectedChapterIndex(null);
        setAnnotations(new Map()); setInteractiveSolveMoves({});
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleMcqSubmit = async () => {
    if (!validateLesson()) return;
    if (mcqQuestions.length === 0) { alert("Please add at least one question"); return; }
    setIsSubmitting(true);
    try {
      if (isEdit && editData) {
        await updateMcqLesson(editData.lesson.id, lessonInfo, mcqQuestions, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createMcqLesson(lessonInfo, mcqQuestions, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setMcqQuestions([]);
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleQaSubmit = async () => {
    if (!validateLesson()) return;
    if (qaCards.length === 0) { alert("Please add at least one flashcard"); return; }
    setIsSubmitting(true);
    try {
      if (isEdit && editData) {
        await updateQaLesson(editData.lesson.id, lessonInfo, qaCards, selectedStudentIds, assignedTo || undefined);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createQaLesson(lessonInfo, qaCards, selectedStudentIds);
        setSavedLessonId(id); setIsCompleted(true);
        setQaCards([]);
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const handleCombinedSubmit = async () => {
    if (!validateLesson()) return;
    if (combinedBlocks.length === 0) { alert("Please add at least one block"); return; }
    setIsSubmitting(true);
    const blocksPayload: CombinedBlockInput[] = combinedBlocks.map(b =>
      b.type === "puzzle"
        ? { type: "puzzle" as const, puzzle: b.puzzle! }
        : b.type === "mcq"
          ? { type: "mcq" as const, mcq: b.mcq! }
          : b.type === "qa"
            ? { type: "qa" as const, qa: b.qa! }
            : b.type === "study"
              ? { type: "study" as const, study: b.study! }
              : { type: "interactive_study" as const, interactiveStudy: b.interactiveStudy! }
    );
    try {
      if (isEdit && editData) {
        await updateCombinedLesson(editData.lesson.id, lessonInfo, blocksPayload, selectedStudentIds, assignedTo || undefined, puzzleSetTimeLimit);
        setSavedLessonId(editData.lesson.id); setIsCompleted(true);
      } else {
        const id = await createCombinedLesson(lessonInfo, blocksPayload, selectedStudentIds, puzzleSetTimeLimit);
        setSavedLessonId(id); setIsCompleted(true);
        setCombinedBlocks([]);
      }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to save lesson"); }
    finally { setIsSubmitting(false); }
  };

  const submitLabel = isEdit ? "Save changes" : "Create lesson";

  // ── Puzzle editor ──────────────────────────────────────────────────────────

  const renderPuzzleEditor = () => (
    <div className="space-y-4">
      {/* Lichess import now lives inside the panel itself: batch fetch on the
          Puzzles tab, single-URL import on the Edit tab (opened via + New puzzle).
          showTimer=false: this lesson type now uses one whole-set countdown (Lesson
          details → Puzzle set timer) instead of a per-puzzle timer. */}
      <PuzzleAuthoringPanel puzzles={puzzles} onPuzzlesChange={setPuzzles} showTimer={false} />

      {puzzles.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          {isCompleted && savedLessonId ? (
            <SuccessBanner lessonId={savedLessonId} label="Puzzle lesson" mode={mode} onCreateAnother={handleCreateAnother} />
          ) : (
            <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handlePuzzleSubmit} />
          )}
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
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
        onChapterPgnChange={(index, pgn) =>
          setChapters(prev => prev.map((ch, i) => i === index ? { ...ch, pgn } : ch))
        }
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
      <input type="file" accept=".pgn,.pgn.txt" ref={el => setFileInputEl(el)} onChange={handleFileUpload} className="hidden" />

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
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
        solveMovesByChapterId={interactiveSolveMoves}
        onSolveMovesByChapterIdChange={setInteractiveSolveMoves}
        onChapterPgnChange={(index, pgn) =>
          setChapters(prev => prev.map((ch, i) => i === index ? { ...ch, pgn } : ch))
        }
        onOpenLichessImport={() => setIsLichessStudyImportOpen(true)}
        onUploadPgnClick={() => fileInputEl?.click()}
        onSubmit={handleInteractiveSubmit}
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        isCompleted={isCompleted}
        savedLessonId={savedLessonId}
        mode={mode}
        onCreateAnother={handleCreateAnother}
      />

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

  // ── MCQ editor ─────────────────────────────────────────────────────────────

  const renderMcqEditor = () => (
    <div className="space-y-4">
      <McqEditorPanel questions={mcqQuestions} onChange={setMcqQuestions} />
      {mcqQuestions.length > 0 && (
        isCompleted && savedLessonId ? (
          <SuccessBanner lessonId={savedLessonId} label="Multiple choice lesson" mode={mode} onCreateAnother={handleCreateAnother} />
        ) : (
          <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleMcqSubmit} />
        )
      )}
    </div>
  );

  // ── Q&A editor ─────────────────────────────────────────────────────────────

  const renderQaEditor = () => (
    <div className="space-y-4">
      <QaEditorPanel cards={qaCards} onChange={setQaCards} />
      {qaCards.length > 0 && (
        isCompleted && savedLessonId ? (
          <SuccessBanner lessonId={savedLessonId} label="Q&A lesson" mode={mode} onCreateAnother={handleCreateAnother} />
        ) : (
          <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleQaSubmit} />
        )
      )}
    </div>
  );

  // ── Combined lesson editor ────────────────────────────────────────────────────
  // A coach-ordered sequence mixing puzzle/mcq/qa blocks — each authored with
  // its own existing editor (CombinedLessonCreator bridges each to a single
  // sequence slot). See .claude/plans/combined-lesson-creator.md.

  const renderCombinedEditor = () => (
    <div className="space-y-4">
      <CombinedLessonCreator blocks={combinedBlocks} onBlocksChange={setCombinedBlocks} />
      {combinedBlocks.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          {isCompleted && savedLessonId ? (
            <SuccessBanner lessonId={savedLessonId} label="Combined lesson" mode={mode} onCreateAnother={handleCreateAnother} />
          ) : (
            <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleCombinedSubmit} />
          )}
        </div>
      )}
    </div>
  );

  // ── Puzzle Storm editor ──────────────────────────────────────────────────────
  // Same authoring core as the puzzle block editor — the only addition is the
  // shared countdown, packaged into one `puzzle_storm` block on submit.

  const renderStormEditor = () => (
    <div className="space-y-4">
      <PuzzleAuthoringPanel puzzles={stormPuzzles} onPuzzlesChange={setStormPuzzles} showTimer={false} />

      {stormPuzzles.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          {isCompleted && savedLessonId ? (
            <SuccessBanner lessonId={savedLessonId} label="Puzzle Storm lesson" mode={mode} onCreateAnother={handleCreateAnother} />
          ) : (
            <SubmitButton isSubmitting={isSubmitting} label={submitLabel} onClick={handleStormSubmit} />
          )}
        </div>
      )}
    </div>
  );

  const isDetailsIncomplete = !lessonInfo.title.trim() || !lessonInfo.slug.trim();

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
              {(selectedType === "study" || selectedType === "interactive") && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs" title="Display settings">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80">
                    <StudySettingsPanel
                      displaySettings={studyDisplaySettings}
                      onDisplaySettingsChange={setStudyDisplaySettings}
                      timer={studyTimer}
                      onTimerChange={setStudyTimer}
                    />
                  </PopoverContent>
                </Popover>
              )}
              {!isEdit && (
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Change
                </Button>
              )}
              <Button
                variant={isDetailsIncomplete ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLessonDetailsOpen(true)}
                className={cn(
                  "text-xs gap-1.5",
                  isDetailsIncomplete && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 animate-bounce"
                )}
              >
                {isDetailsIncomplete ? <Pencil className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {isDetailsIncomplete ? "Add lesson details" : "Lesson details"}
              </Button>
            </div>
          )}
        </div>

        <Dialog open={isLessonDetailsOpen} onOpenChange={setIsLessonDetailsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lesson details</DialogTitle>
            </DialogHeader>
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
            {selectedType === "puzzle_storm" && (
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time limit</p>
                <div className="flex flex-wrap gap-1.5">
                  {STORM_TIME_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setStormTimeLimit(preset.value)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-sm border transition-colors',
                        stormTimeLimit === preset.value
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(selectedType === "puzzle" || selectedType === "combined") && (
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Puzzle set timer</p>
                <p className="text-[11px] text-muted-foreground">
                  One countdown for the whole set — not per puzzle. When it hits 0, the
                  session ends; only puzzles already solved keep their points/rating.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PUZZLE_SET_TIME_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setPuzzleSetTimeLimit(preset.value)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-sm border transition-colors',
                        puzzleSetTimeLimit === preset.value
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Type-specific editor */}
        {selectedType === "puzzle"      && renderPuzzleEditor()}
        {selectedType === "study"       && renderStudyEditor()}
        {selectedType === "interactive" && renderInteractiveEditor()}
        {selectedType === "mcq"         && renderMcqEditor()}
        {selectedType === "qa"          && renderQaEditor()}
        {selectedType === "puzzle_storm" && renderStormEditor()}
        {selectedType === "combined"     && renderCombinedEditor()}
      </div>
    </>
  );
}

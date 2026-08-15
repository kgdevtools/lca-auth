"use client";

// Study / Interactive Study block editor for the Combined Lesson Creator —
// wraps the same StudyEditorBoard / InteractiveStudyEditorBoard used by the
// standalone lesson builder. Those boards are already `value`/`onChange`-ish
// for their persisted data (chapters, annotations); the ~4 remaining props
// they take (chapterNameInput, pgnInput, selectedChapterIndex,
// chapterOrientation) are transient "in-progress new chapter" form fields,
// not part of the saved block — so this wrapper owns those locally and is
// given `key={block.id}` by the caller, which resets them cleanly whenever
// the coach switches to a different block in the filmstrip.

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, SlidersHorizontal } from "lucide-react";
import StudyEditorBoard from "./StudyEditorBoard";
import InteractiveStudyEditorBoard, { type SolvePoint } from "./InteractiveStudyEditorBoard";
import StudySettingsPanel, { type StudyDisplaySettings } from "./StudySettingsPanel";
import { DEFAULT_TIMER, type TimerConfig } from "./TimerConfigField";
import { parsePgn, parsePgnStudy } from "@/lib/pgnParser";
import { type StoredAnnotationSet } from "@/hooks/useBoardDecorations";

export interface StudyChapterData {
  id: string;
  name: string;
  pgn: string;
  orientation: "white" | "black";
}

export interface StudyBlockData {
  chapters: StudyChapterData[];
  displaySettings: StudyDisplaySettings;
  timer: TimerConfig;
  annotations: Map<string, StoredAnnotationSet>;
}

export interface InteractiveStudyBlockData extends StudyBlockData {
  solveMovesByChapterId: Record<string, SolvePoint[]>;
}

const DEFAULT_DISPLAY_SETTINGS: StudyDisplaySettings = {
  showEval: true, showClocks: true, showArrows: true, showHighlights: true,
};

export function emptyStudyBlock(): StudyBlockData {
  return { chapters: [], displaySettings: DEFAULT_DISPLAY_SETTINGS, timer: DEFAULT_TIMER, annotations: new Map() };
}

export function emptyInteractiveStudyBlock(): InteractiveStudyBlockData {
  return { ...emptyStudyBlock(), solveMovesByChapterId: {} };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

interface CombinedStudyBlockEditorProps {
  variant: "study" | "interactive_study";
  value: StudyBlockData | InteractiveStudyBlockData;
  onChange: (next: StudyBlockData | InteractiveStudyBlockData) => void;
}

export function CombinedStudyBlockEditor({ variant, value, onChange }: CombinedStudyBlockEditorProps) {
  const { chapters } = value;
  const [chapterNameInput, setChapterNameInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
  const [chapterOrientation, setChapterOrientation] = useState<"white" | "black">("white");
  const [isLichessImportOpen, setIsLichessImportOpen] = useState(false);
  const [lichessUrl, setLichessUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setChapters = (next: StudyChapterData[]) => onChange({ ...value, chapters: next });

  const handleDeleteChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index));
    setSelectedChapterIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleRenameChapter = (index: number, name: string) => {
    if (!name.trim()) return;
    setChapters(chapters.map((c, i) => i === index ? { ...c, name: name.trim() } : c));
  };

  const handleAddChapter = () => {
    if (!pgnInput.trim() || !chapterNameInput.trim()) return;
    const newIndex = chapters.length;
    setChapters([...chapters, { id: generateId(), name: chapterNameInput.trim(), pgn: pgnInput.trim(), orientation: chapterOrientation }]);
    setSelectedChapterIndex(newIndex); setChapterNameInput(""); setPgnInput("");
  };

  const onChapterPgnChange = (index: number, pgn: string) =>
    setChapters(chapters.map((c, i) => i === index ? { ...c, pgn } : c));

  const onAnnotationsChange = (next: Map<string, StoredAnnotationSet>) => onChange({ ...value, annotations: next });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (!content) return;
      const parsed = parsePgnStudy(content);
      if (parsed.chapters.length > 0) {
        setChapters([...chapters, ...parsed.chapters.map((c, i) => {
          const h = c.headers || {};
          const name = h.ChapterName || (h.White && h.Black ? `${h.White} – ${h.Black}` : null) || h.Event || `Game ${chapters.length + i + 1}`;
          return { id: generateId(), name, pgn: c.fullPgn, orientation: "white" as const };
        })]);
      } else {
        const single = parsePgn(content);
        if (single.moves.length > 0) {
          const h = single.headers;
          const name = h.ChapterName || (h.White && h.Black ? `${h.White} – ${h.Black}` : null) || h.Event || `Chapter ${chapters.length + 1}`;
          setChapters([...chapters, { id: generateId(), name, pgn: content, orientation: "white" }]);
        } else { setPgnInput(content); }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportFromLichessStudy = async () => {
    if (!lichessUrl.trim()) return;
    setIsImporting(true);
    try {
      const match = lichessUrl.match(/lichess\.org\/study\/([a-zA-Z0-9]+)/);
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
        setChapters([...chapters, ...data.chapters.map((c: any, i: number) => ({
          id: generateId(), name: c.name || `Chapter ${i + 1}`, pgn: c.pgn || "", orientation: c.orientation || "white",
        }))]);
      } else {
        alert("The study imported successfully but contained no chapters.");
      }
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "Network error — check your connection."}`);
    } finally {
      setIsImporting(false);
      setIsLichessImportOpen(false);
      setLichessUrl("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {variant === "study" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsLichessImportOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Import Lichess study
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Upload PGN
              </Button>
            </>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Display settings">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <StudySettingsPanel
              displaySettings={value.displaySettings}
              onDisplaySettingsChange={next => onChange({ ...value, displaySettings: next })}
              timer={value.timer}
              onTimerChange={next => onChange({ ...value, timer: next })}
            />
          </PopoverContent>
        </Popover>
      </div>

      <input type="file" accept=".pgn,.pgn.txt" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {variant === "study" ? (
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
          annotations={value.annotations}
          onAnnotationsChange={onAnnotationsChange}
          onChapterPgnChange={onChapterPgnChange}
        />
      ) : (
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
          annotations={value.annotations}
          onAnnotationsChange={onAnnotationsChange}
          solveMovesByChapterId={(value as InteractiveStudyBlockData).solveMovesByChapterId}
          onSolveMovesByChapterIdChange={next => onChange({ ...value, solveMovesByChapterId: next } as InteractiveStudyBlockData)}
          onChapterPgnChange={onChapterPgnChange}
          onOpenLichessImport={() => setIsLichessImportOpen(true)}
          onUploadPgnClick={() => fileInputRef.current?.click()}
        />
      )}

      {isLichessImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6 mx-4 space-y-4">
            <h2 className="text-base font-semibold">Import Lichess study</h2>
            <div className="space-y-1.5">
              <Label htmlFor="combined-study-url" className="text-xs text-muted-foreground">Lichess study URL</Label>
              <Input id="combined-study-url" value={lichessUrl} onChange={e => setLichessUrl(e.target.value)} placeholder="https://lichess.org/study/abc123" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsLichessImportOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleImportFromLichessStudy} disabled={isImporting || !lichessUrl.trim()}>
                {isImporting ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

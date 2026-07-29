"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, CircleDot, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimerConfigField, DEFAULT_TIMER, type TimerConfig } from "./TimerConfigField";
import { MediaConfigField } from "./MediaConfigField";
import type { BlockMedia } from "@/components/BlockMediaPreview";

export interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface McqQuestionData {
  id: string;
  question: string;
  options: McqOption[];
  explanation?: string;
  media?: BlockMedia;
  timer?: TimerConfig;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function emptyOptions(): McqOption[] {
  return [
    { id: generateId(), text: "", isCorrect: true },
    { id: generateId(), text: "", isCorrect: false },
  ];
}

interface McqEditorPanelProps {
  questions: McqQuestionData[];
  onChange: (next: McqQuestionData[]) => void;
}

export default function McqEditorPanel({ questions, onChange }: McqEditorPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<McqOption[]>(emptyOptions());
  const [explanation, setExplanation] = useState("");
  const [media, setMedia] = useState<BlockMedia | undefined>(undefined);
  const [timer, setTimer] = useState<TimerConfig>(DEFAULT_TIMER);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setOptions(emptyOptions());
    setExplanation("");
    setMedia(undefined);
    setTimer(DEFAULT_TIMER);
  };

  const canSave = question.trim().length > 0
    && options.length >= MIN_OPTIONS
    && options.every(o => o.text.trim().length > 0)
    && options.some(o => o.isCorrect);

  const handleSave = () => {
    if (!canSave) return;
    const entry: McqQuestionData = {
      id: editingId ?? generateId(),
      question: question.trim(),
      options: options.map(o => ({ ...o, text: o.text.trim() })),
      explanation: explanation.trim() || undefined,
      media,
      timer: timer.enabled ? timer : undefined,
    };
    if (editingId) {
      onChange(questions.map(q => (q.id === editingId ? entry : q)));
    } else {
      onChange([...questions, entry]);
    }
    resetForm();
  };

  const handleEdit = (q: McqQuestionData) => {
    setEditingId(q.id);
    setQuestion(q.question);
    setOptions(q.options.length ? q.options : emptyOptions());
    setExplanation(q.explanation ?? "");
    setMedia(q.media);
    setTimer(q.timer ?? DEFAULT_TIMER);
  };

  const handleDelete = (id: string) => {
    if (editingId === id) resetForm();
    onChange(questions.filter(q => q.id !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {editingId ? "Edit question" : "New question"}
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="mcq-question" className="text-xs text-muted-foreground">Question</Label>
          <Textarea
            id="mcq-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. Which piece can only move diagonally?"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Options — select the correct one</Label>
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => setOptions(prev => [...prev, { id: generateId(), text: "", isCorrect: false }])}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add option
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOptions(prev => prev.map((o, j) => ({ ...o, isCorrect: j === i })))}
                  title="Mark as correct"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {opt.isCorrect ? <CircleDot className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4" />}
                </button>
                <Input
                  value={opt.text}
                  onChange={e => setOptions(prev => prev.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 h-8 text-sm"
                />
                {options.length > MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                    className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mcq-explanation" className="text-xs text-muted-foreground">Explanation (optional)</Label>
          <Textarea
            id="mcq-explanation"
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Shown after a correct answer — reinforces why it's right"
            rows={2}
            className="resize-none"
          />
        </div>

        <MediaConfigField value={media} onChange={setMedia} />
        <TimerConfigField value={timer} onChange={setTimer} />

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!canSave} className="flex-1">
            {editingId ? <><Check className="w-4 h-4 mr-2" />Save changes</> : <><Plus className="w-4 h-4 mr-2" />Add question</>}
          </Button>
          {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Questions ({questions.length})</p>
          </div>
          <div className="divide-y divide-border">
            {questions.map((q, index) => (
              <div key={q.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", editingId === q.id && "bg-primary/5 border-l-2 border-primary")}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(index, -1)} disabled={index === 0} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => move(index, 1)} disabled={index === questions.length - 1} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">#{index + 1}{q.timer?.enabled ? ` · ${q.timer.seconds}s` : ""}</p>
                  <p className="text-sm truncate">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{q.options.length} options · correct: {q.options.find(o => o.isCorrect)?.text || "—"}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(q)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

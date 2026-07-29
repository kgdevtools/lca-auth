"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimerConfigField, DEFAULT_TIMER, type TimerConfig } from "./TimerConfigField";
import { MediaConfigField } from "./MediaConfigField";
import type { BlockMedia } from "@/components/BlockMediaPreview";

export interface QaCardData {
  id: string;
  question: string;
  answer: string;
  media?: BlockMedia;
  timer?: TimerConfig;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

interface QaEditorPanelProps {
  cards: QaCardData[];
  onChange: (next: QaCardData[]) => void;
}

export default function QaEditorPanel({ cards, onChange }: QaEditorPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [media, setMedia] = useState<BlockMedia | undefined>(undefined);
  const [timer, setTimer] = useState<TimerConfig>(DEFAULT_TIMER);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setMedia(undefined);
    setTimer(DEFAULT_TIMER);
  };

  const canSave = question.trim().length > 0 && answer.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const entry: QaCardData = {
      id: editingId ?? generateId(),
      question: question.trim(),
      answer: answer.trim(),
      media,
      timer: timer.enabled ? timer : undefined,
    };
    if (editingId) {
      onChange(cards.map(c => (c.id === editingId ? entry : c)));
    } else {
      onChange([...cards, entry]);
    }
    resetForm();
  };

  const handleEdit = (c: QaCardData) => {
    setEditingId(c.id);
    setQuestion(c.question);
    setAnswer(c.answer);
    setMedia(c.media);
    setTimer(c.timer ?? DEFAULT_TIMER);
  };

  const handleDelete = (id: string) => {
    if (editingId === id) resetForm();
    onChange(cards.filter(c => c.id !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {editingId ? "Edit flashcard" : "New flashcard"}
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="qa-question" className="text-xs text-muted-foreground">Question</Label>
          <Textarea
            id="qa-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. What is the term for a pawn on an open file with no opposing pawn to block or capture it?"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qa-answer" className="text-xs text-muted-foreground">Answer</Label>
          <Textarea
            id="qa-answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="e.g. Passed pawn"
            rows={2}
            className="resize-none"
          />
          <p className="text-[10px] text-muted-foreground">Graded with fuzzy matching — small typos and phrasing differences still count.</p>
        </div>

        <MediaConfigField value={media} onChange={setMedia} />
        <TimerConfigField value={timer} onChange={setTimer} />

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!canSave} className="flex-1">
            {editingId ? <><Check className="w-4 h-4 mr-2" />Save changes</> : <><Plus className="w-4 h-4 mr-2" />Add flashcard</>}
          </Button>
          {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flashcards ({cards.length})</p>
          </div>
          <div className="divide-y divide-border">
            {cards.map((c, index) => (
              <div key={c.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", editingId === c.id && "bg-primary/5 border-l-2 border-primary")}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(index, -1)} disabled={index === 0} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => move(index, 1)} disabled={index === cards.length - 1} className="p-0.5 hover:bg-muted rounded disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">#{index + 1}{c.timer?.enabled ? ` · ${c.timer.seconds}s` : ""}</p>
                  <p className="text-sm truncate">{c.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Answer: {c.answer}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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

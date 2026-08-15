"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LessonType = "puzzle" | "study" | "interactive" | "mcq" | "qa" | "puzzle_storm" | "combined";

const DISABLED_TYPES: LessonType[] = [];

interface LessonTypeSelectionModalProps {
  open: boolean;
  initialType?: LessonType;
  onSelect: (type: LessonType) => void;
}

const lessonTypes: Array<{
  id: LessonType;
  label: string;
  icon: string;
  tagline: string;
  features: string[];
}> = [
  {
    id: "puzzle",
    label: "Puzzle",
    icon: "♟",
    tagline: "Tactical positions for students to solve",
    features: ["Import from Lichess", "Manual board editor", "Track attempts", "Timer & feedback"],
  },
  {
    id: "study",
    label: "Study",
    icon: "",
    tagline: "Annotated game or position with move-by-move analysis",
    features: ["Import Lichess study or PGN", "Arrow & highlight annotations", "Chapter structure", "Clock & eval display"],
  },
  {
    id: "interactive",
    label: "Interactive",
    icon: "⚡",
    tagline: "Hybrid combining study content with embedded exercises",
    features: ["All Study features", "Embedded puzzles", "MCQ & Q&A blocks", "Structured progression"],
  },
  {
    id: "mcq",
    label: "Multiple Choice",
    icon: "☑",
    tagline: "Quiz-style questions with one correct answer each",
    features: ["2-6 options per question", "Optional explanation", "Image or board media", "Timer per question"],
  },
  {
    id: "qa",
    label: "Q&A Flashcards",
    icon: "❓",
    tagline: "Short-answer flashcards, graded with fuzzy matching",
    features: ["Free-text answers", "Typo-tolerant grading", "Image or board media", "Timer per card"],
  },
  {
    id: "puzzle_storm",
    label: "Puzzle Storm",
    icon: "⚡",
    tagline: "Timed tactical challenge — solve as many puzzles as you can before the clock runs out",
    features: ["Lichess-style storm", "Configurable time limit", "Score & accuracy tracking", "Personal best"],
  },
  {
    id: "combined",
    label: "Combined",
    icon: "🧱",
    tagline: "Mix puzzle, MCQ and Q&A blocks in one coach-ordered sequence",
    features: ["Any order, any mix", "Each block's own editor", "Puzzle set timer included", "Reorder freely"],
  },
];

export function LessonTypeSelectionModal({
  open,
  initialType,
  onSelect,
}: LessonTypeSelectionModalProps) {
  const [selected, setSelected] = useState<LessonType | null>(
    initialType && !DISABLED_TYPES.includes(initialType) ? initialType : null
  );

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-3xl [&>div]:rounded-md">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl font-semibold">New lesson</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose a lesson format to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1">
          {lessonTypes.map(type => {
            const isDisabled = DISABLED_TYPES.includes(type.id);
            const isSelected = selected === type.id;
            return (
              <button
                key={type.id}
                onClick={() => !isDisabled && setSelected(type.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full text-left rounded-sm border px-3.5 py-3 transition-all relative",
                  isDisabled
                    ? "opacity-40 cursor-not-allowed border-border"
                    : isSelected
                      ? "border-foreground bg-foreground/5 border-l-2"
                      : "border-border hover:border-foreground/30 hover:bg-muted/40"
                )}
              >
                {isDisabled && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-medium text-muted-foreground border border-border rounded-sm px-1.5 py-0.5">
                    Coming soon
                  </span>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      {type.icon && <span className="text-base leading-none">{type.icon}</span>}
                      {type.label}
                    </p>
                    <p className="text-xs text-foreground/60 mt-0.5 leading-relaxed">
                      {type.tagline}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {type.features.map(f => (
                        <span
                          key={f}
                          className="text-[10px] px-2 py-0.5 rounded-sm border border-border text-muted-foreground font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!isDisabled && (
                    <div className={cn(
                      "flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-foreground bg-foreground"
                        : "border-border"
                    )} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="min-w-[120px]"
          >
            Continue →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

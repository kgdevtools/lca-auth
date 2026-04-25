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

export type LessonType = "puzzle" | "study" | "interactive";

interface LessonTypeSelectionModalProps {
  open: boolean;
  initialType?: LessonType;
  onSelect: (type: LessonType) => void;
}

const lessonTypes: Array<{
  id: LessonType;
  label: string;
  tagline: string;
  features: string[];
}> = [
  {
    id: "puzzle",
    label: "Puzzle",
    tagline: "Tactical positions for students to solve",
    features: ["Import from Lichess", "Manual board editor", "Track attempts", "Timer & feedback"],
  },
  {
    id: "study",
    label: "Study",
    tagline: "Annotated game or position with move-by-move analysis",
    features: ["Import Lichess study or PGN", "Arrow & highlight annotations", "Chapter structure", "Clock & eval display"],
  },
  {
    id: "interactive",
    label: "Interactive",
    tagline: "Hybrid combining study content with embedded exercises",
    features: ["All Study features", "Embedded puzzles", "MCQ & Q&A blocks", "Structured progression"],
  },
];

export function LessonTypeSelectionModal({
  open,
  initialType,
  onSelect,
}: LessonTypeSelectionModalProps) {
  const [selected, setSelected] = useState<LessonType | null>(initialType ?? null);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold">New lesson</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose a lesson format to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {lessonTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3.5 transition-all",
                selected === type.id
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{type.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {type.tagline}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {type.features.map(f => (
                      <span
                        key={f}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Selection indicator */}
                <div className={cn(
                  "flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 transition-all",
                  selected === type.id
                    ? "border-foreground bg-foreground"
                    : "border-border"
                )} />
              </div>
            </button>
          ))}
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

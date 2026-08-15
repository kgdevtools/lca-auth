'use client'

// Combined Lesson creator — a coach-ordered sequence of blocks, each authored
// with its own existing editor (no rebuild — see .claude/plans/
// combined-lesson-creator.md for the full design). A horizontal filmstrip
// holds the sequence; the active block's editor renders below/beside it.
//
// Study and Interactive Study reuse StudyEditorBoard/InteractiveStudyEditorBoard
// via CombinedStudyBlockEditor, which owns the ~4 transient "in-progress new
// chapter" fields those boards need (not part of the saved block) and bridges
// everything else straight into this block's own `study`/`interactiveStudy`
// data — see that file's doc comment.

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PuzzleAuthoringPanel, type PuzzleData } from "./PuzzleAuthoringPanel";
import McqEditorPanel, { type McqQuestionData } from "./McqEditorPanel";
import QaEditorPanel, { type QaCardData } from "./QaEditorPanel";
import {
  CombinedStudyBlockEditor, emptyStudyBlock, emptyInteractiveStudyBlock,
  type StudyBlockData, type InteractiveStudyBlockData,
} from "./CombinedStudyBlockEditor";
import { useMotionProfile } from "@/components/microinteractions/MotionProfileProvider";
import { tapAnimation, successAnimation } from "@/components/microinteractions/presets";

export type CombinedBlockType = "puzzle" | "mcq" | "qa" | "study" | "interactive_study";

export interface CombinedBlock {
  id: string;
  type: CombinedBlockType;
  puzzle?: PuzzleData;
  mcq?: McqQuestionData;
  qa?: QaCardData;
  study?: StudyBlockData;
  interactiveStudy?: InteractiveStudyBlockData;
}

interface CombinedLessonCreatorProps {
  blocks: CombinedBlock[];
  onBlocksChange: (blocks: CombinedBlock[]) => void;
}

const TYPE_META: Record<CombinedBlockType, { label: string; icon: string }> = {
  puzzle: { label: "Puzzle", icon: "🧩" },
  mcq: { label: "MCQ", icon: "☑" },
  qa: { label: "Q&A", icon: "❓" },
  study: { label: "Study", icon: "📚" },
  interactive_study: { label: "Interactive", icon: "🎯" },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function emptyPuzzle(): PuzzleData {
  return {
    id: generateId(),
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    solution: [],
    description: "",
  };
}
function emptyMcq(): McqQuestionData {
  return {
    id: generateId(),
    question: "",
    options: [
      { id: generateId(), text: "", isCorrect: true },
      { id: generateId(), text: "", isCorrect: false },
    ],
  };
}
function emptyQa(): QaCardData {
  return { id: generateId(), question: "", answer: "" };
}

export function CombinedLessonCreator({ blocks, onBlocksChange }: CombinedLessonCreatorProps) {
  const { spring, reduced } = useMotionProfile();
  const [activeIndex, setActiveIndex] = useState<number | null>(blocks.length > 0 ? 0 : null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const activeBlock = activeIndex != null ? blocks[activeIndex] : null;

  const addBlock = useCallback((type: CombinedBlockType) => {
    const block: CombinedBlock = {
      id: generateId(),
      type,
      puzzle: type === "puzzle" ? emptyPuzzle() : undefined,
      mcq: type === "mcq" ? emptyMcq() : undefined,
      qa: type === "qa" ? emptyQa() : undefined,
      study: type === "study" ? emptyStudyBlock() : undefined,
      interactiveStudy: type === "interactive_study" ? emptyInteractiveStudyBlock() : undefined,
    };
    const next = [...blocks, block];
    onBlocksChange(next);
    setActiveIndex(next.length - 1);
    setJustAddedId(block.id); // pops the new filmstrip tile once, via successAnimation below
  }, [blocks, onBlocksChange]);

  const updateActive = useCallback((patch: Partial<CombinedBlock>) => {
    if (activeIndex == null) return;
    const next = blocks.map((b, i) => (i === activeIndex ? { ...b, ...patch } : b));
    onBlocksChange(next);
  }, [activeIndex, blocks, onBlocksChange]);

  const deleteBlock = useCallback((index: number) => {
    const next = blocks.filter((_, i) => i !== index);
    onBlocksChange(next);
    setActiveIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return next.length > 0 ? Math.min(index, next.length - 1) : null;
      return prev > index ? prev - 1 : prev;
    });
  }, [blocks, onBlocksChange]);

  const moveBlock = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onBlocksChange(next);
    setActiveIndex(prev => (prev === index ? newIndex : prev === newIndex ? index : prev));
  }, [blocks, onBlocksChange]);

  return (
    <div className="space-y-3">
      {/* Filmstrip — horizontal scroll on every size, the sequence itself */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {blocks.map((b, i) => (
          <motion.div
            key={b.id}
            whileTap={tapAnimation(reduced)}
            animate={b.id === justAddedId ? successAnimation(spring, reduced) : undefined}
            onAnimationComplete={() => { if (b.id === justAddedId) setJustAddedId(null); }}
            className={cn(
              "shrink-0 flex flex-col items-center gap-0.5 w-14 rounded-sm border px-1.5 py-1.5 cursor-pointer transition-colors",
              i === activeIndex ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30",
            )}
            onClick={() => setActiveIndex(i)}
          >
            <span className="text-lg leading-none" aria-hidden>{TYPE_META[b.type].icon}</span>
            <span className="text-[9px] text-muted-foreground font-medium">#{i + 1}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); moveBlock(i, "up"); }}
                disabled={i === 0}
                className="p-0.5 rounded-sm hover:bg-muted disabled:opacity-20"
                aria-label="Move earlier"
              >
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); moveBlock(i, "down"); }}
                disabled={i === blocks.length - 1}
                className="p-0.5 rounded-sm hover:bg-muted disabled:opacity-20"
                aria-label="Move later"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); deleteBlock(i); }}
                className="p-0.5 rounded-sm hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete block"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>
        ))}
        {blocks.length === 0 && (
          <p className="text-xs text-muted-foreground py-3">No blocks yet — add one below to start the sequence.</p>
        )}
      </div>

      {/* Type picker (stacks above the editor on mobile, sits beside it at lg:) + active block editor */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="lg:w-40 shrink-0 flex lg:flex-col gap-1.5 flex-wrap">
          {(Object.keys(TYPE_META) as CombinedBlockType[]).map(type => (
            <motion.button
              key={type}
              type="button"
              whileTap={tapAnimation(reduced)}
              onClick={() => addBlock(type)}
              className="flex-1 lg:flex-none flex items-center gap-1.5 px-2.5 py-2 rounded-sm border border-border hover:border-foreground/40 hover:bg-muted/40 transition-colors text-xs font-medium"
            >
              <span className="text-base leading-none" aria-hidden>{TYPE_META[type].icon}</span>
              + {TYPE_META[type].label}
            </motion.button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {!activeBlock ? (
            <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-sm">
              Pick a block type to add the first block.
            </div>
          ) : activeBlock.type === "puzzle" ? (
            <PuzzleAuthoringPanel
              // Bridges a list-oriented panel to "author one block": if the
              // coach's editing session inside the panel ends up with more
              // than one puzzle (e.g. hit "New puzzle" again), the most
              // recent one wins — this panel is scoped to a single sequence
              // slot, not a batch.
              puzzles={activeBlock.puzzle ? [activeBlock.puzzle] : []}
              onPuzzlesChange={next => updateActive({ puzzle: next[next.length - 1] ?? emptyPuzzle() })}
            />
          ) : activeBlock.type === "mcq" ? (
            <McqEditorPanel
              questions={activeBlock.mcq ? [activeBlock.mcq] : []}
              onChange={next => updateActive({ mcq: next[next.length - 1] ?? emptyMcq() })}
            />
          ) : activeBlock.type === "qa" ? (
            <QaEditorPanel
              cards={activeBlock.qa ? [activeBlock.qa] : []}
              onChange={next => updateActive({ qa: next[next.length - 1] ?? emptyQa() })}
            />
          ) : (
            <CombinedStudyBlockEditor
              key={activeBlock.id}
              variant={activeBlock.type}
              value={(activeBlock.type === "study" ? activeBlock.study : activeBlock.interactiveStudy)
                ?? (activeBlock.type === "study" ? emptyStudyBlock() : emptyInteractiveStudyBlock())}
              onChange={next => updateActive(
                activeBlock.type === "study" ? { study: next as StudyBlockData } : { interactiveStudy: next as InteractiveStudyBlockData }
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

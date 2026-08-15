"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import BlockMediaPreview, { type BlockMedia } from "@/components/BlockMediaPreview";

interface MediaConfigFieldProps {
  value: BlockMedia | undefined;
  onChange: (next: BlockMedia | undefined) => void;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Optional image-or-board media attached to a question-style block (MCQ/QA). */
export function MediaConfigField({ value, onChange }: MediaConfigFieldProps) {
  const kind: "none" | "image" | "board" = value?.type ?? "none";

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Media (optional)</Label>
      <div className="flex gap-1 p-1 bg-muted rounded-sm w-fit">
        {([
          { id: "none", label: "None" },
          { id: "image", label: "Image" },
          { id: "board", label: "Board" },
        ] as const).map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              if (opt.id === "none") onChange(undefined);
              else if (opt.id === "image") onChange({ type: "image", src: value?.src ?? "" });
              else onChange({ type: "board", fen: value?.fen ?? START_FEN });
            }}
            className={cn(
              "text-xs px-2.5 py-1 rounded-sm font-medium transition-colors",
              kind === opt.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {kind === "image" && (
        <Input
          value={value?.src ?? ""}
          onChange={e => onChange({ type: "image", src: e.target.value, alt: value?.alt })}
          placeholder="https://example.com/diagram.png"
          className="text-xs"
        />
      )}

      {kind === "board" && (
        <Input
          value={value?.fen ?? ""}
          onChange={e => onChange({ type: "board", fen: e.target.value })}
          placeholder="FEN position"
          className="font-mono text-xs"
        />
      )}

      {value && (kind === "image" ? value.src : value.fen) && (
        <div className="pt-1">
          <BlockMediaPreview media={value} />
        </div>
      )}
    </div>
  );
}

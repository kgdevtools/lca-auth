"use client";

import { Timer } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export interface TimerConfig {
  enabled: boolean;
  seconds: number;
}

export const DEFAULT_TIMER: TimerConfig = { enabled: false, seconds: 60 };

interface TimerConfigFieldProps {
  value: TimerConfig;
  onChange: (next: TimerConfig) => void;
}

/**
 * Shared per-block timer control — same shape reused across every block-type
 * editor (Puzzle/Study/Interactive/MCQ/QA). Off by default: a timer only ever
 * appears on a block because a coach deliberately turned it on, and the
 * seconds are always shown to the student up front on the block itself
 * (BlockTimerChip) before time starts running out — never a surprise
 * countdown. Running out just skips forward, same as choosing to give up.
 */
export function TimerConfigField({ value, onChange }: TimerConfigFieldProps) {
  return (
    <div className="space-y-1.5 rounded-sm border border-border p-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="timer-enabled" className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" /> Time limit
        </Label>
        <Switch
          id="timer-enabled"
          checked={value.enabled}
          onCheckedChange={enabled => onChange({ ...value, enabled })}
        />
      </div>
      {value.enabled && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            type="number"
            min={5}
            max={3600}
            value={value.seconds}
            onChange={e => onChange({ ...value, seconds: Math.min(3600, Math.max(5, parseInt(e.target.value) || 5)) })}
            className="h-8 w-24 text-sm"
          />
          <span className="text-xs text-muted-foreground">seconds — shown to the student, running out just skips to the next block</span>
        </div>
      )}
    </div>
  );
}

"use client";

// Shared display-settings + timer panel for Study / Interactive Study
// content — used both by the standalone lesson builder (one panel, page-level
// popover) and by each Study/Interactive block inside a Combined lesson
// (one panel per block, scoped to that block's own settings).

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimerConfigField, type TimerConfig } from "@/components/lessons/TimerConfigField";

export interface StudyDisplaySettings {
  showEval: boolean;
  showClocks: boolean;
  showArrows: boolean;
  showHighlights: boolean;
}

const TOGGLES: Array<{ key: keyof StudyDisplaySettings; label: string }> = [
  { key: "showEval", label: "Engine evaluation" },
  { key: "showClocks", label: "Move clocks" },
  { key: "showArrows", label: "Annotation arrows" },
  { key: "showHighlights", label: "Square highlights" },
];

export default function StudySettingsPanel({
  displaySettings, onDisplaySettingsChange, timer, onTimerChange,
}: {
  displaySettings: StudyDisplaySettings;
  onDisplaySettingsChange: (next: StudyDisplaySettings) => void;
  timer: TimerConfig;
  onTimerChange: (next: TimerConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Display settings</p>
      <div className="grid grid-cols-2 gap-2.5">
        {TOGGLES.map(t => (
          <div key={t.key} className="flex items-center justify-between gap-2 rounded-sm border border-border px-3 py-2">
            <Label htmlFor={`ds-${t.key}`} className="text-xs">{t.label}</Label>
            <Switch
              id={`ds-${t.key}`}
              checked={displaySettings[t.key]}
              onCheckedChange={v => onDisplaySettingsChange({ ...displaySettings, [t.key]: v })}
            />
          </div>
        ))}
      </div>
      <TimerConfigField value={timer} onChange={onTimerChange} />
    </div>
  );
}

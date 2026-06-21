// src/app/add-game/AddGameForm.tsx
"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export interface GameForm {
  title: string;
  pgnText: string;
  event: string;
  date: string;
  white: string;
  black: string;
  result: string;
  whiteElo: string;
  blackElo: string;
  timeControl: string;
  opening: string;
}

export const EMPTY_FORM: GameForm = {
  title: "", pgnText: "", event: "", date: "", white: "", black: "",
  result: "", whiteElo: "", blackElo: "", timeControl: "", opening: "",
};

export const RESULT_OPTIONS = ["1-0", "0-1", "1/2-1/2", "*"] as const;

/** Field-level validation for a single (non-batch) game. Empty object = valid. */
export function validateGameForm(form: GameForm): Partial<Record<keyof GameForm, string>> {
  const errors: Partial<Record<keyof GameForm, string>> = {};
  if (!form.white.trim()) errors.white = "White player is required.";
  if (!form.black.trim()) errors.black = "Black player is required.";
  if (!form.pgnText.trim()) errors.pgnText = "PGN data is required.";
  if (form.result && !RESULT_OPTIONS.includes(form.result as (typeof RESULT_OPTIONS)[number])) {
    errors.result = "Result must be 1-0, 0-1, 1/2-1/2 or *.";
  }
  for (const [field, label] of [["whiteElo", "White Elo"], ["blackElo", "Black Elo"]] as const) {
    const v = form[field].trim();
    if (v) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 4000) errors[field] = `${label} must be a number 0–4000.`;
    }
  }
  if (form.date.trim()) {
    const s = form.date.trim().replace(/[./]/g, "-").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) errors.date = "Date must be YYYY.MM.DD.";
  }
  return errors;
}

const inputClass =
  "w-full px-3 py-2 bg-input border border-border rounded-[2px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all disabled:opacity-60";

function Field({
  id, label, value, onChange, placeholder, error, disabled, required,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; disabled?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputClass} ${error ? "border-destructive focus:ring-destructive/20" : ""}`}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}

interface AddGameFormProps {
  form: GameForm;
  errors: Partial<Record<keyof GameForm, string>>;
  onChange: (field: keyof GameForm, value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedFileName: string | null;
  isSubmitting: boolean;
  isEditingGame: boolean;
  isBatch: boolean;
  batchCount: number;
  isBatchUploading: boolean;
  batchUploadProgress: { uploaded: number; total: number } | null;
  batchUploadErrors: string[];
  formMessage: { text: string; error: boolean } | null;
}

export function AddGameForm({
  form, errors, onChange, onFileChange, onSubmit, selectedFileName,
  isSubmitting, isEditingGame, isBatch, batchCount,
  isBatchUploading, batchUploadProgress, batchUploadErrors, formMessage,
}: AddGameFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldsDisabled = isSubmitting || isBatch;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isBatch && (
        <div className="p-3 rounded-[2px] text-sm border bg-accent/40 border-border text-foreground">
          <p className="font-medium">Batch upload detected</p>
          <p className="text-muted-foreground">
            This PGN contains {batchCount} games. Per-game fields are read from each game&apos;s
            headers; all {batchCount} games will be added to the selected tournament.
          </p>
        </div>
      )}

      <Field id="title" label="Game Title" value={form.title} onChange={(v) => onChange("title", v)}
        placeholder="Auto-generated from players if left blank" disabled={fieldsDisabled} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field id="white" label="White Player" value={form.white} onChange={(v) => onChange("white", v)}
          placeholder="White" error={errors.white} disabled={fieldsDisabled} required={!isBatch} />
        <Field id="black" label="Black Player" value={form.black} onChange={(v) => onChange("black", v)}
          placeholder="Black" error={errors.black} disabled={fieldsDisabled} required={!isBatch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field id="date" label="Date" value={form.date} onChange={(v) => onChange("date", v)}
          placeholder="YYYY.MM.DD" error={errors.date} disabled={fieldsDisabled} />
        <div>
          <label htmlFor="result" className="block text-sm font-medium mb-1">Result</label>
          <select
            id="result"
            value={form.result}
            onChange={(e) => onChange("result", e.target.value)}
            disabled={fieldsDisabled}
            className={`${inputClass} ${errors.result ? "border-destructive" : ""}`}
          >
            <option value="">—</option>
            {RESULT_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.result && <p className="text-destructive text-xs mt-1">{errors.result}</p>}
        </div>
      </div>

      <Field id="event" label="Event" value={form.event} onChange={(v) => onChange("event", v)}
        placeholder="Event name" disabled={fieldsDisabled} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field id="whiteElo" label="White Elo" value={form.whiteElo} onChange={(v) => onChange("whiteElo", v)}
          placeholder="e.g. 1850" error={errors.whiteElo} disabled={fieldsDisabled} />
        <Field id="blackElo" label="Black Elo" value={form.blackElo} onChange={(v) => onChange("blackElo", v)}
          placeholder="e.g. 1790" error={errors.blackElo} disabled={fieldsDisabled} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field id="timeControl" label="Time Control" value={form.timeControl} onChange={(v) => onChange("timeControl", v)}
          placeholder="e.g. 90+30" disabled={fieldsDisabled} />
        <Field id="opening" label="Opening" value={form.opening} onChange={(v) => onChange("opening", v)}
          placeholder="e.g. Sicilian Defense" disabled={fieldsDisabled} />
      </div>

      <div>
        <label htmlFor="pgnText" className="block text-sm font-medium mb-1">
          PGN Data {!isBatch && <span className="text-destructive">*</span>}
        </label>
        <textarea
          id="pgnText"
          value={form.pgnText}
          onChange={(e) => onChange("pgnText", e.target.value)}
          placeholder={`[Event ""]\n[White ""]\n[Black ""]\n...\n\n1. e4 e5 *`}
          rows={8}
          disabled={fieldsDisabled}
          className={`${inputClass} font-mono text-sm resize-y ${errors.pgnText ? "border-destructive" : ""}`}
        />
        {errors.pgnText && <p className="text-destructive text-xs mt-1">{errors.pgnText}</p>}
        {isBatch && <p className="text-muted-foreground text-xs mt-1">Editing is disabled for batch uploads.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Or upload a PGN file</label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".pgn" onChange={onFileChange} className="hidden" disabled={isSubmitting} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="gap-2">
            <Upload className="w-4 h-4" /> Choose File
          </Button>
          {selectedFileName && <span className="text-sm text-muted-foreground truncate">{selectedFileName}</span>}
        </div>
      </div>

      {formMessage && !isBatchUploading && (
        <div className={`p-3 rounded-[2px] text-sm border ${formMessage.error ? "bg-destructive/10 border-destructive text-destructive" : "bg-primary/10 border-primary text-primary"}`}>
          {formMessage.text}
        </div>
      )}

      {isBatchUploading && batchUploadProgress && (
        <div className="p-3 rounded-[2px] text-sm border bg-accent/40 border-border text-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Validating games: {batchUploadProgress.uploaded} of {batchUploadProgress.total}...
        </div>
      )}

      {batchUploadErrors.length > 0 && (
        <div className="p-3 rounded-[2px] text-sm border bg-destructive/10 border-destructive text-destructive space-y-1">
          <p className="font-medium">Upload errors ({batchUploadErrors.length}):</p>
          <ul className="list-disc list-inside ml-4">
            {batchUploadErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isBatchUploading ? "Uploading…"
          : isSubmitting ? (isEditingGame ? "Updating…" : "Adding…")
          : isEditingGame ? "Update Game"
          : isBatch ? `Add ${batchCount} Games`
          : "Add Game"}
      </Button>
    </form>
  );
}

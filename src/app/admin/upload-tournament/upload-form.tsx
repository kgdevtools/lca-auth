"use client"

import React, { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { uploadTournamentAction } from "../../admin-dashboard/server-actions"

type UploadState = { 
  ok: boolean; 
  tournamentid?: string; 
  playersinserted?: number; 
  error?: string;
  parserUsed?: string;
} | null

export function UploadForm() {
  const [state, formAction] = useActionState<UploadState, FormData>(uploadTournamentAction as any, null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = React.useState<string>("")
  const [parserType, setParserType] = useState<string>("enhanced")

  React.useEffect(() => {
    if (state && 'ok' in state && state.ok && inputRef.current) {
      inputRef.current.value = ""
    }
  }, [state])

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPreview("")
      return
    }
    setPreview(JSON.stringify({ file: file.name, size: file.size }, null, 2))
  }

  React.useEffect(() => {
    if (state && (state as any).parsed) {
      try {
        setPreview(JSON.stringify((state as any).parsed, null, 2))
      } catch {}
    }
  }, [state])

  return (
    <div>
      <form action={formAction} className="space-y-4">
        {/* Parser Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Parser Type</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="parserType"
                value="enhanced"
                checked={parserType === "enhanced"}
                onChange={(e) => setParserType(e.target.value)}
              />
              <span>Enhanced Parser (Screenshots format)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="parserType"
                value="original"
                checked={parserType === "original"}
                onChange={(e) => setParserType(e.target.value)}
              />
              <span>Original Parser (Legacy format)</span>
            </label>
          </div>
          <p className="text-xs text-gray-600">
            {parserType === "enhanced" 
              ? "Use for tournament files with structured headers like 'Final ranking', player numbers, and standardized columns"
              : "Use for legacy tournament formats with varied layouts and metadata extraction"
            }
          </p>
        </div>

        {/* File Input */}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".xlsx,.xls"
          required
          className="block w-full text-sm"
          onChange={onFileChange}
        />

        <Button type="submit">Upload Tournament</Button>
      </form>

      {/* Results Display */}
      {state ? (
        (state as any).ok ? (
          <div className="mt-4 text-sm">
            <p className="text-green-700 dark:text-green-400">Upload succeeded.</p>
            <p>Tournament ID: <span className="font-mono">{(state as any).tournamentid}</span></p>
            <p>Players inserted: {(state as any).playersinserted}</p>
            <p>Parser used: <span className="font-mono">{(state as any).parserUsed}</span></p>
          </div>
        ) : (
          <div className="mt-4 text-sm">
            <p className="text-red-600">{(state as any).error ?? "Upload failed"}</p>
          </div>
        )
      ) : null}

      {/* Preview */}
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Parsed JSON (preview/result)</label>
        <textarea
          readOnly
          value={preview}
          className="w-full h-48 p-2 font-mono text-xs rounded-md border bg-neutral-50 dark:bg-neutral-900"
          style={{ whiteSpace: 'pre', overflow: 'auto' }}
        />
      </div>
    </div>
  )
}

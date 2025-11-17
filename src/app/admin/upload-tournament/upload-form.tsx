"use client"

import React, { useActionState, useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { uploadTournamentAction } from "../server-actions"
import { Loader2, Upload, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react"

type UploadState = {
  ok: boolean;
  tournamentid?: string;
  playersinserted?: number;
  error?: string;
  parserUsed?: string;
} | null

const parserOptions = [
  {
    value: "enhanced",
    label: "Swiss Manager Tournament File",
    description: "Use for tournament files exported from Swiss Manager software with enhanced formatting"
  },
  {
    value: "original",
    label: "Chess-Results Server Download",
    description: "Use for tournament files downloaded directly from chess-results.com with structured headers like 'Final ranking', player numbers, and standardized columns"
  },
  {
    value: "roundrobin",
    label: "Round Robin Tournament (Individual)",
    description: "Use for individual round robin tournaments with cross-table format showing player matchups"
  }
]

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading...
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4" />
          Upload Tournament
        </>
      )}
    </Button>
  )
}

export function UploadForm() {
  const [state, formAction] = useActionState<UploadState, FormData>(uploadTournamentAction as any, null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = React.useState<string>("")
  const [parserType, setParserType] = useState<string>("enhanced")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (state && 'ok' in state && state.ok && inputRef.current) {
      inputRef.current.value = ""
      setSelectedFile(null)
    }
  }, [state])

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPreview("")
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
    setPreview(JSON.stringify({ file: file.name, size: file.size }, null, 2))
  }

  useEffect(() => {
    if (state && (state as any).parsed) {
      try {
        setPreview(JSON.stringify((state as any).parsed, null, 2))
      } catch {}
    }
  }, [state])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        {/* Parser Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Select Tournament Format
          </label>
          <div className="space-y-3">
            {parserOptions.map((option) => (
              <label
                key={option.value}
                className={`
                  flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${parserType === option.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="parserType"
                  value={option.value}
                  checked={parserType === option.value}
                  onChange={(e) => setParserType(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-foreground">
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* File Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Choose Excel File
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".xlsx,.xls"
              required
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              onChange={onFileChange}
            />
          </div>
          {selectedFile && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-xs">({formatFileSize(selectedFile.size)})</span>
            </div>
          )}
        </div>

        <SubmitButton disabled={!selectedFile} />
      </form>

      {/* Results Display */}
      {state && (
        <div className={`
          p-4 rounded-lg border-2
          ${state.ok
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-red-500/50 bg-red-500/10'
          }
        `}>
          {state.ok ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Upload Successful!</span>
              </div>
              <div className="text-sm space-y-1 text-foreground/80">
                <p>
                  <span className="font-medium">Tournament ID:</span>{' '}
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {(state as any).tournamentid}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Players Inserted:</span>{' '}
                  <span className="font-semibold">{(state as any).playersinserted}</span>
                </p>
                <p>
                  <span className="font-medium">Parser Used:</span>{' '}
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {(state as any).parserUsed}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">Upload Failed</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  {(state as any).error ?? "An unknown error occurred"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Parsed Data Preview
          </label>
          <textarea
            readOnly
            value={preview}
            className="w-full h-64 p-3 font-mono text-xs rounded-md border bg-muted/30 focus:outline-none"
            style={{ whiteSpace: 'pre', overflow: 'auto' }}
          />
        </div>
      )}
    </div>
  )
}

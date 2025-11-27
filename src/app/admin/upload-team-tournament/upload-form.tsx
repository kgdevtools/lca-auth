"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { uploadTeamTournamentRoundAction } from "./server-actions"
import { Loader2, Upload, CheckCircle2, XCircle, FileSpreadsheet, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RoundFile = {
  id: string
  file: File
  roundNumber: number | null
}

type UploadResult = {
  ok: boolean
  tournament_id?: string
  round_number?: number
  pairings_count?: number
  error?: string
  parsed?: any
}

export function UploadTeamTournamentForm() {
  const [roundFiles, setRoundFiles] = useState<RoundFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [results, setResults] = useState<UploadResult[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: RoundFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      roundNumber: detectRoundNumberFromFilename(file.name)
    }))

    setRoundFiles((prev) => [...prev, ...newFiles])

    // Reset input
    e.target.value = ""
  }

  const detectRoundNumberFromFilename = (filename: string): number | null => {
    // Try to extract round number from filename
    const match = filename.match(/round[_\s]*(\d+)/i) || filename.match(/\br(\d+)/i)
    return match ? parseInt(match[1]) : null
  }

  const removeFile = (id: string) => {
    setRoundFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const updateRoundNumber = (id: string, roundNumber: string) => {
    const num = parseInt(roundNumber)
    if (isNaN(num)) return

    setRoundFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, roundNumber: num } : f))
    )
  }

  const handleUpload = async () => {
    if (roundFiles.length === 0) return

    setUploading(true)
    setResults([])
    setCurrentFileIndex(0)

    const uploadResults: UploadResult[] = []

    // Upload files sequentially
    for (let i = 0; i < roundFiles.length; i++) {
      const roundFile = roundFiles[i]
      setCurrentFileIndex(i + 1)

      try {
        const formData = new FormData()
        formData.append("file", roundFile.file)
        if (roundFile.roundNumber) {
          formData.append("roundNumber", roundFile.roundNumber.toString())
        }

        const result = await uploadTeamTournamentRoundAction(formData)
        uploadResults.push(result as UploadResult)

        // Update results in real-time so user can see progress
        setResults([...uploadResults])
      } catch (error) {
        const errorResult = {
          ok: false,
          error: error instanceof Error ? error.message : "Upload failed"
        }
        uploadResults.push(errorResult)
        setResults([...uploadResults])
      }
    }

    setUploading(false)
    setCurrentFileIndex(0)

    // Clear files if all successful
    const allSuccess = uploadResults.every((r) => r.ok)
    if (allSuccess) {
      setRoundFiles([])
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="space-y-2">
        <Label htmlFor="files" className="text-sm font-semibold">
          Select Round Files
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="files"
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileSelect}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Select one or more Excel files. Each file should contain board pairings for one round.
        </p>
      </div>

      {/* Selected Files List */}
      {roundFiles.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Selected Files ({roundFiles.length})
          </Label>
          <div className="space-y-2">
            {roundFiles.map((roundFile) => (
              <div
                key={roundFile.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {roundFile.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(roundFile.file.size)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={roundFile.roundNumber || ""}
                    onChange={(e) => updateRoundNumber(roundFile.id, e.target.value)}
                    placeholder="Round #"
                    className="w-24 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(roundFile.id)}
                    disabled={uploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {roundFiles.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading || roundFiles.some((f) => !f.roundNumber)}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {currentFileIndex} of {roundFiles.length}...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {roundFiles.length} Round{roundFiles.length > 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}

      {/* Upload Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Upload Results</Label>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.ok
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-red-500/50 bg-red-500/10"
              }`}
            >
              {result.ok ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">
                      Round {result.round_number} uploaded successfully!
                    </span>
                  </div>
                  <div className="text-sm space-y-1 text-foreground/80">
                    <p>
                      <span className="font-medium">Tournament ID:</span>{" "}
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {result.tournament_id}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Team Pairings:</span>{" "}
                      <span className="font-semibold">{result.pairings_count}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">
                      Upload Failed
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      {result.error ?? "An unknown error occurred"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Parsed Data */}
      {results.length > 0 && results[0]?.parsed && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Parsed Data Preview</Label>
          <textarea
            readOnly
            value={JSON.stringify(results[0].parsed, null, 2)}
            className="w-full h-64 p-3 font-mono text-xs rounded-md border bg-muted/30 focus:outline-none"
            style={{ whiteSpace: "pre", overflow: "auto" }}
          />
        </div>
      )}
    </div>
  )
}

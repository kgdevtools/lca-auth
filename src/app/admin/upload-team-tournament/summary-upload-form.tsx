"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, CheckCircle2, XCircle } from "lucide-react"
import { uploadTeamSummaryAction } from "./server-actions"

type SummaryResult = {
  ok: boolean
  tournament_id?: string
  tournament_name?: string
  teams_count?: number
  players_count?: number
  with_performance?: number
  error?: string
  parsed?: any
}

export function SummaryUploadForm() {
  const [composition, setComposition] = useState<File | null>(null)
  const [performance, setPerformance] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<SummaryResult | null>(null)

  const handleUpload = async () => {
    if (!composition || !performance) return
    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append("composition", composition)
      formData.append("performance", performance)
      const res = (await uploadTeamSummaryAction(formData)) as SummaryResult
      setResult(res)
      if (res.ok) {
        setComposition(null)
        setPerformance(null)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Upload failed" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="composition" className="text-sm font-semibold">
            Team Composition with Points
          </Label>
          <Input
            id="composition"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setComposition(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="performance" className="text-sm font-semibold">
            Player Performance List
          </Label>
          <Input
            id="performance"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setPerformance(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Both files are required and uploaded together. The Composition gives team standings + rosters; the
        Performance List gives each player&rsquo;s performance rating (ratP). Round-by-round board pairings
        are uploaded separately in Step 2 below.
      </p>

      <Button onClick={handleUpload} disabled={uploading || !composition || !performance} className="w-full">
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Summary
          </>
        )}
      </Button>

      {result && (
        <div
          className={`p-4 rounded-lg border-2 ${
            result.ok ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
          }`}
        >
          {result.ok ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{result.tournament_name} uploaded</span>
              </div>
              <div className="text-sm space-y-1 text-foreground/80">
                <p>
                  <span className="font-medium">Teams:</span> {result.teams_count}
                  {" · "}
                  <span className="font-medium">Players:</span> {result.players_count}
                  {" · "}
                  <span className="font-medium">with ratP:</span> {result.with_performance}
                </p>
                <p>
                  <span className="font-medium">Tournament ID:</span>{" "}
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{result.tournament_id}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">Upload Failed</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

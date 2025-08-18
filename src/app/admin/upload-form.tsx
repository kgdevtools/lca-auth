"use client"

import React, { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { uploadTournamentAction } from "./server-actions"

type UploadState = { ok: boolean; tournament_id?: string; players_inserted?: number; error?: string } | null

export function UploadForm() {
  const [state, formAction] = useActionState<UploadState, FormData>(uploadTournamentAction as any, null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = React.useState<string>("")

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
    // show basic info until server action returns
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
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".xlsx,.xls"
          required
          className="block w-full text-sm"
          onChange={onFileChange}
        />
        <Button type="submit">Upload</Button>
      </form>
      {state ? (
        (state as any).ok ? (
          <div className="mt-4 text-sm">
            <p className="text-green-700 dark:text-green-400">Upload succeeded.</p>
            <p>
              Tournament ID: <span className="font-mono">{(state as any).tournament_id}</span>
            </p>
            <p>Players inserted: {(state as any).players_inserted}</p>
          </div>
        ) : (
          <div className="mt-4 text-sm">
            <p className="text-[var(--destructive)]">{(state as any).error ?? "Upload failed"}</p>
          </div>
        )
      ) : null}

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



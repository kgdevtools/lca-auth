'use client'

import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, RefreshCw, X } from 'lucide-react'
import { getContactSubmissions, deleteContactSubmission, toggleContactRead } from '../server-actions'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone?: string | null
  subject?: string | null
  message?: string | null
  read?: boolean | null
  created_at?: string | null
}

export default function ContactsTable() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ContactSubmission | null>(null)

  useEffect(() => { fetchSubmissions() }, [])

  async function fetchSubmissions() {
    setLoading(true)
    setError(null)
    try {
      const res = await getContactSubmissions()
      if (res.error) setError(res.error)
      else setSubmissions((res.data || []) as ContactSubmission[])
    } catch {
      setError('Failed to fetch contact submissions')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRead(id: string, current: boolean | null | undefined) {
    const next = !current
    const res = await toggleContactRead(id, next)
    if (res.success) {
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, read: next } : s))
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, read: next } : prev)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this submission?')) return
    const res = await deleteContactSubmission(id)
    if (res.success) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive text-sm flex items-center gap-2">
        {error}
        <Button variant="ghost" size="sm" onClick={fetchSubmissions}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Table — no horizontal scroll, responsive column visibility */}
      <div className="bg-card border border-border rounded-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Read</TableHead>
              <TableHead className="w-40">Name</TableHead>
              {/* Subject hidden on small screens */}
              <TableHead className="hidden sm:table-cell w-36">Subject</TableHead>
              {/* Message hidden on medium and below */}
              <TableHead className="hidden md:table-cell">Message</TableHead>
              <TableHead className="w-24 text-xs">Date</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((s) => (
                <TableRow
                  key={s.id}
                  className={`cursor-pointer hover:bg-accent/30 ${!s.read ? 'font-medium' : ''}`}
                  onClick={() => setSelected(s)}
                >
                  {/* Read checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!s.read}
                      onChange={() => handleToggleRead(s.id, s.read)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">{s.name}</TableCell>
                  <TableCell className="hidden sm:table-cell max-w-[140px] truncate text-muted-foreground text-sm">
                    {s.subject || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[260px] truncate text-muted-foreground text-sm">
                    {s.message || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-background border border-border rounded-sm shadow-lg overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selected.name}</h3>
                <p className="text-sm text-muted-foreground">{selected.email}{selected.phone ? ` • ${selected.phone}` : ''}</p>
              </div>
              <button className="p-1.5 rounded hover:bg-accent/50" onClick={() => setSelected(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
              </p>
              {selected.subject && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                  <p className="text-sm text-foreground">{selected.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Message</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selected.message || '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-4 border-t border-border">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected.read}
                  onChange={() => handleToggleRead(selected.id, selected.read)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Mark as read
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selected.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

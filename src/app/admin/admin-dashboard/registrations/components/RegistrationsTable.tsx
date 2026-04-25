'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { getRegistrations, deleteRegistration, getAllRegistrationsForExport } from '../server-actions'
import type { PlayerRegistration } from '@/types/admin'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Eye, Trash2, Download, X, RefreshCw } from 'lucide-react'

// Convert camelCase keys to readable labels
function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}

export default function RegistrationsTable() {
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<PlayerRegistration | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const { isExporting, handleExport } = useExport<Record<string, any>>()

  const { page, itemsPerPage, totalPages, nextPage, prevPage, goToPage } = usePagination({
    initialPage: 1,
    initialItemsPerPage: 50,
    totalItems: totalCount,
  })

  const load = async () => {
    setLoading(true)
    setError(null)
    const result = await getRegistrations(page, itemsPerPage)
    if (result.error) {
      setError(result.error)
    } else {
      setRegistrations(result.data || [])
      setTotalCount(result.count)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [page, itemsPerPage])

  // Client-side search on loaded page (JSONB content)
  const filtered = useMemo(() => {
    if (!search.trim()) return registrations
    const q = search.toLowerCase()
    return registrations.filter((r) => {
      const d = r.data_entry || {}
      return Object.values(d).some((v) => String(v ?? '').toLowerCase().includes(q))
    })
  }, [registrations, search])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this registration? This cannot be undone.')) return
    setDeletingId(id)
    const result = await deleteRegistration(id)
    if (result.success) {
      setRegistrations((prev) => prev.filter((r) => r.id !== id))
      setTotalCount((prev) => prev - 1)
      if (selected?.id === id) setSelected(null)
    }
    setDeletingId(null)
  }

  const exportFlattened = async (format: 'csv' | 'json') => {
    const result = await getAllRegistrationsForExport()
    if (!result.data) return
    const flat = result.data.map((r) => ({
      id: r.id,
      submitted_at: r.created_at,
      ...(r.data_entry || {}),
    }))
    handleExport(flat, 'registrations', { format, scope: 'all', excludeFields: [], pretty: true })
  }

  if (loading && registrations.length === 0) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded p-4 text-sm text-destructive">
        {error}
        <Button variant="ghost" size="sm" className="ml-2" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="Search registrations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground ml-1">{totalCount} total</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => exportFlattened('csv')}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => exportFlattened('json')}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Parent / Guardian</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No registrations found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const d = r.data_entry || {}
                return (
                  <TableRow key={r.id} className="hover:bg-accent/30">
                    <TableCell className="font-medium">{d.firstName || '—'}</TableCell>
                    <TableCell>{d.lastName || '—'}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{d.experience || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{d.parentName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{d.dob || '—'}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) pageNum = i + 1
                else if (page <= 3) pageNum = i + 1
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = page - 2 + i
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-background border border-border rounded-sm shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selected.data_entry?.firstName} {selected.data_entry?.lastName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button className="p-1.5 rounded hover:bg-accent/50" onClick={() => setSelected(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Key-value pairs */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {selected.data_entry ? (
                <dl className="space-y-3">
                  {Object.entries(selected.data_entry).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground font-medium">{formatKey(key)}</dt>
                      <dd className="text-foreground break-words">
                        {value === null || value === undefined || value === ''
                          ? <span className="text-muted-foreground italic">—</span>
                          : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">No data available.</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-border">
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
      )}
    </>
  )
}

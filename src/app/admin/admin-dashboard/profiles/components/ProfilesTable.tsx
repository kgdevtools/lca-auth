'use client'

import { useState, useEffect } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import {
  getProfiles,
  getAllProfilesForExport,
  deleteProfile,
  updateProfile,
  adminUpdateTournamentFullname,
  updateProfileAliases,
  getNameMatchesForProfile,
  approvePendingFullname,
  rejectPendingFullname,
} from '../server-actions'
import type { Profile } from '@/types/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileJson,
  RefreshCw,
  Trash2,
  X,
  Pencil,
  Check,
  Tags,
  Search,
  Plus,
} from 'lucide-react'

type Role = 'student' | 'coach' | 'admin'
interface MatchEntry { name: string; unique_no: string | null }

// ── Aliases Modal ─────────────────────────────────────────────────────────────
interface AliasesModalProps {
  profile: Profile
  onClose: () => void
  onSave: (profileId: string, primaryName: string | null, aliases: string[]) => Promise<void>
}

function AliasesModal({ profile, onClose, onSave }: AliasesModalProps) {
  const [primaryName, setPrimaryName] = useState(profile.tournament_fullname || '')
  const [editingPrimary, setEditingPrimary] = useState(false)
  const [aliases, setAliases] = useState<string[]>(profile.tournament_aliases || [])
  const [saving, setSaving] = useState(false)

  // Matches state
  const [matchesLoaded, setMatchesLoaded] = useState(false)
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesExact, setMatchesExact] = useState<string | null>(null)
  const [matchesClose, setMatchesClose] = useState<MatchEntry[]>([])

  const loadMatches = async () => {
    if (!primaryName) return
    setMatchesLoading(true)
    const result = await getNameMatchesForProfile(profile.id)
    if (result.data) {
      setMatchesExact(result.data.exactMatch)
      setMatchesClose(result.data.closeMatches)
    }
    setMatchesLoaded(true)
    setMatchesLoading(false)
  }

  // Auto-load matches if tournament name exists
  useEffect(() => {
    if (primaryName && !matchesLoaded) loadMatches()
  }, [])

  const removeAlias = (name: string) => setAliases((prev) => prev.filter((a) => a !== name))

  const addAlias = (name: string) => {
    if (!aliases.includes(name)) setAliases((prev) => [...prev, name])
  }

  const setAsPrimary = (name: string) => {
    // Move old primary to aliases if it's different
    if (primaryName && primaryName !== name && !aliases.includes(primaryName)) {
      setAliases((prev) => [...prev, primaryName])
    }
    setPrimaryName(name)
    // Reload matches for the new name after save
    setMatchesLoaded(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(profile.id, primaryName || null, aliases)
    setSaving(false)
    onClose()
  }

  const allUsedNames = new Set([primaryName, ...aliases])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background border border-border rounded-sm shadow-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">Names &amp; Aliases</h3>
            <p className="text-sm text-muted-foreground">{profile.full_name || profile.id}</p>
          </div>
          <button className="p-1.5 rounded hover:bg-accent/50" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Primary Tournament Name */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Primary Tournament Name
            </p>
            {editingPrimary ? (
              <div className="flex gap-1">
                <Input
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { setEditingPrimary(false); setMatchesLoaded(false) }
                    if (e.key === 'Escape') setEditingPrimary(false)
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 px-0 flex-shrink-0"
                  onClick={() => { setEditingPrimary(false); setMatchesLoaded(false) }}>
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 px-0 flex-shrink-0"
                  onClick={() => setEditingPrimary(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{primaryName || '—'}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 px-0"
                  onClick={() => setEditingPrimary(true)}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* Confirmed Aliases */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Confirmed Aliases <span className="normal-case text-muted-foreground/60">({aliases.length})</span>
            </p>
            {aliases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No aliases confirmed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <div key={alias}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                    <span>{alias}</span>
                    <button onClick={() => removeAlias(alias)}
                      className="ml-0.5 hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chess SA Matches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Chess SA Matches
              </p>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={loadMatches} disabled={matchesLoading || !primaryName}>
                <Search className="h-3.5 w-3.5" />
                {matchesLoading ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {!matchesLoaded && !matchesLoading && (
              <p className="text-sm text-muted-foreground">
                {primaryName ? 'Click Search to find matches in the Chess SA database.' : 'Set a primary tournament name first.'}
              </p>
            )}

            {matchesLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            )}

            {matchesLoaded && !matchesLoading && !matchesExact && matchesClose.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches found in Chess SA database.</p>
            )}

            {matchesLoaded && !matchesLoading && (
              <div className="space-y-2">
                {matchesExact && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate">{matchesExact}</span>
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-green-500/40 text-green-600">Exact</Badge>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!allUsedNames.has(matchesExact) && (
                        <Button size="sm" variant="ghost"
                          className="h-6 text-xs px-2 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          onClick={() => addAlias(matchesExact!)}>
                          <Plus className="h-3 w-3 mr-1" /> Alias
                        </Button>
                      )}
                      {primaryName !== matchesExact && (
                        <Button size="sm" variant="ghost"
                          className="h-6 text-xs px-2 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          onClick={() => setAsPrimary(matchesExact!)}>
                          Set Primary
                        </Button>
                      )}
                      {allUsedNames.has(matchesExact) && (
                        <span className="text-xs text-green-600 dark:text-green-400 px-2">✓ Added</span>
                      )}
                    </div>
                  </div>
                )}

                {matchesClose.map((match, idx) => {
                  const used = allUsedNames.has(match.name)
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{match.name}</span>
                        {match.unique_no && (
                          <span className="text-xs font-mono text-blue-600/70 dark:text-blue-400/70 flex-shrink-0">#{match.unique_no}</span>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!used && (
                          <Button size="sm" variant="ghost"
                            className="h-6 text-xs px-2 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                            onClick={() => addAlias(match.name)}>
                            <Plus className="h-3 w-3 mr-1" /> Alias
                          </Button>
                        )}
                        {primaryName !== match.name && (
                          <Button size="sm" variant="ghost"
                            className="h-6 text-xs px-2 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                            onClick={() => setAsPrimary(match.name)}>
                            Set Primary
                          </Button>
                        )}
                        {used && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 px-2">✓ Added</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Table ────────────────────────────────────────────────────────────────
export function ProfilesTable() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  // Tournament name inline edit
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null)
  const [editingTournamentValue, setEditingTournamentValue] = useState('')

  // ChessA ID inline edit
  const [editingChessaId, setEditingChessaId] = useState<string | null>(null)
  const [editingChessaValue, setEditingChessaValue] = useState('')

  // Aliases modal
  const [aliasesProfile, setAliasesProfile] = useState<Profile | null>(null)

  // Pending fullname approve/reject
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const handleApprovePending = async (profileId: string) => {
    setPendingActionId(profileId)
    const result = await approvePendingFullname(profileId)
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, tournament_fullname: p.tournament_fullname_pending, tournament_fullname_pending: null }
            : p
        )
      )
    }
    setPendingActionId(null)
  }

  const handleRejectPending = async (profileId: string) => {
    setPendingActionId(profileId)
    const result = await rejectPendingFullname(profileId)
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, tournament_fullname_pending: null } : p
        )
      )
    }
    setPendingActionId(null)
  }

  const { page, itemsPerPage, totalPages, nextPage, prevPage, goToPage, changeItemsPerPage } =
    usePagination({ initialPage: 1, initialItemsPerPage: 50, totalItems: totalCount })
  const { isExporting, handleExport } = useExport<Profile>()

  const loadProfiles = async () => {
    setLoading(true)
    setError(null)
    const result = await getProfiles(page, itemsPerPage)
    if (result.error) {
      setError(result.error)
      setProfiles([])
    } else {
      setProfiles(result.data || [])
      setTotalCount(result.count || 0)
    }
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [page, itemsPerPage])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete profile for "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    const result = await deleteProfile(id)
    if (result.error) alert(`Error: ${result.error}`)
    else await loadProfiles()
    setDeletingId(null)
  }

  const handleRoleChange = async (profileId: string, newRole: Role) => {
    setUpdatingRoleId(profileId)
    const result = await updateProfile(profileId, { role: newRole })
    if (result.success) {
      setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, role: newRole } : p))
    }
    setUpdatingRoleId(null)
  }

  // Tournament name inline edit
  const startEditingTournament = (profile: Profile) => {
    setEditingTournamentId(profile.id)
    setEditingTournamentValue(profile.tournament_fullname || '')
  }
  const cancelEditingTournament = () => {
    setEditingTournamentId(null)
    setEditingTournamentValue('')
  }
  const saveTournamentName = async (profileId: string) => {
    const result = await adminUpdateTournamentFullname(profileId, editingTournamentValue)
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profileId ? { ...p, tournament_fullname: editingTournamentValue.trim() || null } : p)
      )
    }
    cancelEditingTournament()
  }

  // ChessA ID inline edit
  const startEditingChessa = (profile: Profile) => {
    setEditingChessaId(profile.id)
    setEditingChessaValue(profile.chessa_id || '')
  }
  const cancelEditingChessa = () => {
    setEditingChessaId(null)
    setEditingChessaValue('')
  }
  const saveChessaId = async (profileId: string) => {
    const result = await updateProfile(profileId, { chessa_id: editingChessaValue.trim() || null })
    if (result.success) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profileId ? { ...p, chessa_id: editingChessaValue.trim() || null } : p)
      )
    }
    cancelEditingChessa()
  }

  // Aliases modal save
  const handleSaveAliases = async (profileId: string, primaryName: string | null, aliases: string[]) => {
    const [r1, r2] = await Promise.all([
      adminUpdateTournamentFullname(profileId, primaryName || ''),
      updateProfileAliases(profileId, aliases),
    ])
    if (r1.success && r2.success) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, tournament_fullname: primaryName, tournament_aliases: aliases }
            : p
        )
      )
    }
  }

  // Exports
  const handleExportCSV = async () => {
    const result = await getAllProfilesForExport()
    if (result.data) await handleExport(result.data, 'profiles', {
      format: 'csv', scope: 'filtered',
      excludeFields: ['id', 'created_at', 'avatar_url'],
      fieldMapping: { full_name: 'Full Name', role: 'Role', tournament_fullname: 'Tournament Full Name', chessa_id: 'ChessA ID', tournament_aliases: 'Aliases' },
    })
  }
  const handleExportExcel = async () => {
    const result = await getAllProfilesForExport()
    if (result.data) await handleExport(result.data, 'profiles', {
      format: 'excel', scope: 'filtered',
      excludeFields: ['id', 'created_at', 'avatar_url'],
      fieldMapping: { full_name: 'Full Name', role: 'Role', tournament_fullname: 'Tournament Full Name', chessa_id: 'ChessA ID', tournament_aliases: 'Aliases' },
    })
  }
  const handleExportJSON = async () => {
    const result = await getAllProfilesForExport()
    if (result.data) await handleExport(result.data, 'profiles', {
      format: 'json', scope: 'filtered', includeMetadata: true, pretty: true,
      excludeFields: ['id', 'created_at'],
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':   return <Badge variant="destructive">Admin</Badge>
      case 'coach':   return <Badge variant="default">Coach</Badge>
      case 'student': return <Badge variant="secondary">Student</Badge>
      default:        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (loading && profiles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardHeader><CardTitle>User Profiles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {totalCount === 0 ? '0' : `${(page - 1) * itemsPerPage + 1}–${Math.min(page * itemsPerPage, totalCount)}`} of {totalCount}
            </span>
            <div className="flex flex-wrap gap-2">
              <Select value={itemsPerPage.toString()} onValueChange={(v) => changeItemsPerPage(Number(v))}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting || loading}>
                <FileText className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting || loading}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={isExporting || loading}>
                <FileJson className="w-4 h-4 mr-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={loadProfiles}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={loadProfiles} className="mt-2" variant="outline">Retry</Button>
        </div>
      )}

      {/* Table — no horizontal scroll, columns truncate on narrow screens */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">User</TableHead>
                <TableHead className="w-44 hidden sm:table-cell">Role</TableHead>
                <TableHead>Tournament Name</TableHead>
                <TableHead className="hidden md:table-cell">Pending</TableHead>
                <TableHead className="w-36 hidden lg:table-cell">ChessA ID</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No profiles found</TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    {/* Avatar + Name */}
                    <TableCell className="max-w-[192px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={profile.full_name || profile.id} size={28} className="flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{profile.full_name || '—'}</span>
                      </div>
                    </TableCell>

                    {/* Role — hidden on xs */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(profile.role)}
                        <Select
                          value={profile.role}
                          onValueChange={(v) => handleRoleChange(profile.id, v as Role)}
                          disabled={updatingRoleId === profile.id}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>

                    {/* Tournament name — inline edit + aliases button */}
                    <TableCell>
                      {editingTournamentId === profile.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingTournamentValue}
                            onChange={(e) => setEditingTournamentValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTournamentName(profile.id)
                              if (e.key === 'Escape') cancelEditingTournament()
                            }}
                            className="h-7 text-sm w-40"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0 flex-shrink-0"
                            onClick={() => saveTournamentName(profile.id)}>
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0 flex-shrink-0"
                            onClick={cancelEditingTournament}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm truncate max-w-[160px]">
                            {profile.tournament_fullname || '—'}
                          </span>
                          {/* Alias count badge */}
                          {(profile.tournament_aliases?.length ?? 0) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                              +{profile.tournament_aliases!.length}
                            </span>
                          )}
                          {/* Edit icon — always visible */}
                          <Button size="sm" variant="ghost" className="h-10 w-10 px-0 flex-shrink-0"
                            title="Edit tournament name"
                            onClick={() => startEditingTournament(profile)}>
                            <Pencil className="h-10 w-10 text-muted-foreground" />
                          </Button>
                          {/* Aliases / Matches icon — always visible */}
                          <Button size="sm" variant="ghost" className="h-10 w-10 px-0 flex-shrink-0"
                            title="Manage names & aliases"
                            onClick={() => setAliasesProfile(profile)}>
                            <Tags className="h-10 w-10 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>

                    {/* Pending fullname — hidden on sm and below */}
                    <TableCell className="hidden md:table-cell">
                      {profile.tournament_fullname_pending ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                            {profile.tournament_fullname_pending}
                          </span>
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 w-6 px-0 text-green-600 hover:text-green-700 hover:bg-green-500/10 flex-shrink-0"
                            title="Approve"
                            disabled={pendingActionId === profile.id}
                            onClick={() => handleApprovePending(profile.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 w-6 px-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            title="Reject"
                            disabled={pendingActionId === profile.id}
                            onClick={() => handleRejectPending(profile.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* ChessA ID — hidden on md and below */}
                    <TableCell className="hidden lg:table-cell">
                      {editingChessaId === profile.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingChessaValue}
                            onChange={(e) => setEditingChessaValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveChessaId(profile.id)
                              if (e.key === 'Escape') cancelEditingChessa()
                            }}
                            className="h-7 text-sm w-24"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-10 w-10 px-0 flex-shrink-0"
                            onClick={() => saveChessaId(profile.id)}>
                            <Check className="h-10 w-10 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-10 w-10 px-0 flex-shrink-0"
                            onClick={cancelEditingChessa}>
                            <X className="h-10 w-10 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">{profile.chessa_id || '—'}</span>
                          <Button size="sm" variant="ghost" className="h-10 w-10 px-0 flex-shrink-0"
                            title="Edit ChessA ID"
                            onClick={() => startEditingChessa(profile)}>
                            <Pencil className="h-10 w-10 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile.id, profile.full_name || 'this user')}
                        disabled={deletingId === profile.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
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
                  <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm"
                    onClick={() => goToPage(pageNum)}>
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

      {/* Names & Aliases Modal */}
      {aliasesProfile && (
        <AliasesModal
          profile={aliasesProfile}
          onClose={() => setAliasesProfile(null)}
          onSave={handleSaveAliases}
        />
      )}
    </div>
  )
}

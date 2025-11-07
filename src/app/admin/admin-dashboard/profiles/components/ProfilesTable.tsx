'use client'

import { useState, useEffect } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useExport } from '@/hooks/useExport'
import {
  getProfiles,
  getAllProfilesForExport,
  deleteProfile,
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
} from 'lucide-react'

export function ProfilesTable() {
  // State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Hooks
  const { filters, updateFilter, clearFilters, hasActiveFilters } =
    useTableFilters()
  const {
    page,
    itemsPerPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    changeItemsPerPage,
  } = usePagination({
    initialPage: 1,
    initialItemsPerPage: 50,
    totalItems: totalCount,
  })
  const { isExporting, handleExport } = useExport<Profile>()

  // Load profiles
  const loadProfiles = async () => {
    setLoading(true)
    setError(null)

    const result = await getProfiles(page, itemsPerPage, filters)

    if (result.error) {
      setError(result.error)
      setProfiles([])
    } else {
      setProfiles(result.data || [])
      setTotalCount(result.count || 0)
    }

    setLoading(false)
  }

  // Effects
  useEffect(() => {
    loadProfiles()
  }, [page, itemsPerPage, filters])

  // Delete handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete profile for "${name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(id)

    const result = await deleteProfile(id)

    if (result.error) {
      alert(`Error deleting profile: ${result.error}`)
    } else {
      // Reload profiles
      await loadProfiles()
    }

    setDeletingId(null)
  }

  // Export handlers
  const handleExportCSV = async () => {
    const result = await getAllProfilesForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'profiles', {
        format: 'csv',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'avatar_url'],
        fieldMapping: {
          full_name: 'Full Name',
          role: 'Role',
          tournament_fullname: 'Tournament Full Name',
          chessa_id: 'ChessA ID',
        },
      })
    }
  }

  const handleExportExcel = async () => {
    const result = await getAllProfilesForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'profiles', {
        format: 'excel',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'avatar_url'],
        fieldMapping: {
          full_name: 'Full Name',
          role: 'Role',
          tournament_fullname: 'Tournament Full Name',
          chessa_id: 'ChessA ID',
        },
      })
    }
  }

  const handleExportJSON = async () => {
    const result = await getAllProfilesForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'profiles', {
        format: 'json',
        scope: 'filtered',
        includeMetadata: true,
        pretty: true,
        excludeFields: ['id', 'created_at'],
      })
    }
  }

  // Get role badge color
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>
      case 'coach':
        return <Badge variant="default">Coach</Badge>
      case 'student':
        return <Badge variant="secondary">Student</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  // Loading skeleton
  if (loading && profiles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <Input
              placeholder="Search by name or ChessA ID..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full"
            />

            {/* Role Filter */}
            <Select
              value={filters.role || 'all'}
              onValueChange={(value) =>
                updateFilter('role', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * itemsPerPage + 1} -{' '}
                {Math.min(page * itemsPerPage, totalCount)} of {totalCount}
              </span>

              {/* Items per page */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => changeItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExporting || loading}
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || loading}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={isExporting || loading}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={loadProfiles}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadProfiles} className="mt-2" variant="outline">
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tournament Name</TableHead>
                  <TableHead>ChessA ID</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No profiles found
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={profile.full_name || profile.id} size={32} />
                          <span className="font-medium">{profile.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(profile.role)}</TableCell>
                      <TableCell>{profile.tournament_fullname || '-'}</TableCell>
                      <TableCell>{profile.chessa_id || '-'}</TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDelete(profile.id, profile.full_name || 'this user')
                          }
                          disabled={deletingId === profile.id}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }

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

            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

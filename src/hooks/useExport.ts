import { useState, useCallback } from 'react'
import { exportData } from '@/services/exportService'
import type { ExportOptions } from '@/types/admin'

interface UseExportReturn<T> {
  isExporting: boolean
  exportError: string | null
  handleExport: (
    data: T[],
    filename: string,
    options: ExportOptions
  ) => Promise<void>
}

/**
 * Hook for managing data exports
 */
export function useExport<T extends Record<string, any>>(): UseExportReturn<T> {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = useCallback(
    async (data: T[], filename: string, options: ExportOptions) => {
      setIsExporting(true)
      setExportError(null)

      try {
        // Validate data
        if (!data || data.length === 0) {
          throw new Error('No data to export')
        }

        // Perform export
        exportData(data, filename, options)

        // Success - export will trigger download
        console.log(
          `Successfully exported ${data.length} rows as ${options.format}`
        )
      } catch (error) {
        console.error('Export error:', error)
        setExportError(
          error instanceof Error ? error.message : 'Failed to export data'
        )
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  return {
    isExporting,
    exportError,
    handleExport,
  }
}

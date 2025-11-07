// Generic export service for admin dashboard
// Supports CSV, Excel, and JSON exports

import * as XLSX from "xlsx"
import type { ExportOptions } from "@/types/admin"

/**
 * Prepares data for export by excluding specified fields and applying field mapping
 */
export function prepareDataForExport<T extends Record<string, any>>(
  data: T[],
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
  }
): any[] {
  if (!data || data.length === 0) return []

  return data.map((row) => {
    const preparedRow: Record<string, any> = {}

    Object.keys(row).forEach((key) => {
      // Skip excluded fields (like internal IDs)
      if (options?.excludeFields?.includes(key)) return

      // Use field mapping if provided, otherwise use original key
      const displayKey = options?.fieldMapping?.[key] || key

      // Handle null/undefined values
      const value = row[key]
      preparedRow[displayKey] = value !== null && value !== undefined ? value : ""
    })

    return preparedRow
  })
}

/**
 * Exports data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
  }
): void {
  // Prepare data
  const preparedData = prepareDataForExport(data, options)

  if (preparedData.length === 0) {
    console.warn("No data to export")
    return
  }

  // Get headers
  const headers = Object.keys(preparedData[0])

  // Build CSV rows
  const csvRows = [
    headers.join(","), // Header row
    ...preparedData.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ""

          // Convert to string and escape
          const stringValue = String(value)

          // Escape commas, quotes, and newlines
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }

          return stringValue
        })
        .join(",")
    ),
  ]

  // Add BOM for Excel compatibility
  const csvContent = "\uFEFF" + csvRows.join("\n")

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports data to Excel format
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  sheetName: string,
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
    autoWidth?: boolean
    headerStyle?: boolean
  }
): void {
  // Prepare data
  const preparedData = prepareDataForExport(data, {
    excludeFields: options?.excludeFields,
    fieldMapping: options?.fieldMapping,
  })

  if (preparedData.length === 0) {
    console.warn("No data to export")
    return
  }

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(preparedData)

  // Auto-size columns if enabled
  if (options?.autoWidth !== false) {
    const maxWidth = 50 // Maximum column width
    const colWidths: number[] = []

    // Get headers
    const headers = Object.keys(preparedData[0])

    headers.forEach((header, colIndex) => {
      // Start with header length
      let maxLen = header.length

      // Check all rows for this column
      preparedData.forEach((row) => {
        const value = row[header]
        if (value !== null && value !== undefined) {
          const len = String(value).length
          maxLen = Math.max(maxLen, len)
        }
      })

      // Cap at maximum width
      colWidths[colIndex] = Math.min(maxLen + 2, maxWidth)
    })

    worksheet["!cols"] = colWidths.map((w) => ({ wch: w }))
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  })

  // Create blob and download
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports data to JSON format
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options?: {
    excludeFields?: string[]
    fieldMapping?: Record<string, string>
    includeMetadata?: boolean
    pretty?: boolean
  }
): void {
  // Prepare data
  const preparedData = prepareDataForExport(data, {
    excludeFields: options?.excludeFields,
    fieldMapping: options?.fieldMapping,
  })

  if (preparedData.length === 0) {
    console.warn("No data to export")
    return
  }

  // Build JSON structure
  let jsonData: any

  if (options?.includeMetadata) {
    jsonData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: preparedData.length,
        source: "Limpopo Chess Academy Admin Dashboard",
        version: "1.0",
      },
      data: preparedData,
    }
  } else {
    jsonData = preparedData
  }

  // Convert to JSON string
  const jsonString = options?.pretty
    ? JSON.stringify(jsonData, null, 2)
    : JSON.stringify(jsonData)

  // Create blob and download
  const blob = new Blob([jsonString], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generic export function that handles all formats
 */
export function exportData<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options: ExportOptions
): void {
  const { format, excludeFields, fieldMapping, includeMetadata, pretty } =
    options

  // Default fields to exclude (internal IDs)
  const defaultExcludeFields = ["id", "created_at", "updated_at"]
  const fieldsToExclude = [
    ...defaultExcludeFields,
    ...(excludeFields || []),
  ]

  switch (format) {
    case "csv":
      exportToCSV(data, filename, {
        excludeFields: fieldsToExclude,
        fieldMapping,
      })
      break

    case "excel":
      exportToExcel(data, "Data", filename, {
        excludeFields: fieldsToExclude,
        fieldMapping,
        autoWidth: true,
      })
      break

    case "json":
      exportToJSON(data, filename, {
        excludeFields: fieldsToExclude,
        fieldMapping,
        includeMetadata,
        pretty: pretty !== false, // Default to pretty print
      })
      break

    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Shared date parsing utilities for tournament parsers
 * Handles Excel serial numbers, date ranges, and various date formats
 */

/**
 * Parse a date string that may be in various formats:
 * - Excel serial number (e.g., 45321)
 * - ISO format (YYYY-MM-DD or YYYY/MM/DD)
 * - Date range (e.g., "2025/10/03 to 2025/10/04")
 *
 * For date ranges, returns the start date only.
 * Always returns dates in ISO format (YYYY-MM-DD) or undefined if parsing fails.
 */
export function parseDate(rawDate: string | null | undefined): string | undefined {
  if (!rawDate) return undefined

  const dateStr = String(rawDate).trim()
  if (!dateStr) return undefined

  // Strategy 1: Handle date ranges - extract start date
  // Formats: "2025/10/03 to 2025/10/04", "2024-01-15 To 2024-01-20"
  const rangeMatch = dateStr.match(/(\d{4}[\/\-]\d{2}[\/\-]\d{2})\s+(?:to|To|TO|-)\s+\d{4}[\/\-]\d{2}[\/\-]\d{2}/)
  if (rangeMatch) {
    const startDate = rangeMatch[1]
    console.log(`Date range detected: "${dateStr}", extracting start date: "${startDate}"`)
    // Recursively parse the extracted start date
    return parseDate(startDate)
  }

  // Strategy 2: Excel serial number detection
  // Excel stores dates as numbers (days since 1900-01-01)
  const serialNumber = parseFloat(dateStr)
  if (!isNaN(serialNumber) && serialNumber > 0 && serialNumber < 100000) {
    // Excel epoch: January 1, 1900
    const excelEpoch = new Date(1900, 0, 1)
    const jsDate = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000)

    // Excel has a bug: treats 1900 as a leap year (it wasn't)
    // Need to subtract 1 day for dates after Feb 28, 1900
    if (serialNumber > 59) {
      jsDate.setDate(jsDate.getDate() - 1)
    }

    const isoDate = jsDate.toISOString().split('T')[0]
    console.log(`Excel serial number ${serialNumber} converted to: ${isoDate}`)
    return isoDate
  }

  // Strategy 3: YYYY-MM-DD or YYYY/MM/DD format
  const dateMatch = dateStr.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
  if (dateMatch) {
    const isoDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    console.log(`Date parsed from YYYY-MM-DD format: ${isoDate}`)
    return isoDate
  }

  // Strategy 4: Try to parse as JS Date and convert
  const parsedDate = new Date(dateStr)
  if (!isNaN(parsedDate.getTime())) {
    const isoDate = parsedDate.toISOString().split('T')[0]
    console.log(`Date parsed using Date constructor: ${isoDate}`)
    return isoDate
  }

  // Fallback: return raw string if nothing worked
  console.warn(`Could not parse date: "${dateStr}", returning as-is`)
  return dateStr
}

/**
 * Parse a number value that might be stored as a string
 */
export function parseNumber(val: any): number | null {
  if (val === null || val === undefined) return null
  const cleaned = String(val).trim()
  if (!cleaned || cleaned === '-') return null
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? null : n
}

/**
 * Parse a float value that might be stored as a string
 */
export function parseFloatValue(val: any): number | null {
  if (val === null || val === undefined) return null
  const cleaned = String(val).trim()
  if (!cleaned || cleaned === '-') return null
  const n = Number.parseFloat(cleaned)
  return isNaN(n) ? null : n
}

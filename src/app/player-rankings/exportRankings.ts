/**
 * Client-side export of the CURRENT rankings view (filters + sort applied) to
 * .xlsx / .pdf. Both generators are dynamically imported so neither library
 * touches the page bundle until a download is actually requested.
 */

import type { RankedSummary } from "@/lib/rankings"
import type { SelectionVerdict } from "@/lib/cdcSelection"
import { ageGroupOf } from "./FilterBar"

export type ExportFormat = "xlsx" | "pdf"

export interface ExportContext {
  /** Full filtered+sorted list (not capped at the visible 50). */
  players: RankedSummary[]
  /** CDC selection columns (Meets requirements / Comments) apply to this view. */
  selection: boolean
  verdicts: Map<string, SelectionVerdict>
  /** Human-readable scope, as shown by the filter chips (+ search). */
  scope: string[]
}

const TITLE = "LCA Player Rankings"
const DISCLAIMER =
  "Compiled independently for general information — not an official list of, or endorsed by, Capricorn District Chess or Chess Limpopo."

interface ExportRow {
  n: number
  p: RankedSummary
  v: SelectionVerdict | null
}

/** One column definition drives both formats. `pdf: false` columns (IDs, birth
 *  year, title) are Excel-only so the landscape PDF stays readable. */
interface Col {
  label: string
  pdf: boolean
  /** Only present when the CDC selection view is active. */
  sel?: boolean
  num?: boolean
  value: (r: ExportRow) => string | number
  /** PDF override (e.g. name with the title merged in). */
  pdfValue?: (r: ExportRow) => string | number
}

const dash = <T,>(v: T | null | undefined): T | string => v ?? ""

const COLS: Col[] = [
  { label: "#", pdf: true, num: true, value: (r) => r.n },
  {
    label: "Player", pdf: true,
    value: (r) => r.p.name,
    pdfValue: (r) => (r.p.title ? `${r.p.name} (${r.p.title})` : r.p.name),
  },
  { label: "Title", pdf: false, value: (r) => dash(r.p.title) },
  { label: "Gender", pdf: true, value: (r) => dash(r.p.sex) },
  { label: "Fed", pdf: true, value: (r) => dash(r.p.federation) },
  { label: "Age", pdf: true, value: (r) => ageGroupOf(r.p.birthYear).replace("—", "") },
  { label: "Birth year", pdf: false, num: true, value: (r) => dash(r.p.birthYear) },
  { label: "Chess SA ID", pdf: false, value: (r) => dash(r.p.uniqueNo) },
  { label: "FIDE ID", pdf: false, value: (r) => dash(r.p.fideId) },
  { label: "Chess SA", pdf: true, num: true, value: (r) => dash(r.p.currentRating) },
  { label: "FIDE", pdf: true, num: true, value: (r) => dash(r.p.fideRating) },
  { label: "Avg perf", pdf: true, num: true, value: (r) => r.p.avgPerf },
  { label: "Best perf", pdf: true, num: true, value: (r) => r.p.bestPerf },
  { label: "Events", pdf: true, num: true, value: (r) => r.p.ratedTournaments },
  { label: "Junior", pdf: true, num: true, value: (r) => r.p.juniorTournaments },
  { label: "Open", pdf: true, num: true, value: (r) => r.p.openTournaments },
  { label: "Meets requirements", pdf: true, sel: true, value: (r) => (r.v ? (r.v.meets ? "Yes" : "No") : "") },
  { label: "Comments", pdf: true, sel: true, value: (r) => dash(r.v?.comment) },
]

function buildRows(ctx: ExportContext): ExportRow[] {
  return ctx.players.map((p, i) => ({ n: i + 1, p, v: ctx.verdicts.get(p.key) ?? null }))
}

function metaLines(ctx: ExportContext): string[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    `Showing: ${ctx.scope.length ? ctx.scope.join("  ·  ") : "All players"}`,
    `Generated ${today}  ·  ${ctx.players.length} players`,
  ]
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const fileStem = () => `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_player_rankings`

async function exportXlsx(ctx: ExportContext) {
  const ExcelJS = (await import("exceljs")).default
  const cols = COLS.filter((c) => !c.sel || ctx.selection)
  const rows = buildRows(ctx)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Rankings", { views: [{ state: "frozen", ySplit: 5 }] })

  ws.addRow([TITLE]).font = { bold: true, size: 14 }
  for (const line of metaLines(ctx)) ws.addRow([line]).font = { size: 10, color: { argb: "FF555555" } }
  ws.addRow([DISCLAIMER]).font = { italic: true, size: 9, color: { argb: "FF888888" } }

  const head = ws.addRow(cols.map((c) => c.label))
  head.font = { bold: true, size: 10 }
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } }
    cell.border = { bottom: { style: "thin" } }
  })

  for (const r of rows) ws.addRow(cols.map((c) => c.value(r)))

  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1)
    col.width = c.label === "Player" ? 30 : c.label === "Comments" ? 42 : Math.max(c.label.length + 2, 9)
    if (c.num) col.alignment = { horizontal: "right" }
  })

  const buf = await wb.xlsx.writeBuffer()
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileStem()}.xlsx`,
  )
}

// Brand (matches globals.css --primary + the logo's navy stars).
const BRAND_BLUE: [number, number, number] = [59, 130, 246]
const BRAND_NAVY: [number, number, number] = [30, 58, 138]
const ROW_STRIPE: [number, number, number] = [240, 246, 254]
const SITE = "limpopochessacademy.co.za"
const LOGO_SRC = "/pawn_no_bg.png" // transparent bg, 747×664

/** Site logo as a data URL for jsPDF, downscaled to header size so the full-res
 *  PNG isn't embedded raw (megabytes); null (text-only header) on failure. */
async function logoDataUrl(): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(await (await fetch(LOGO_SRC)).blob())
    const canvas = document.createElement("canvas")
    canvas.width = 216
    canvas.height = Math.round((216 * bmp.height) / bmp.width)
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

async function exportPdf(ctx: ExportContext) {
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    logoDataUrl(),
  ])
  const cols = COLS.filter((c) => c.pdf && (!c.sel || ctx.selection))
  const rows = buildRows(ctx)

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const RIGHT = 283 // table right edge (297 - 14 margin)

  // Header band: logo + title/site on the left, the whole scope as ONE
  // right-aligned line sharing the logo's baseline.
  let textX = 14
  if (logo) {
    doc.addImage(logo, "PNG", 14, 6, 18, 16)
    textX = 36
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.setTextColor(...BRAND_NAVY)
  // Stroke on top of the fill fakes a heavier weight (jsPDF has no black/heavy
  // helvetica); negative charSpace = tightest tracking.
  doc.setDrawColor(...BRAND_NAVY)
  doc.setLineWidth(0.18)
  doc.text(TITLE, textX, 14, { charSpace: -0.15, renderingMode: "fillThenStroke" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND_BLUE)
  doc.text(SITE, textX, 19.5)
  const metaLeft = textX + doc.getTextWidth(SITE) + 8

  const meta = [
    ...(ctx.scope.length ? ctx.scope : ["All players"]),
    `Generated ${new Date().toISOString().slice(0, 10)}`,
    `${ctx.players.length} players`,
  ].join("  ·  ")
  doc.setTextColor(90)
  let metaSize = 9
  doc.setFontSize(metaSize)
  const maxMetaW = RIGHT - metaLeft
  while (doc.getTextWidth(meta) > maxMetaW && metaSize > 6) {
    metaSize -= 0.5
    doc.setFontSize(metaSize)
  }
  doc.text(meta, RIGHT, 19.5, { align: "right" })

  autoTable(doc, {
    head: [cols.map((c) => c.label)],
    body: rows.map((r) => cols.map((c) => String((c.pdfValue ?? c.value)(r)))),
    startY: 26,
    margin: { left: 14, right: 14, bottom: 16 },
    styles: { fontSize: 7.5, cellPadding: 1.4, overflow: "ellipsize", halign: "left" },
    headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontSize: 7.5, halign: "left" },
    alternateRowStyles: { fillColor: ROW_STRIPE },
    columnStyles: Object.fromEntries(
      cols.flatMap((c, i) =>
        c.label === "Player" ? [[i, { cellWidth: 46 }]] : c.label === "Comments" ? [[i, { cellWidth: 56 }]] : [],
      ),
    ),
  })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(DISCLAIMER, 14, 202)
    doc.text(`Page ${i} of ${pages}`, RIGHT, 202, { align: "right" })
  }

  doc.save(`${fileStem()}.pdf`)
}

export async function exportRankings(format: ExportFormat, ctx: ExportContext): Promise<void> {
  if (format === "xlsx") await exportXlsx(ctx)
  else await exportPdf(ctx)
}

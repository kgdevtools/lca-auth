"use client"

import * as React from "react"
import { formatDateTimeUTC } from "@/lib/utils"

type Registration = {
  id: string
  created_at: string
  data_entry: Record<string, any> | null
}

export function RegistrationsTable({ registrations }: { registrations: Registration[] | null }) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Registration | null>(null)

  function openModal(reg: Registration) {
    setSelected(reg)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setTimeout(() => setSelected(null), 200)
  }

  return (
    <>
      {registrations && registrations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted-foreground)]">
              <tr>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">DOB</th>
                <th className="py-2 pr-3">Experience</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const d = (r.data_entry || {}) as any
                const name = [d.firstName, d.lastName].filter(Boolean).join(' ')
                return (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--card),black_4%)] cursor-pointer"
                    onClick={() => openModal(r)}
                  >
                    <td className="py-2 pr-3 font-mono text-[12px]">{String(r.id).slice(0, 8)}…</td>
                    <td className="py-2 pr-3">{name || '—'}</td>
                    <td className="py-2 pr-3">{d.dob || '—'}</td>
                    <td className="py-2 pr-3 capitalize">{d.experience || '—'}</td>
                    <td className="py-2 pr-3">{formatDateTimeUTC(r.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">No registrations yet.</p>
      )}

      {/* Modal */}
      {open && selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="w-full sm:w-[36rem] max-w-[42rem] rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border)]">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">Registration Details</h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--card-foreground),transparent_95%)]"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
              <div className="text-[var(--muted-foreground)]">ID</div>
              <div className="font-mono text-[12px] break-all">{selected.id}</div>
              <div className="text-[var(--muted-foreground)]">Created</div>
              <div>{formatDateTimeUTC(selected.created_at)}</div>
              {(() => {
                const d = (selected.data_entry ?? {}) as Record<string, any>
                const pairs: Array<[string, any]> = [
                  ["First name", d.firstName],
                  ["Last name", d.lastName],
                  ["Date of birth", d.dob],
                  ["Experience", d.experience],
                  ["Parent/Guardian name", d.parentName],
                  ["Parent/Guardian contact", d.parentContact],
                  ["Emergency contact", d.emergencyContact],
                  ["Emergency phone", d.emergencyPhone],
                  ["FIDE ID", d.fideId],
                  ["ChessSA ID", d.chessSaId],
                  ["Rating", d.rating],
                  ["Comments", d.comments],
                ]
                return pairs.map(([label, value]) => (
                  <React.Fragment key={label as string}>
                    <div className="text-[var(--muted-foreground)]">{label}</div>
                    <div className="font-medium">{value ? String(value) : '—'}</div>
                  </React.Fragment>
                ))
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default RegistrationsTable



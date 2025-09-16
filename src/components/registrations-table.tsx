"use client"

import * as React from "react"
import { formatDateTimeUTC } from "@/lib/utils"
import { Tournament } from "@/types/database"

// Change the type definition to Tournament
// type Registration = {
//   id: string
//   created_at: string
//   data_entry: Record<string, any> | null
// }

export function RegistrationsTable({ registrations }: { registrations: Tournament[] | null }) {
  // Removed state and modal functionality as it's not applicable for simple tournament display
  // const [open, setOpen] = React.useState(false)
  // const [selected, setSelected] = React.useState<Tournament | null>(null)

  // function openModal(reg: Tournament) {
  //   setSelected(reg)
  //   setOpen(true)
  // }

  // function closeModal() {
  //   setOpen(false)
  //   setTimeout(() => setSelected(null), 200)
  // }

  return (
    <>
      {registrations && registrations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Tournament Name</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Organizer</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((t) => {
                return (
                  <tr
                    key={t.id}
                    className="border-t border-border hover:bg-muted cursor-pointer"
                    // onClick={() => openModal(t)}
                  >
                    <td className="py-2 pr-3 font-medium">{t.tournament_name || '—'}</td>
                    <td className="py-2 pr-3">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
                    <td className="py-2 pr-3">{t.organizer || '—'}</td>
                    <td className="py-2 pr-3">{t.location || '—'}</td>
                    <td className="py-2 pr-3 capitalize">{t.tournament_type || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tournaments registered yet.</p>
      )}
    </>
  )
}

export default RegistrationsTable



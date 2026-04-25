import type { Metadata } from 'next'
import RegistrationsTable from './components/RegistrationsTable'

export const metadata: Metadata = {
  title: 'Registrations | Admin Dashboard',
}

export default function RegistrationsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          Player Registrations
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          Submitted registration forms
        </p>
      </div>
      <RegistrationsTable />
    </div>
  )
}

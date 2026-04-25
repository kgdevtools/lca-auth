import type { Metadata } from 'next'
import ContactsTable from './ContactsTable'

export const metadata: Metadata = {
  title: 'Contacts | Admin Dashboard',
}

export default function ContactsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          Contact Submissions
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          Messages sent via the contact form
        </p>
      </div>
      <ContactsTable />
    </div>
  )
}

// import DashboardSidebar from "../components/DashboardSidebar";
import PlayersTable from "./components/PlayersTable"

export default function PlayersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      {/* <DashboardSidebar /> */}

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight leading-tight text-foreground">Players Management</h1>
          <p className="text-muted-foreground tracking-tight leading-tight">
            Manage active players and resolve reconciliation issues.
          </p>
        </div>

        {/* Responsive grid for cards & tables */}
        <div className="grid gap-6">
          <PlayersTable />
        </div>
      </main>
    </div>
  )
}

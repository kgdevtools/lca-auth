// src/app/admin/admin-dashboard/reconcile/page.tsx
import { Suspense } from 'react';
import { getUnreconciledPlayers, getReconciliationStats, exportReconciliationReport } from './actions';
import ReconciliationStats from './components/ReconciliationStats';
import PlayersReconciliationTable from './components/PlayersReconciliationTable';
import DashboardHeader from '@/components/ui/DashboardHeader';

async function ReconciliationContent() {
  const [players, stats] = await Promise.all([
    getUnreconciledPlayers(),
    getReconciliationStats()
  ]);

  return (
    <>
      <ReconciliationStats stats={stats} />
      <PlayersReconciliationTable players={players} />
    </>
  );
}

async function handleExport() {
  try {
    const result = await exportReconciliationReport();
    if (result.success) {
      // Show success notification - you might want to use a toast library
      console.log(`Exported ${result.count} records successfully`);
      // Example with toast: toast.success(`Exported ${result.count} records successfully`);
    } else {
      // Show error notification
      console.error('Export failed:', result.error);
      // Example with toast: toast.error(`Export failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    // Example with toast: toast.error('An unexpected error occurred during export');
  }
}

export default function ReconciliationPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <DashboardHeader
          title="Player Reconciliation"
          description="Manage unresolved player records and performance ratings"
          actionLabel="Export Report"
          onAction={handleExport}
        />

        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-6 animate-pulse border border-border">
                  <div className="h-4 bg-muted rounded mb-3"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-xl p-6 animate-pulse border border-border">
              <div className="h-6 bg-muted rounded mb-6 w-1/4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        }>
          <ReconciliationContent />
        </Suspense>
      </div>
    </div>
  );
}

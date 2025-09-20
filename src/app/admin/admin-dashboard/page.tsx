// src/app/admin/admin-dashboard/page.tsx
import { Suspense } from 'react'
import DashboardOverview from './components/DashboardOverview'

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      {/* <div className="hidden lg:block">
        <DashboardSidebar />
      </div> */}

      {/* Main Content */}
      <div className="flex-1">
        <div className="px-1 py-4 lg:px-4 lg:py-8">
          <div className="space-y-6 lg:space-y-8">
            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard Overview</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 lg:mt-2 text-sm lg:text-base">
                Welcome to your chess academy admin dashboard
              </p>
            </div>

            {/* Stats Cards */}
            <Suspense fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            }>
              <DashboardOverview />
            </Suspense>


          </div>
        </div>
      </div>
    </div>
  )
}

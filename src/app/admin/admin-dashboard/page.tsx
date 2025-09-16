// src/app/admin/admin-dashboard/page.tsx
import { Suspense } from 'react'
import DashboardOverview from './components/DashboardOverview'
import TournamentsChart from './components/TournamentsChart'

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

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              <Suspense fallback={
                <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
                  <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              }>
                <TournamentsChart />
              </Suspense>
              
              {/* Placeholder for second chart */}
              <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Player Performance</h3>
                <div className="h-64 bg-gray-50 dark:bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-3 animate-pulse"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Coming soon...</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Player ratings & performance metrics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

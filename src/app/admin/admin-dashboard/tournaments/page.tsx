// src/app/admin/admin-dashboard/tournaments/page.tsx
import { Suspense } from 'react'
import DashboardSidebar from '../components/DashboardSidebar'
import TournamentsTable from './TournamentsTable'

export default function TournamentsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            id="mobile-menu-toggle"
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tournaments</h1>
          <div className="w-10" />
        </div>

        <div className="h-full overflow-auto">
          <div className="px-2 py-4 lg:px-8 lg:py-8 max-w-full">
            <div className="space-y-6">
              {/* Header with Chess SVG Icon */}
              <div className="text-center pb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg mb-4">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.5 2h-15c-.828 0-1.5.672-1.5 1.5v17c0 .828.672 1.5 1.5 1.5h15c.828 0 1.5-.672 1.5-1.5v-17c0-.828-.672-1.5-1.5-1.5zm-7.5 18h-8v-8h8v8zm8 0h-6v-8h6v8zm0-10h-14v-6h14v6z"/>
                    <circle cx="6" cy="6" r="1"/>
                    <circle cx="10" cy="6" r="1"/>
                    <circle cx="14" cy="6" r="1"/>
                    <circle cx="18" cy="6" r="1"/>
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 drop-shadow-sm">Tournament Management</h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Manage your chess tournaments and events</p>
              </div>

              {/* Tournaments Table */}
              <Suspense fallback={
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4 animate-pulse"></div>
                    <div className="flex space-x-4">
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="p-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/8 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/8 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              }>
                <TournamentsTable />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

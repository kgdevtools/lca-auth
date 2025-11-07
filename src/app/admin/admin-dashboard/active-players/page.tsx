import { Suspense } from 'react'
import ActivePlayersTableRefactored from './components/ActivePlayersTableRefactored'

export const metadata = {
  title: 'Active Players | Admin Dashboard',
  description: 'View and manage active chess players',
}

export default function ActivePlayersPage() {
  return (
    <div className="px-2 py-4 lg:px-8 lg:py-8 max-w-full">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            Active Players Database
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm tracking-tight leading-tight">
            Active players from August 2025 tournament season with performance metrics
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4 animate-pulse"></div>
                <div className="flex space-x-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                </div>
              </div>
            </div>
          }
        >
          <ActivePlayersTableRefactored />
        </Suspense>
      </div>
    </div>
  )
}

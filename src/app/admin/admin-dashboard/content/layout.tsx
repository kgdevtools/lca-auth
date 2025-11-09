'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Content Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage blog posts, media, categories, and tags
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="border-b">
        <nav className="flex gap-6">
          <Link
            href="/admin/admin-dashboard/content/blog-posts"
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              isActive('/admin/admin-dashboard/content/blog-posts')
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            Blog Posts
          </Link>
          <Link
            href="/admin/admin-dashboard/content/media-library"
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              isActive('/admin/admin-dashboard/content/media-library')
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            Media Library
          </Link>
          <Link
            href="/admin/admin-dashboard/content/categories"
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              isActive('/admin/admin-dashboard/content/categories')
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            Categories
          </Link>
          <Link
            href="/admin/admin-dashboard/content/tags"
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              isActive('/admin/admin-dashboard/content/tags')
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            Tags
          </Link>
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Eye, Edit, Trash2, Search } from 'lucide-react'
import type { EnhancedBlogPreview } from '@/types/blog-enhancement'
import { formatDistanceToNow } from 'date-fns'

interface BlogPostsTableProps {
  posts: EnhancedBlogPreview[]
}

export default function BlogPostsTable({ posts }: BlogPostsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'finalized' | 'draft'>('all')

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'finalized' && post.is_finalized) ||
      (statusFilter === 'draft' && !post.is_finalized)

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (post: EnhancedBlogPreview) => {
    if (!post.enhancement_id) {
      return <Badge variant="outline">Not Enhanced</Badge>
    }
    if (post.is_finalized) {
      return <Badge className="bg-green-500">Published</Badge>
    }
    return <Badge variant="secondary">Draft</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'finalized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('finalized')}
          >
            Published
          </Button>
          <Button
            variant={statusFilter === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('draft')}
          >
            Drafts
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No blog posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => (
                <TableRow key={post.contentful_id}>
                  {/* Thumbnail */}
                  <TableCell>
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>

                  {/* Title */}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold tracking-tight leading-tight line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {post.slug}
                      </p>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(post)}</TableCell>

                  {/* Category */}
                  <TableCell>
                    {post.category ? (
                      <Badge variant="outline">{post.category}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    {post.tags && post.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {post.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{post.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Views */}
                  <TableCell className="text-right font-mono text-sm">
                    {post.view_count.toLocaleString()}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.date), { addSuffix: true })}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="w-4 h-4 mr-2" />
                            View Post
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/admin-dashboard/content/blog-posts/${
                              post.enhancement_id || 'new'
                            }?contentful_id=${post.contentful_id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {post.enhancement_id ? 'Edit Enhancement' : 'Enhance Post'}
                          </Link>
                        </DropdownMenuItem>
                        {post.enhancement_id && (
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Enhancement
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stats */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>
          Showing {filteredPosts.length} of {posts.length} posts
        </p>
        <p>
          {posts.filter((p) => p.is_finalized).length} published •{' '}
          {posts.filter((p) => !p.enhancement_id).length} not enhanced
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Loader2, Hash } from 'lucide-react'
import { toast } from 'sonner'
import type { BlogTag } from '@/types/blog-enhancement'

interface TagsClientProps {
  initialTags: BlogTag[]
}

export default function TagsClient({ initialTags }: TagsClientProps) {
  const [tags, setTags] = useState<BlogTag[]>(initialTags)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Tag name is required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: generateSlug(name),
        }),
      })

      if (response.ok) {
        const newTag = await response.json()
        setTags([newTag, ...tags])
        toast.success('Tag created successfully')
        setIsCreateOpen(false)
        setName('')
      } else {
        toast.error('Failed to create tag')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error('Failed to create tag')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!editingTag || !name.trim()) {
      toast.error('Tag name is required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/blog/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: generateSlug(name),
        }),
      })

      if (response.ok) {
        const updatedTag = await response.json()
        setTags(tags.map((t) => (t.id === updatedTag.id ? updatedTag : t)))
        toast.success('Tag updated successfully')
        setIsEditOpen(false)
        setEditingTag(null)
        setName('')
      } else {
        toast.error('Failed to update tag')
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      toast.error('Failed to update tag')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return

    try {
      const response = await fetch(`/api/blog/tags/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTags(tags.filter((t) => t.id !== id))
        toast.success('Tag deleted successfully')
      } else {
        toast.error('Failed to delete tag')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Failed to delete tag')
    }
  }

  const openEditDialog = (tag: BlogTag) => {
    setEditingTag(tag)
    setName(tag.name)
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tags</h2>
          <p className="text-sm text-muted-foreground">
            Manage tags for blog post organization
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Tag Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g., Beginner, Strategy, Opening"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Slug will be auto-generated: {name ? generateSlug(name) : '...'}
                </p>
              </div>
              <Button onClick={handleCreate} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Tag'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tag Name *</Label>
              <Input
                id="edit-name"
                placeholder="Tag name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Slug will be: {name ? generateSlug(name) : '...'}
              </p>
            </div>
            <Button onClick={handleEdit} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Tag'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tags Display */}
      <Card className="p-6">
        {tags.length === 0 ? (
          <div className="text-center py-12">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No tags yet. Create your first tag to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Card key={tag.id} className="p-3 group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {tag.name}
                  </Badge>
                  {tag.usage_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {tag.usage_count} {tag.usage_count === 1 ? 'post' : 'posts'}
                    </span>
                  )}
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(tag)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Stats */}
      <p className="text-sm text-muted-foreground">{tags.length} tags total</p>
    </div>
  )
}

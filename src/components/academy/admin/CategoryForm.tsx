'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createCategory } from '@/services/lessonService'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export default function CategoryForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    // Only auto-generate if user hasn't manually edited the slug
    if (!slugManuallyEdited) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSlugChange = (value: string) => {
    setSlug(value)
    setSlugManuallyEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createCategory({
        name,
        description,
        slug,
        icon,
        display_order: parseInt(displayOrder) || 0,
      })

      toast.success('Category created successfully!', {
        description: 'Redirecting to categories list...',
      })

      // Delay redirect to show toast
      setTimeout(() => {
        router.push('/academy/admin/categories')
        router.refresh()
      }, 1000)
    } catch (error: any) {
      console.error('Error creating category:', error)

      // Handle specific error types
      if (error.message?.includes('Unauthorized')) {
        toast.error('Permission Denied', {
          description: 'You do not have permission to create categories. Contact an administrator.',
        })
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Category Already Exists', {
          description: 'A category with this slug already exists. Please use a different name.',
        })
      } else {
        toast.error('Failed to Create Category', {
          description: error.message || 'An unexpected error occurred. Please try again.',
        })
      }

      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Provide information about the category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Opening Theory (max 100 characters)"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {name.length}/100 characters
            </p>
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="opening-theory (max 100 characters)"
              maxLength={100}
              required
              pattern="[a-z0-9-]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly identifier (auto-generated from name) • {slug.length}/100 characters
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Learn the fundamentals of chess openings... (max 500 characters)"
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Icon (Lucide Icon Name)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Castle"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: e.g., Castle, Sword, Flag
              </p>
            </div>

            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Category
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

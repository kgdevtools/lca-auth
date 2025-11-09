'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Eye, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type {
  BlogPostEnhancement,
  BlogComponentPlacement,
  ComponentZone,
  COMPONENT_ZONES,
} from '@/types/blog-enhancement'
import { COMPONENT_ZONES as ZONES } from '@/types/blog-enhancement'
import ComponentZoneEditor from './ComponentZoneEditor'
import BlogPostPreview from './BlogPostPreview'

interface BlogEnhancementEditorProps {
  mode: 'create' | 'edit'
  contentfulId: string
  enhancement?: BlogPostEnhancement
  existingComponents?: BlogComponentPlacement[]
}

export default function BlogEnhancementEditor({
  mode,
  contentfulId,
  enhancement,
  existingComponents = [],
}: BlogEnhancementEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [contentfulPost, setContentfulPost] = useState<any>(null)

  // Form state
  const [category, setCategory] = useState(enhancement?.category || '')
  const [tags, setTags] = useState<string[]>(enhancement?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [isFeatured, setIsFeatured] = useState(enhancement?.is_featured || false)
  const [components, setComponents] = useState<BlogComponentPlacement[]>(existingComponents)

  // Fetch Contentful post
  useEffect(() => {
    async function fetchContentfulPost() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/blog/contentful/${contentfulId}`)
        if (response.ok) {
          const data = await response.json()
          setContentfulPost(data)
        }
      } catch (error) {
        console.error('Error fetching Contentful post:', error)
        toast.error('Failed to load blog post')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContentfulPost()
  }, [contentfulId])

  // Sync components state with existingComponents prop (for edit mode)
  useEffect(() => {
    if (existingComponents.length > 0) {
      setComponents(existingComponents)
    }
  }, [existingComponents])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/blog/enhancements', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: enhancement?.id,
          contentful_id: contentfulId,
          slug: contentfulPost?.slug,
          category,
          tags,
          is_featured: isFeatured,
          layout_type: 'default',
          is_finalized: false,
          components,
        }),
      })

      if (response.ok) {
        toast.success('Draft saved successfully')
        router.refresh()
      } else {
        toast.error('Failed to save draft')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/blog/enhancements/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: enhancement?.id,
          contentful_id: contentfulId,
          slug: contentfulPost?.slug,
          category,
          tags,
          is_featured: isFeatured,
          layout_type: 'default',
          components,
        }),
      })

      if (response.ok) {
        toast.success('Blog post published successfully!')
        router.push('/admin/admin-dashboard/content/blog-posts')
      } else {
        toast.error('Failed to publish blog post')
      }
    } catch (error) {
      console.error('Error publishing:', error)
      toast.error('Failed to publish blog post')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contentfulPost) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Blog post not found</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{contentfulPost.title}</h1>
            <p className="text-sm text-muted-foreground">{contentfulPost.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={isSaving}>
            <Eye className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden mt-6">
        {/* Left Panel - Controls */}
        <div className="w-1/3 overflow-y-auto space-y-6 pr-2">
          {/* Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Tutorials, News, Analysis"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="featured">Featured Post</Label>
              </div>
            </CardContent>
          </Card>

          {/* Component Zones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Components</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add custom components to enhance your blog post
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {ZONES.map((zoneInfo) => (
                <ComponentZoneEditor
                  key={zoneInfo.zone}
                  zone={zoneInfo.zone}
                  zoneInfo={zoneInfo}
                  components={components.filter((c) => c.zone === zoneInfo.zone)}
                  onComponentsChange={(zoneComponents) => {
                    // Update components for this zone
                    const otherComponents = components.filter(
                      (c) => c.zone !== zoneInfo.zone
                    )
                    setComponents([...otherComponents, ...zoneComponents])
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-6">
          <BlogPostPreview
            post={contentfulPost}
            components={components}
            category={category}
            tags={tags}
            isFeatured={isFeatured}
          />
        </div>
      </div>
    </div>
  )
}

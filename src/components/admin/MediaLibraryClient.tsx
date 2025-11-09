'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Image as ImageIcon,
  Video,
  Search,
  Loader2,
  X,
  Copy,
  Trash2,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { BlogMedia } from '@/types/blog-enhancement'

interface MediaLibraryClientProps {
  initialMedia: BlogMedia[]
}

export default function MediaLibraryClient({ initialMedia }: MediaLibraryClientProps) {
  const [media, setMedia] = useState<BlogMedia[]>(initialMedia)
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredMedia = media.filter((item) => {
    const matchesFilter = filter === 'all' || item.file_type === filter
    const matchesSearch =
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.alt_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.caption?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('alt_text', altText)
      formData.append('caption', caption)

      const response = await fetch('/api/blog/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const newMedia = await response.json()
        setMedia([newMedia, ...media])
        toast.success('Media uploaded successfully')
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setAltText('')
        setCaption('')
      } else {
        toast.error('Failed to upload media')
      }
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Failed to upload media')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copied to clipboard')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return

    try {
      const response = await fetch(`/api/blog/media/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMedia(media.filter((m) => m.id !== id))
        toast.success('Media deleted successfully')
      } else {
        toast.error('Failed to delete media')
      }
    } catch (error) {
      console.error('Error deleting media:', error)
      toast.error('Failed to delete media')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Media Library</h2>
          <p className="text-sm text-muted-foreground">
            Manage images and videos for blog posts
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Media
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="w-8 h-8 text-primary" />
                      ) : (
                        <Video className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports images and videos
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {selectedFile && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="alt_text">Alt Text</Label>
                    <Input
                      id="alt_text"
                      placeholder="Descriptive text for accessibility"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="caption">Caption (Optional)</Label>
                    <Input
                      id="caption"
                      placeholder="Caption for the media"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, alt text, or caption..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('image')}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Images
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('video')}
          >
            <Video className="w-4 h-4 mr-2" />
            Videos
          </Button>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredMedia.length === 0 ? (
          <Card className="col-span-full p-8">
            <p className="text-center text-muted-foreground">
              {searchQuery ? 'No media found matching your search' : 'No media uploaded yet'}
            </p>
          </Card>
        ) : (
          filteredMedia.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              {/* Media Preview */}
              <div className="aspect-square relative bg-muted">
                {item.file_type === 'image' ? (
                  <Image
                    src={item.file_url}
                    alt={item.alt_text || item.file_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyUrl(item.file_url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Media Info */}
              <div className="p-3 space-y-1">
                <p className="text-xs font-medium truncate">{item.file_name}</p>
                {item.file_size && (
                  <p className="text-xs text-muted-foreground">
                    {(item.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                {item.used_in_posts && item.used_in_posts.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Used in {item.used_in_posts.length} post(s)
                  </Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredMedia.length} of {media.length} items
      </div>
    </div>
  )
}

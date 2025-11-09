'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, GripVertical, Edit, Trash2, Crown, Images, Video } from 'lucide-react'
import ChessboardComponentModal from './ChessboardComponentModal'
import GalleryComponentModal from './GalleryComponentModal'
import VideoComponentModal from './VideoComponentModal'
import type {
  BlogComponentPlacement,
  ComponentZone,
  ComponentType,
  ComponentZoneInfo,
  ChessboardConfig,
  GalleryConfig,
  VideoConfig,
} from '@/types/blog-enhancement'

interface ComponentZoneEditorProps {
  zone: ComponentZone
  zoneInfo: ComponentZoneInfo
  components: BlogComponentPlacement[]
  onComponentsChange: (components: BlogComponentPlacement[]) => void
}

export default function ComponentZoneEditor({
  zone,
  zoneInfo,
  components,
  onComponentsChange,
}: ComponentZoneEditorProps) {
  const [isAddingComponent, setIsAddingComponent] = useState(false)
  const [isChessboardModalOpen, setIsChessboardModalOpen] = useState(false)
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<BlogComponentPlacement | null>(null)

  const getComponentIcon = (type: ComponentType) => {
    switch (type) {
      case 'chessboard':
        return <Crown className="w-4 h-4" />
      case 'gallery':
        return <Images className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
    }
  }

  const getComponentLabel = (type: ComponentType) => {
    switch (type) {
      case 'chessboard':
        return 'Interactive Chessboard'
      case 'gallery':
        return 'Image Gallery'
      case 'video':
        return 'Video Embed'
    }
  }

  const handleAddComponent = (type: ComponentType) => {
    setIsAddingComponent(false)

    if (type === 'chessboard') {
      setIsChessboardModalOpen(true)
    } else if (type === 'gallery') {
      setIsGalleryModalOpen(true)
    } else if (type === 'video') {
      setIsVideoModalOpen(true)
    }
  }

  const handleSaveChessboard = (config: ChessboardConfig) => {
    const newComponent: BlogComponentPlacement = {
      id: editingComponent?.id || `temp-${Date.now()}`,
      blog_post_id: '',
      component_type: 'chessboard',
      zone,
      position: editingComponent?.position ?? components.length,
      config,
      created_at: editingComponent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (editingComponent) {
      const updated = components.map((c) => (c.id === editingComponent.id ? newComponent : c))
      onComponentsChange(updated)
    } else {
      onComponentsChange([...components, newComponent])
    }

    setEditingComponent(null)
  }

  const handleSaveGallery = (config: GalleryConfig) => {
    const newComponent: BlogComponentPlacement = {
      id: editingComponent?.id || `temp-${Date.now()}`,
      blog_post_id: '',
      component_type: 'gallery',
      zone,
      position: editingComponent?.position ?? components.length,
      config,
      created_at: editingComponent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (editingComponent) {
      const updated = components.map((c) => (c.id === editingComponent.id ? newComponent : c))
      onComponentsChange(updated)
    } else {
      onComponentsChange([...components, newComponent])
    }

    setEditingComponent(null)
  }

  const handleSaveVideo = (config: VideoConfig) => {
    const newComponent: BlogComponentPlacement = {
      id: editingComponent?.id || `temp-${Date.now()}`,
      blog_post_id: '',
      component_type: 'video',
      zone,
      position: editingComponent?.position ?? components.length,
      config,
      created_at: editingComponent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (editingComponent) {
      const updated = components.map((c) => (c.id === editingComponent.id ? newComponent : c))
      onComponentsChange(updated)
    } else {
      onComponentsChange([...components, newComponent])
    }

    setEditingComponent(null)
  }

  const handleEditComponent = (component: BlogComponentPlacement) => {
    setEditingComponent(component)

    if (component.component_type === 'chessboard') {
      setIsChessboardModalOpen(true)
    } else if (component.component_type === 'gallery') {
      setIsGalleryModalOpen(true)
    } else if (component.component_type === 'video') {
      setIsVideoModalOpen(true)
    }
  }

  const handleDeleteComponent = (componentId: string) => {
    const updated = components.filter((c) => c.id !== componentId)
    // Re-index positions
    const reindexed = updated.map((c, index) => ({ ...c, position: index }))
    onComponentsChange(reindexed)
  }

  return (
    <>
      <ChessboardComponentModal
        open={isChessboardModalOpen}
        onOpenChange={(open) => {
          setIsChessboardModalOpen(open)
          if (!open) setEditingComponent(null)
        }}
        onSave={handleSaveChessboard}
        initialConfig={
          editingComponent?.component_type === 'chessboard'
            ? (editingComponent.config as ChessboardConfig)
            : undefined
        }
      />

      <GalleryComponentModal
        open={isGalleryModalOpen}
        onOpenChange={(open) => {
          setIsGalleryModalOpen(open)
          if (!open) setEditingComponent(null)
        }}
        onSave={handleSaveGallery}
        initialConfig={
          editingComponent?.component_type === 'gallery'
            ? (editingComponent.config as GalleryConfig)
            : undefined
        }
      />

      <VideoComponentModal
        open={isVideoModalOpen}
        onOpenChange={(open) => {
          setIsVideoModalOpen(open)
          if (!open) setEditingComponent(null)
        }}
        onSave={handleSaveVideo}
        initialConfig={
          editingComponent?.component_type === 'video'
            ? (editingComponent.config as VideoConfig)
            : undefined
        }
      />

      <div className="space-y-2">
      {/* Zone Header */}
      <div>
        <h4 className="font-semibold text-sm">{zoneInfo.label}</h4>
        <p className="text-xs text-muted-foreground">{zoneInfo.description}</p>
      </div>

      {/* Components List */}
      <div className="space-y-2">
        {components.length === 0 ? (
          <Card className="p-3 border-dashed">
            <p className="text-xs text-muted-foreground text-center">
              No components in this zone
            </p>
          </Card>
        ) : (
          components.map((component) => (
            <Card key={component.id} className="p-3">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                {getComponentIcon(component.component_type)}
                <span className="text-sm font-medium flex-1">
                  {getComponentLabel(component.component_type)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEditComponent(component)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => handleDeleteComponent(component.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Component Button */}
      <DropdownMenu open={isAddingComponent} onOpenChange={setIsAddingComponent}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => handleAddComponent('chessboard')}>
            <Crown className="w-4 h-4 mr-2" />
            Interactive Chessboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddComponent('gallery')}>
            <Images className="w-4 h-4 mr-2" />
            Image Gallery
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddComponent('video')}>
            <Video className="w-4 h-4 mr-2" />
            Video Embed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    </>
  )
}

// =====================================================
// Blog Enhancement System Types
// Created: 2025-11-08
// Description: TypeScript types for blog enhancement
//              features including component placements,
//              media library, and categorization
// =====================================================

import type { Document } from '@contentful/rich-text-types'

// =====================================================
// DATABASE ENTITY TYPES
// =====================================================

/**
 * Blog Post Enhancement Record (from Supabase)
 * Stores enhancement metadata for posts from Contentful
 */
export interface BlogPostEnhancement {
  id: string
  contentful_id: string
  slug: string

  // Publishing
  is_finalized: boolean
  finalized_at: string | null
  finalized_by: string | null

  // Categorization
  category: string | null
  tags: string[] | null
  is_featured: boolean

  // Layout
  layout_type: LayoutType

  // Analytics
  view_count: number
  last_viewed_at: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Layout Types
 */
export type LayoutType = 'default' | 'magazine' | 'minimal' | 'full-width'

/**
 * Component Types
 */
export type ComponentType = 'chessboard' | 'gallery' | 'video'

/**
 * Component Zone Types
 * Defines where components can be placed in the article
 */
export type ComponentZone =
  | 'after_title'
  | 'after_intro'
  | 'mid_article'
  | 'before_conclusion'
  | 'after_content'

/**
 * Blog Component Placement Record (from Supabase)
 */
export interface BlogComponentPlacement {
  id: string
  blog_post_id: string
  component_type: ComponentType
  position: number
  zone: ComponentZone
  config: ComponentConfig
  created_at: string
  updated_at: string
}

/**
 * Component Configuration Union Type
 * Each component type has its own configuration structure
 */
export type ComponentConfig =
  | ChessboardConfig
  | GalleryConfig
  | VideoConfig

/**
 * Chessboard Component Configuration
 */
export interface ChessboardConfig {
  title: string
  pgn: string
  interactive: boolean
  autoPlay: boolean
  showAnnotations: boolean
  tournamentMode?: boolean
  tournamentTableName?: string
  tournamentDisplayName?: string
}

/**
 * Gallery Image Item
 */
export interface GalleryImage {
  url: string
  alt: string
  caption?: string
}

/**
 * Gallery Style Options
 */
export type GalleryStyle = 'single' | 'carousel' | 'grid' | 'masonry'

/**
 * Gallery Component Configuration
 */
export interface GalleryConfig {
  title: string
  images: GalleryImage[]
  style: GalleryStyle
}

/**
 * Video Source Types
 */
export type VideoSource = 'youtube' | 'vimeo' | 'upload'

/**
 * Video Component Configuration
 */
export interface VideoConfig {
  type: VideoSource
  url: string
  title: string
  caption?: string
  autoplay: boolean
  showControls: boolean
  thumbnail?: string
}

/**
 * Blog Media Record (from Supabase)
 */
export interface BlogMedia {
  id: string
  file_name: string
  file_type: 'image' | 'video'
  file_url: string
  file_size: number | null
  mime_type: string | null
  alt_text: string | null
  caption: string | null
  uploaded_by: string | null
  used_in_posts: string[] | null
  created_at: string
}

/**
 * Blog Category Record (from Supabase)
 */
export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
}

/**
 * Blog Tag Record (from Supabase)
 */
export interface BlogTag {
  id: string
  name: string
  slug: string
  usage_count: number
  created_at: string
}

// =====================================================
// COMPOSITE/MERGED TYPES
// =====================================================

/**
 * Enhanced Blog Post
 * Combines Contentful data with Supabase enhancements
 */
export interface EnhancedBlogPost {
  // Contentful Data
  contentful_id: string
  title: string
  slug: string
  excerpt: string
  author: string
  date: string
  thumbnailUrl: string
  featuredImageUrl: string
  content: Document
  contentful_created_at: string
  contentful_updated_at: string

  // Enhancement Data (from Supabase)
  enhancement_id: string | null
  is_finalized: boolean
  finalized_at: string | null
  finalized_by: string | null
  category: string | null
  category_name?: string // Resolved category name
  tags: string[] | null
  is_featured: boolean
  layout_type: LayoutType
  view_count: number
  last_viewed_at: string | null

  // Component Placements
  components: BlogComponentPlacement[]
}

/**
 * Enhanced Blog Preview
 * For listing pages - includes enhancement metadata
 */
export interface EnhancedBlogPreview {
  // Contentful Data
  contentful_id: string
  title: string
  slug: string
  excerpt: string
  author: string
  date: string
  thumbnailUrl: string

  // Enhancement Data
  enhancement_id: string | null
  is_finalized: boolean
  category: string | null
  category_name?: string
  tags: string[] | null
  is_featured: boolean
  view_count: number
}

// =====================================================
// FORM/INPUT TYPES
// =====================================================

/**
 * Blog Post Enhancement Form Data
 * For creating/editing blog enhancements in the admin
 */
export interface BlogEnhancementFormData {
  contentful_id: string
  slug: string
  category: string | null
  tags: string[]
  is_featured: boolean
  layout_type: LayoutType
}

/**
 * Component Placement Form Data
 * For adding/editing component placements
 */
export interface ComponentPlacementFormData {
  component_type: ComponentType
  zone: ComponentZone
  position: number
  config: ComponentConfig
}

/**
 * Media Upload Form Data
 */
export interface MediaUploadFormData {
  file: File
  alt_text?: string
  caption?: string
}

/**
 * Category Form Data
 */
export interface CategoryFormData {
  name: string
  slug: string
  description?: string
  display_order?: number
}

/**
 * Tag Form Data
 */
export interface TagFormData {
  name: string
  slug: string
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * Contentful Blog Post Response (from Contentful API)
 */
export interface ContentfulBlogPostResponse {
  id: string
  title: string
  slug: string
  text: Document
  thumbnail?: {
    fields: {
      file: {
        url: string
      }
    }
  }
  featuredImage?: {
    fields: {
      file: {
        url: string
      }
    }
  }
  createdAt: string
  updatedAt: string
}

/**
 * Blog List Filter Options
 */
export interface BlogListFilters {
  status?: 'all' | 'draft' | 'finalized'
  category?: string
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
  search?: string
  sortBy?: 'date' | 'views' | 'title'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated Blog List Response
 */
export interface PaginatedBlogList {
  posts: EnhancedBlogPreview[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Component Zone Display Info
 * For UI rendering in the admin
 */
export interface ComponentZoneInfo {
  zone: ComponentZone
  label: string
  description: string
}

export const COMPONENT_ZONES: ComponentZoneInfo[] = [
  {
    zone: 'after_title',
    label: 'After Title/Metadata',
    description: 'Appears right after the title and author information'
  },
  {
    zone: 'after_intro',
    label: 'After Introduction',
    description: 'Appears after the first paragraph(s) of the article'
  },
  {
    zone: 'mid_article',
    label: 'Mid Article',
    description: 'Appears in the middle of the article content'
  },
  {
    zone: 'before_conclusion',
    label: 'Before Conclusion',
    description: 'Appears near the end, before the final paragraphs'
  },
  {
    zone: 'after_content',
    label: 'After Content',
    description: 'Appears after all article text'
  }
]

/**
 * Component Type Display Info
 */
export interface ComponentTypeInfo {
  type: ComponentType
  label: string
  description: string
  icon: string // Lucide icon name
}

export const COMPONENT_TYPES: ComponentTypeInfo[] = [
  {
    type: 'chessboard',
    label: 'Interactive Chessboard',
    description: 'Display a chess game with PGN notation',
    icon: 'Crown'
  },
  {
    type: 'gallery',
    label: 'Image Gallery',
    description: 'Display multiple images in a gallery layout',
    icon: 'Images'
  },
  {
    type: 'video',
    label: 'Video Embed',
    description: 'Embed a video from YouTube, Vimeo, or upload',
    icon: 'Video'
  }
]

/**
 * Publishing Status Info
 */
export interface PublishingStatus {
  contentful_published: boolean
  app_finalized: boolean
  can_publish: boolean
  status_text: string
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for ChessboardConfig
 */
export function isChessboardConfig(config: ComponentConfig): config is ChessboardConfig {
  return 'pgn' in config && 'interactive' in config
}

/**
 * Type guard for GalleryConfig
 */
export function isGalleryConfig(config: ComponentConfig): config is GalleryConfig {
  return 'images' in config && 'style' in config
}

/**
 * Type guard for VideoConfig
 */
export function isVideoConfig(config: ComponentConfig): config is VideoConfig {
  return 'type' in config && 'url' in config && ('youtube' === config.type || 'vimeo' === config.type || 'upload' === config.type)
}

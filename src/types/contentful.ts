import { Document } from '@contentful/rich-text-types'

import type { Asset } from 'contentful'

// Use Contentful's built-in Asset type
export type ContentfulAsset = Asset


// Processed Blog Type for use in components
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  author: string
  date: string
  thumbnailUrl: string
  featuredImageUrl: string
  content: Document
  createdAt: string
  updatedAt: string
}

// Blog Preview Type (for listing pages and cards)
export interface BlogPreview {
  id: string
  title: string
  slug: string
  excerpt: string
  author: string
  date: string
  thumbnailUrl: string
}
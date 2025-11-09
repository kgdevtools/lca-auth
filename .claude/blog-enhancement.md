# Blog Feature Enhancement Plan

**Created:** 2025-11-08
**Status:** Planning Phase
**Priority:** High

---

## Executive Summary

Transform the current static, hardcoded blog system into a dynamic, flexible content management system that integrates Contentful CMS with app-based enhancement capabilities. The system will use a dual-entry workflow where base content is created in Contentful, then enhanced and finalized within the app using custom components and layout controls.

---

## Current State Analysis

### Existing Implementation

**Technology Stack:**
- **CMS:** Contentful (read-only integration)
- **Routes:** `/blog` (listing), `/blog/[slug]` (detail page)
- **Components:** BlogPreviewCard, BlogCardSkeleton, BlogPostSkeleton
- **Data Flow:** Contentful → blogService → Server Components

**Pain Points:**
1. Static, hardcoded detail page layout (`/blog/[slug]/page.tsx`)
2. No ability to customize layout or embed custom components
3. Read-only Contentful integration (no creation/editing in app)
4. No content management interface for admins
5. Limited flexibility for different article types/layouts
6. Preview cards lack modern, compact styling

**Current File Structure:**
```
src/
├── app/blog/
│   ├── page.tsx (listing)
│   └── [slug]/page.tsx (detail - NEEDS REFACTOR)
├── components/
│   ├── blog-preview-card.tsx (NEEDS REDESIGN)
│   └── blog-skeletons.tsx
├── services/blogService.ts
├── lib/contentful.ts
└── types/contentful.ts (NEEDS EXPANSION)
```

---

## Proposed Architecture

### Workflow Model: Dual-Entry System

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTENT CREATION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: CREATE IN CONTENTFUL
┌──────────────────────┐
│  Contentful CMS      │
│  ─────────────────   │
│  • Write article     │
│  • Add base images   │
│  • Set slug/metadata │
│  • Publish to API    │
└──────────┬───────────┘
           │
           ▼
Step 2: ENHANCE IN APP
┌──────────────────────┐
│  LCA App (Admin)     │
│  ─────────────────   │
│  • Fetch from        │
│    Contentful API    │
│  • Select layout     │
│  • Place components  │
│  • Upload assets     │
│  • Preview & Publish │
└──────────┬───────────┘
           │
           ▼
Step 3: TWO-STAGE PUBLISHING
┌──────────────────────┐
│  Publication Check   │
│  ─────────────────   │
│  ✓ Contentful        │
│    published = true  │
│  ✓ App finalized     │
│    = true            │
└──────────┬───────────┘
           │
           ▼
Step 4: RENDER TO USERS
┌──────────────────────┐
│  Public Blog View    │
│  ─────────────────   │
│  • Merge Contentful  │
│    + Supabase data   │
│  • Render layout     │
│  • Display custom    │
│    components        │
└──────────────────────┘
```

### Data Storage Strategy

**Contentful (Source of Truth for Content):**
- Blog post text (rich text)
- Base metadata (title, slug, author, date)
- Base images (thumbnail, featured image)
- Publication status

**Supabase (Enhancement Layer):**
- Component placements and configurations
- Custom uploaded assets (videos, additional images)
- Post metadata (view counts, featured status, categories, tags)
- Layout preferences
- App publication status (finalized flag)

**Schema Design:**

```sql
-- Blog Posts Enhancement Table
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contentful_id TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Publishing
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES profiles(id),

  -- Categorization
  category TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,

  -- Layout
  layout_type TEXT DEFAULT 'default',

  -- Metadata
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component Placements Table
CREATE TABLE blog_component_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- Component Info
  component_type TEXT NOT NULL, -- 'chessboard', 'gallery', 'video', 'tournament_table'
  position INTEGER NOT NULL, -- Order in the article
  zone TEXT, -- 'after_intro', 'mid_article', 'before_conclusion', etc.

  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL,
  /* Example configs:
    Chessboard: { "pgn": "...", "title": "Game 1", "interactive": true }
    Gallery: { "images": ["url1", "url2"], "caption": "..." }
    Video: { "type": "youtube", "url": "...", "thumbnail": "..." }
    Table: { "tournament_id": "uuid", "show_photos": true }
  */

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Library Table
CREATE TABLE blog_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File Info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Metadata
  alt_text TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),

  -- Usage tracking
  used_in_posts UUID[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories/Tags Table
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Feature Specifications

### 1. Admin Content Management Section

**Location:** `/admin/content-management`

**Sidebar Integration:**
- Add "Content" menu item to admin sidebar (between "Tournaments" and "Active Players")
- Icon: FileText or Newspaper
- Sub-routes accessible via nested navigation

**Section Structure:**

```
/admin/content-management/
├── /blog-posts          → List all blog posts
├── /blog-posts/new      → Create/enhance new post
├── /blog-posts/[id]     → Edit existing post enhancement
├── /media-library       → Manage uploaded media
├── /categories          → Manage categories
└── /tags                → Manage tags
```

#### 1.1 Blog Posts List Page

**Route:** `/admin/content-management/blog-posts`

**Features:**
- Table view with columns:
  - Thumbnail (small preview)
  - Title
  - Category/Tags (badges)
  - Status (Draft, Finalized, Published)
  - Views count
  - Created/Updated dates
  - Actions (Edit, Preview, Delete)
- Filters:
  - Status (All, Draft, Finalized)
  - Category dropdown
  - Tags multi-select
  - Date range picker
- Search bar (title, slug)
- Sort by: Date, Views, Title
- Pagination
- Bulk actions (Delete, Set category)
- "Sync from Contentful" button (fetches new posts)

**Data Flow:**
1. Fetch all published posts from Contentful
2. Join with Supabase blog_posts table (left join)
3. Combine data and display
4. Highlight posts in Contentful but not enhanced yet

#### 1.2 Create/Edit Blog Enhancement Page

**Route:** `/admin/content-management/blog-posts/new` or `/blog-posts/[id]`

**Layout:** Split-screen editor

```
┌─────────────────────────────────────────────────────────┐
│  Header: Blog Post Title | [Save Draft] [Publish]      │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   LEFT PANEL         │      RIGHT PANEL (PREVIEW)       │
│   (Controls)         │                                  │
│   ─────────────      │                                  │
│                      │   Live preview of blog post      │
│ 1. Select Post       │   with current layout and        │
│    [Contentful ▼]    │   component placements           │
│                      │                                  │
│ 2. Layout & Settings │   Scrollable, updates in         │
│    Category: [___]   │   real-time as changes are       │
│    Tags: [____]      │   made to left panel             │
│    Featured: [✓]     │                                  │
│                      │                                  │
│ 3. Component Zones   │                                  │
│    ┌──────────────┐  │                                  │
│    │ After Intro  │  │                                  │
│    │ [Add ▼]      │  │                                  │
│    ├──────────────┤  │                                  │
│    │ ♟ Chessboard │  │                                  │
│    │ [Edit][Del]  │  │                                  │
│    └──────────────┘  │                                  │
│                      │                                  │
│    ┌──────────────┐  │                                  │
│    │ Mid Article  │  │                                  │
│    │ [Add ▼]      │  │                                  │
│    └──────────────┘  │                                  │
│                      │                                  │
│    ┌──────────────┐  │                                  │
│    │ Before End   │  │                                  │
│    │ [Add ▼]      │  │                                  │
│    └──────────────┘  │                                  │
│                      │                                  │
└──────────────────────┴──────────────────────────────────┘
```

**Left Panel Components:**

**1. Post Selection (for new enhancement):**
- Dropdown listing unpublished Contentful posts
- Shows: Title, slug, created date
- "Refresh from Contentful" button

**2. Settings Section:**
- Category dropdown (create new inline)
- Tags input (multi-select with create)
- Featured post toggle
- Layout type selector (for future expansion)

**3. Component Placement Zones:**

Pre-defined zones in the article flow:
- **After Title/Metadata** - Before content starts
- **After Introduction** - After first paragraph(s)
- **Mid Article** - Middle of content
- **Before Conclusion** - Near end
- **After Content** - After main text

Each zone:
- "[+ Add Component]" dropdown with options:
  - Interactive Chessboard
  - Image Gallery
  - Video Embed
  - Tournament Table
- Shows list of added components with:
  - Drag handle (reorder within zone)
  - Component type icon
  - Quick preview/title
  - [Edit] [Delete] buttons

**Component Configuration Modals:**

**A. Interactive Chessboard:**
```
┌─────────────────────────────────────┐
│  Add Interactive Chessboard         │
├─────────────────────────────────────┤
│                                     │
│  Title: [_____________________]     │
│                                     │
│  PGN Data:                          │
│  ┌─────────────────────────────┐   │
│  │ [Event "?"]                 │   │
│  │ [Site "?"]                  │   │
│  │ [Date "????.??.??"]         │   │
│  │ 1. e4 e5 2. Nf3...          │   │
│  └─────────────────────────────┘   │
│                                     │
│  □ Allow user interaction           │
│  □ Show move annotations            │
│  ☑ Auto-play game                   │
│                                     │
│  [Cancel]  [Insert Chessboard]      │
└─────────────────────────────────────┘
```

**B. Image Gallery:**
```
┌─────────────────────────────────────┐
│  Add Image Gallery                  │
├─────────────────────────────────────┤
│                                     │
│  Gallery Title: [______________]    │
│                                     │
│  Images:                            │
│  ┌───┐ ┌───┐ ┌───┐                │
│  │ 1 │ │ 2 │ │ + │                │
│  └───┘ └───┘ └───┘                │
│                                     │
│  [+ Add from Media Library]         │
│  [+ Upload New]                     │
│                                     │
│  Gallery Style:                     │
│  ○ Carousel  ● Grid  ○ Masonry     │
│                                     │
│  [Cancel]  [Insert Gallery]         │
└─────────────────────────────────────┘
```

**C. Video Embed:**
```
┌─────────────────────────────────────┐
│  Add Video Embed                    │
├─────────────────────────────────────┤
│                                     │
│  Video Source:                      │
│  ● YouTube  ○ Vimeo  ○ Upload      │
│                                     │
│  URL: [______________________]      │
│                                     │
│  OR                                 │
│                                     │
│  [Choose from Media Library]        │
│  [Upload New Video]                 │
│                                     │
│  Title: [___________________]       │
│  Caption: [_________________]       │
│                                     │
│  □ Autoplay  ☑ Show controls        │
│                                     │
│  [Cancel]  [Insert Video]           │
└─────────────────────────────────────┘
```

**D. Tournament Table:**
```
┌─────────────────────────────────────┐
│  Add Tournament Rankings            │
├─────────────────────────────────────┤
│                                     │
│  Select Tournament:                 │
│  [Tournament Dropdown ▼]            │
│                                     │
│  Display Options:                   │
│  ☑ Show player photos               │
│  ☑ Show ratings                     │
│  ☑ Show scores                      │
│  □ Show games played                │
│                                     │
│  Max rows: [10]                     │
│                                     │
│  [Cancel]  [Insert Table]           │
└─────────────────────────────────────┘
```

**Right Panel - Live Preview:**
- Renders the blog post exactly as it will appear on the public site
- Fetches Contentful content in real-time
- Injects component placements at designated zones
- Updates immediately when components are added/removed/reordered
- Shows placeholder for components being configured
- Sticky header with:
  - Desktop/Tablet/Mobile view toggle
  - Zoom controls
  - "View as published" link (opens in new tab)

**Actions:**
- **Save Draft:** Saves to Supabase with `is_finalized = false`
- **Publish:**
  - Checks if Contentful post is published
  - Sets `is_finalized = true`
  - Shows confirmation modal
  - Redirects to blog list

#### 1.3 Media Library

**Route:** `/admin/content-management/media-library`

**Features:**
- Grid view of all uploaded media
- Filters:
  - Type (Images, Videos, All)
  - Date uploaded
  - Uploaded by user
- Search by filename/alt text
- Upload interface:
  - Drag & drop zone
  - File browser button
  - Progress indicators
  - Automatic optimization (images)
- Media card shows:
  - Thumbnail preview
  - Filename
  - File size
  - Upload date
  - "Used in X posts" indicator
  - Actions: [Copy URL] [Edit Details] [Delete]
- Edit modal:
  - Alt text input
  - Caption input
  - Replace file option
  - View full size

#### 1.4 Categories Management

**Route:** `/admin/content-management/categories`

**Features:**
- Table of categories with:
  - Name
  - Slug
  - Post count
  - Actions (Edit, Delete)
- Create new category form:
  - Name input (auto-generates slug)
  - Description textarea
- Inline editing
- Drag to reorder (for future navigation display)

#### 1.5 Tags Management

**Route:** `/admin/content-management/tags`

**Features:**
- Tag cloud view or table view toggle
- Shows usage count per tag
- Create new tag inline
- Merge tags functionality
- Bulk delete
- Filter posts by tag

---

### 2. Reusable Blog Detail Page

**Current Issue:**
The `app/blog/[slug]/page.tsx` is hardcoded with specific components like tournament tables and photo carousels for the LCA Open 2025 article.

**Solution:**
Create a dynamic rendering system based on component placements stored in Supabase.

**New File Structure:**
```
src/
├── app/blog/[slug]/
│   └── page.tsx (refactored to be dynamic)
├── components/blog/
│   ├── BlogDetailLayout.tsx (wrapper component)
│   ├── BlogContentRenderer.tsx (handles rich text + zones)
│   ├── BlogChessboard.tsx
│   ├── BlogGallery.tsx
│   ├── BlogVideoEmbed.tsx
│   ├── BlogTournamentTable.tsx
│   └── BlogComponentZone.tsx
```

**Dynamic Rendering Logic:**

```typescript
// Pseudo-code for new blog detail page

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // 1. Fetch Contentful post
  const contentfulPost = await getBlogPostBySlug(params.slug);

  // 2. Fetch Supabase enhancements
  const enhancement = await getBlogEnhancement(contentfulPost.id);

  // 3. Check if published in both systems
  if (!enhancement?.is_finalized) {
    notFound(); // or show draft warning for admins
  }

  // 4. Fetch component placements
  const components = await getBlogComponents(enhancement.id);

  // 5. Render with dynamic layout
  return (
    <BlogDetailLayout post={contentfulPost} enhancement={enhancement}>
      <BlogContentRenderer
        content={contentfulPost.content}
        components={components}
      />
    </BlogDetailLayout>
  );
}
```

**BlogContentRenderer Component:**

This component will:
1. Parse the Contentful rich text Document
2. Identify natural break points for component zones
3. Inject components at their designated zones
4. Maintain proper typography and spacing

```typescript
// Component placement strategy
const zoneMapping = {
  'after_title': 0, // Before content
  'after_intro': 1, // After first paragraph
  'mid_article': Math.floor(paragraphs.length / 2),
  'before_conclusion': paragraphs.length - 2,
  'after_content': paragraphs.length // After all content
};
```

---

### 3. Modernized Blog Preview Card

**Current State:**
- File: `src/components/blog-preview-card.tsx`
- Style: Standard card with moderate spacing

**Enhancement Goals:**
- ✓ Tighter typography
- ✓ Bolder hierarchy
- ✓ Reduced padding/margins
- ✓ Enhanced hover states

**New Design Specifications:**

```tsx
// Typography adjustments
- Title: font-bold → font-extrabold, tracking-tight, text-xl → text-2xl
- Excerpt: leading-relaxed → leading-tight, tracking-normal → tracking-tight
- Metadata: text-sm → text-xs, tighter spacing

// Spacing reductions
- Card padding: p-6 → p-4
- Gap between elements: space-y-4 → space-y-2
- Image to text gap: Reduce by 25%

// Visual hierarchy
- Title: Much bolder (font-extrabold), larger (text-2xl)
- Excerpt: Slightly muted (text-muted-foreground → text-muted-foreground/80)
- Clear size differences between title and body text

// Hover effects
- Transform: translateY(-2px) with transition-transform
- Border: Animated border color shift
- Shadow: Elevation increase (shadow-sm → shadow-md)
- Image: Scale(1.05) with transition

// Modern touches
- Gradient overlay on image for better text contrast (optional)
- Category badge in top-right corner of image
- Reading time estimate
- View count indicator (if enabled)
```

**Component Structure:**
```tsx
<Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
  {/* Image Container */}
  <div className="relative aspect-video overflow-hidden">
    <Image
      className="transition-transform duration-500 group-hover:scale-105"
      // ...
    />
    {category && (
      <Badge className="absolute top-2 right-2">{category}</Badge>
    )}
  </div>

  {/* Content Container - Tighter spacing */}
  <CardContent className="p-4 space-y-2">
    {/* Metadata - Compact */}
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{author}</span>
      <span>•</span>
      <time>{date}</time>
      {viewCount && (
        <>
          <span>•</span>
          <span>{viewCount} views</span>
        </>
      )}
    </div>

    {/* Title - Bold and prominent */}
    <h3 className="text-2xl font-extrabold tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
      {title}
    </h3>

    {/* Excerpt - Tight leading */}
    <p className="text-sm text-muted-foreground/80 leading-tight tracking-tight line-clamp-3">
      {excerpt}
    </p>

    {/* Tags - Minimal spacing */}
    {tags && (
      <div className="flex gap-1 flex-wrap">
        {tags.map(tag => (
          <Badge variant="outline" className="text-xs">{tag}</Badge>
        ))}
      </div>
    )}

    {/* Read More - Animated */}
    <Link className="inline-flex items-center text-sm font-semibold group/link">
      Read more
      <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover/link:translate-x-1" />
    </Link>
  </CardContent>
</Card>
```

---

## Technical Implementation Plan

### Phase 1: Database & Types Setup

**Tasks:**
1. Create Supabase migration with all tables (blog_posts, blog_component_placements, blog_media, blog_categories, blog_tags)
2. Set up RLS policies for admin-only write access
3. Create TypeScript types/interfaces
4. Add Supabase queries/mutations helper functions

**Estimated Time:** 3-4 hours

### Phase 2: Admin Sidebar & Content Section Structure

**Tasks:**
1. Update AdminSidebar component with "Content" menu item
2. Create content management layout (`/admin/content-management/layout.tsx`)
3. Set up nested navigation/routing
4. Create placeholder pages for all sub-routes

**Estimated Time:** 2-3 hours

### Phase 3: Blog Posts List Page

**Tasks:**
1. Build data fetching (Contentful + Supabase join)
2. Create table component with filtering/sorting
3. Implement "Sync from Contentful" functionality
4. Add search and pagination
5. Wire up actions (Edit, Delete, Preview)

**Estimated Time:** 4-5 hours

### Phase 4: Blog Enhancement Editor (Core Feature)

**Tasks:**
1. Build split-screen layout
2. Implement post selection from Contentful
3. Create settings section (category, tags, featured)
4. Build component zone system
5. Create component configuration modals:
   - Chessboard modal with PGN input
   - Gallery modal with media library integration
   - Video modal with URL/upload options
   - Tournament table modal with dropdown
6. Implement real-time preview panel
7. Wire up save/publish actions

**Estimated Time:** 10-12 hours

### Phase 5: Media Library

**Tasks:**
1. Build upload interface (drag-drop + file browser)
2. Integrate file storage (Supabase Storage or Cloudinary)
3. Create media grid view with filters
4. Implement media edit modal
5. Add "Used in posts" tracking

**Estimated Time:** 5-6 hours

### Phase 6: Categories & Tags Management

**Tasks:**
1. Build categories CRUD pages
2. Build tags CRUD pages
3. Add inline creation in blog editor
4. Implement merge/bulk actions

**Estimated Time:** 3-4 hours

### Phase 7: Dynamic Blog Detail Page

**Tasks:**
1. Refactor `app/blog/[slug]/page.tsx` to be dynamic
2. Create BlogContentRenderer component
3. Build individual component renderers:
   - BlogChessboard (integrate chess.js + react-chessboard)
   - BlogGallery (lightbox functionality)
   - BlogVideoEmbed (responsive embeds)
   - BlogTournamentTable (fetch from Supabase)
4. Implement zone injection logic
5. Test with various component combinations
6. Handle edge cases (no enhancements, draft posts)

**Estimated Time:** 8-10 hours

### Phase 8: Modernized Blog Preview Card

**Tasks:**
1. Update BlogPreviewCard styling:
   - Tighter typography
   - Bolder hierarchy
   - Reduced spacing
   - Enhanced hover effects
2. Add category badge
3. Add view count (if enabled)
4. Add tags display
5. Update blog listing grid with new cards
6. Test responsive behavior

**Estimated Time:** 2-3 hours

### Phase 9: Integration & Testing

**Tasks:**
1. End-to-end testing of entire workflow
2. Test dual-publishing system
3. Verify data consistency between Contentful and Supabase
4. Test all component types in various combinations
5. Responsive testing on mobile/tablet/desktop
6. Performance optimization (image loading, caching)
7. Add error handling and loading states
8. Accessibility audit

**Estimated Time:** 5-6 hours

### Phase 10: Documentation & Refinement

**Tasks:**
1. Create user guide for content management
2. Document component configuration options
3. Add helpful tooltips and hints in UI
4. Polish animations and transitions
5. Final UX review

**Estimated Time:** 2-3 hours

---

## Total Estimated Time

**~45-56 hours** (approximately 1-1.5 weeks of focused development)

---

## Dependencies & Libraries

**New Dependencies to Install:**
```json
{
  "chess.js": "^1.0.0-beta.8",
  "react-chessboard": "^4.0.0",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "yet-another-react-lightbox": "^3.15.0",
  "react-player": "^2.14.0"
}
```

**Existing Dependencies (Already Installed):**
- contentful (^11.8.2)
- @contentful/rich-text-react-renderer (^16.1.5)
- Supabase client
- shadcn/ui components

---

## Contentful Schema Requirements

**Current Fields (from screenshot):**
- Title (Short text)
- Slug (Short text)
- Thumbnail (Media)
- Featured Image (Media)
- Text (Rich text)

**Recommendation:** Keep Contentful schema as-is. All enhancements will be stored in Supabase.

---

## File Storage Strategy

**Options:**

1. **Supabase Storage (Recommended)**
   - Pros: Integrated with existing Supabase setup, simple auth
   - Cons: Bandwidth limits on free tier
   - Use for: User-uploaded images, videos

2. **Cloudinary**
   - Pros: Automatic optimization, transformations, generous free tier
   - Cons: Additional service to manage
   - Use for: Media library with automatic optimization

**Recommended Approach:** Start with Supabase Storage, migrate to Cloudinary if needed.

---

## Security Considerations

1. **Admin-Only Access:**
   - All content management routes behind auth check
   - Supabase RLS policies: Only admin users can insert/update/delete
   - Regular users can only read published posts

2. **File Upload Security:**
   - File type validation (images: jpg, png, webp; videos: mp4, webm)
   - File size limits (images: 5MB, videos: 50MB)
   - Virus scanning (if using Supabase Storage Pro)

3. **Content Validation:**
   - Sanitize user inputs (category names, tags)
   - Validate PGN data for chessboards
   - URL validation for video embeds
   - Prevent XSS in rich text rendering

4. **Rate Limiting:**
   - Limit Contentful API calls (use caching)
   - Rate limit media uploads
   - Throttle preview refreshes

---

## Performance Optimizations

1. **Caching Strategy:**
   - Cache Contentful responses (ISR with revalidation)
   - Cache Supabase queries for public blog views
   - Implement stale-while-revalidate pattern

2. **Image Optimization:**
   - Use Next.js Image component with priority loading
   - Lazy load images in galleries
   - Generate multiple sizes for responsive images

3. **Code Splitting:**
   - Lazy load component modals
   - Dynamic imports for chess libraries
   - Split admin bundle from public bundle

4. **Database Optimization:**
   - Index slug columns for fast lookups
   - Use select queries with specific columns only
   - Batch component placements fetch

---

## Future Enhancements (Post-MVP)

1. **Advanced Layouts:**
   - Add more layout templates (Magazine, Minimal, Full-width)
   - Custom CSS per post
   - Typography theme presets

2. **SEO Features:**
   - Custom meta descriptions
   - Open Graph image generator
   - Schema.org markup for articles

3. **Analytics:**
   - Track scroll depth
   - Heatmaps for component interaction
   - Popular posts dashboard

4. **Social Features:**
   - Comments system
   - Social sharing buttons
   - Author profiles

5. **Workflow Improvements:**
   - Revision history
   - Scheduled publishing
   - Draft previews with shareable links
   - Multi-author collaboration

6. **Content Features:**
   - Related posts recommendations
   - Table of contents generation
   - Reading progress indicator

---

## Success Metrics

**Post-Implementation, track:**
1. Time to publish a new blog post (goal: < 15 minutes)
2. Number of custom components used per post
3. User engagement (views, time on page)
4. Admin user satisfaction with editing interface
5. Page load performance (Core Web Vitals)

---

## Questions & Decisions Made

**Q1: How should the blog creation/editing workflow work with Contentful?**
**A:** Dual-entry - Create base content in Contentful first, then enhance/arrange in the app

**Q2: What layout customization options should be available?**
**A:** Component placement zones (designated areas for custom components)

**Q3: Where should users access the blog creation feature?**
**A:** Separate 'Content Management' section in admin dashboard

**Q4: What custom components should be embeddable?**
**A:** Interactive chessboards (PGN), Image galleries/carousels, Tournament rankings/tables, Video embeds

**Q5: How should published vs draft blog posts be managed?**
**A:** Two-stage: Contentful published + app finalized (both must be true)

**Q6: What data should be stored in Supabase?**
**A:** Component placements, custom assets, post metadata (views, featured, categories)

**Q7: How should the blog preview card styling be updated?**
**A:** Tighter typography, bolder hierarchy, reduced padding, enhanced hover states

**Q8: What should the Content Management section include?**
**A:** Blog posts list/management, Create/Edit enhancement page, Media library, Categories/Tags management

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Set up development environment** - Install dependencies
3. **Create database schema** - Run Supabase migrations
4. **Begin Phase 1** - Start with foundational database and types
5. **Iterate through phases** - Build feature by feature
6. **User testing** - Get feedback from content creators
7. **Launch** - Deploy to production

---

## Notes & Considerations

- **Contentful Rate Limits:** Free tier has API rate limits. Consider caching aggressively.
- **Component Library:** Leverage existing shadcn/ui components for consistency.
- **Mobile First:** Ensure admin interface works well on tablets for on-the-go editing.
- **Accessibility:** All interactive components must be keyboard navigable and screen-reader friendly.
- **Documentation:** Maintain inline code comments and update this document as implementation evolves.

---

**Plan Created By:** Claude (AI Assistant)
**Last Updated:** 2025-11-08
**Status:** Ready for Implementation
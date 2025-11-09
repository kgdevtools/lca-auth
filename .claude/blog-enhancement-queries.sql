-- =====================================================
-- Blog Enhancement System - SQL Queries
-- Created: 2025-11-08
-- Instructions: Copy and paste these queries into
--               Supabase SQL Editor and run them
-- =====================================================

-- =====================================================
-- 1. CREATE BLOG_POSTS TABLE
-- =====================================================
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contentful_id TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  layout_type TEXT DEFAULT 'default',
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_contentful_id ON blog_posts(contentful_id);
CREATE INDEX idx_blog_posts_finalized ON blog_posts(is_finalized) WHERE is_finalized = true;
CREATE INDEX idx_blog_posts_featured ON blog_posts(is_featured) WHERE is_featured = true;
CREATE INDEX idx_blog_posts_category ON blog_posts(category) WHERE category IS NOT NULL;

-- =====================================================
-- 2. CREATE BLOG_COMPONENT_PLACEMENTS TABLE
-- =====================================================
CREATE TABLE blog_component_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  component_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  zone TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_components_blog_post ON blog_component_placements(blog_post_id);
CREATE INDEX idx_blog_components_position ON blog_component_placements(blog_post_id, zone, position);
CREATE INDEX idx_blog_components_type ON blog_component_placements(blog_post_id, component_type);

-- =====================================================
-- 3. CREATE BLOG_MEDIA TABLE
-- =====================================================
CREATE TABLE blog_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  used_in_posts UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_media_type ON blog_media(file_type);
CREATE INDEX idx_blog_media_uploader ON blog_media(uploaded_by);
CREATE INDEX idx_blog_media_usage ON blog_media USING GIN(used_in_posts);

-- =====================================================
-- 4. CREATE BLOG_CATEGORIES TABLE
-- =====================================================
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX idx_blog_categories_order ON blog_categories(display_order);

-- =====================================================
-- 5. CREATE BLOG_TAGS TABLE
-- =====================================================
CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX idx_blog_tags_usage ON blog_tags(usage_count DESC);

-- =====================================================
-- 6. AUTO-UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

CREATE OR REPLACE FUNCTION update_blog_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_components_updated_at
  BEFORE UPDATE ON blog_component_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_components_updated_at();

CREATE OR REPLACE FUNCTION update_blog_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_categories_updated_at();

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_component_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

-- Blog Posts Policies
CREATE POLICY "Anyone can view finalized blog posts"
  ON blog_posts FOR SELECT
  USING (is_finalized = true);

CREATE POLICY "Authenticated users can view all blog posts"
  ON blog_posts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts FOR DELETE TO authenticated
  USING (true);

-- Component Placements Policies
CREATE POLICY "Anyone can view components for finalized posts"
  ON blog_component_placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_component_placements.blog_post_id
      AND blog_posts.is_finalized = true
    )
  );

CREATE POLICY "Authenticated users can view all components"
  ON blog_component_placements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert components"
  ON blog_component_placements FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update components"
  ON blog_component_placements FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete components"
  ON blog_component_placements FOR DELETE TO authenticated
  USING (true);

-- Media Policies
CREATE POLICY "Anyone can view media"
  ON blog_media FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert media"
  ON blog_media FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update media"
  ON blog_media FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete media"
  ON blog_media FOR DELETE TO authenticated
  USING (true);

-- Categories Policies
CREATE POLICY "Anyone can view categories"
  ON blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON blog_categories FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON blog_categories FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON blog_categories FOR DELETE TO authenticated
  USING (true);

-- Tags Policies
CREATE POLICY "Anyone can view tags"
  ON blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tags"
  ON blog_tags FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
  ON blog_tags FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tags"
  ON blog_tags FOR DELETE TO authenticated
  USING (true);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION increment_blog_view_count(post_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blog_posts
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE slug = post_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_posts_by_category(category_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  post_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO post_count
  FROM blog_posts
  WHERE category = category_slug
  AND is_finalized = true;
  RETURN post_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_posts_by_tag(tag_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  post_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO post_count
  FROM blog_posts
  WHERE tag_name = ANY(tags)
  AND is_finalized = true;
  RETURN post_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- Copy and paste this entire file into Supabase SQL Editor
-- =====================================================

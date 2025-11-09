# Inline Component Embedding Guide

## Overview
You can now embed components (like chessboards) **anywhere within your Contentful article text**, not just at predefined zones.

## How It Works

### Step 1: Add Component in Admin Dashboard
1. Go to Admin → Content → Blog Posts
2. Edit your blog post
3. Add a component (e.g., chessboard) to a zone like `mid_article` at position `0`
4. Publish the post

### Step 2: Add Marker in Contentful
1. Go to Contentful
2. Edit your blog post content
3. **Add a special marker** where you want the component to appear:
   ```
   [COMPONENT:zone_name:position]
   ```

### Examples

**Example 1: Embed a chessboard in the middle of a paragraph**
```
Sharma faced seasoned veteran Mikhail Petrov in the final round.
Petrov's defensive mastery was tested as Sharma executed a brilliant
Queen sacrifice, leading to a forced checkmate.

[COMPONENT:mid_article:0]

Tournament organizers are already planning next year's event...
```

**Example 2: Multiple components**
```
The opening was a classic Sicilian Defense.

[COMPONENT:mid_article:0]

After 20 moves, Black found a brilliant tactical shot.

[COMPONENT:mid_article:1]

The endgame was a masterclass in technique.
```

## Marker Format

```
[COMPONENT:zone_name:position_number]
```

- **zone_name**: The zone where you added the component in admin
  - `after_title`
  - `after_intro`
  - `mid_article`
  - `before_conclusion`
  - `after_content`

- **position_number**: The position number (starts from 0)
  - First component in a zone: `0`
  - Second component in same zone: `1`
  - And so on...

## Benefits

✅ **Precise Placement**: Put components exactly where they make sense in your story
✅ **No Duplication**: Components used inline won't appear again in zone sections
✅ **Flexible**: Mix text and components naturally
✅ **Easy**: Just add a simple text marker in Contentful

## Important Notes

1. The marker must be on its own line in Contentful (in a separate paragraph)
2. Make sure the zone and position match what you added in the admin dashboard
3. If a component is rendered inline, it won't appear in the zone sections at the end
4. Components not referenced by markers will still appear in their designated zones

## Current Status

Your blog post has:
- Component at `mid_article:0` (Motseta game)
- Component at `before_conclusion:0` (Mikayla game)

To embed them inline in your Contentful article:
1. Find where you want the first chessboard
2. Add a new paragraph with just: `[COMPONENT:mid_article:0]`
3. Find where you want the second chessboard
4. Add a new paragraph with just: `[COMPONENT:before_conclusion:0]`
5. Save and publish in Contentful
6. Refresh your blog page - the chessboards will now appear inline!

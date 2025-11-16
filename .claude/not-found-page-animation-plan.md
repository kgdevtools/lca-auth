# 404 Not Found Page - Chess Piece Animation Plan

## Project Overview
Create a delightful 404 error page for the Limpopo Chess Academy app featuring an animated chess piece (wiggling/dancing Knight) with pure CSS animation. The implementation will be mobile-first, responsive, theme-aware (light/dark mode), and centered on the page.

---

## Next.js App Router File Structure

### Primary 404 Handler
```
app/
└── not-found.tsx       # Catches all unmatched routes in the app
```

### Error Boundaries (Optional Future Enhancement)
```
app/
├── error.tsx           # Catches runtime errors in app routes
└── global-error.tsx    # Catches errors in root layout
```

**Note**: For Next.js 13+ App Router, `not-found.tsx` at the root `app/` directory handles all 404 errors across the entire application.

---

## Implementation Stages

### Stage 1: Project Setup & Architecture
**Goal**: Establish the foundation with file structure and CSS variables

**Tasks**:
- [x] Research Next.js 404 page file conventions
- [ ] Create `app/not-found.tsx` component
- [ ] Create `styles/animations/chess-piece-404.css` for isolated animation styles
- [ ] Define CSS custom properties for:
  - Chess piece colors (light/dark mode compatible)
  - Animation timings and easing
  - Responsive sizing variables
  - Theme-aware colors from globals.css
- [ ] Set up centered layout (vertical + horizontal)
- [ ] Create mobile-first responsive breakpoints

**Deliverables**:
- `app/not-found.tsx` file
- `styles/animations/chess-piece-404.css` file
- CSS variables integrated with app theme
- Centered container structure

---

### Stage 2: Chess Knight Illustration
**Goal**: Create a chess Knight piece using pure CSS shapes

**Tasks**:
- [ ] Design Knight silhouette structure:
  - Horse head profile (combination of circles and curved shapes)
  - Base/pedestal (trapezoid or rounded rectangle)
  - Details (eye, mane, neck curve)
  - Optional: crown/top decoration
- [ ] Implement using CSS shapes:
  - `border-radius` for curves
  - `clip-path` for complex shapes (optional)
  - Pseudo-elements (::before, ::after) for details
- [ ] Size Knight appropriately:
  - Mobile: ~120px - 150px
  - Tablet: ~180px - 200px
  - Desktop: ~200px - 250px
- [ ] Apply theme-aware colors:
  - Light mode: Dark piece on light background
  - Dark mode: Light piece on dark background

**Deliverables**:
- Knight SVG-like CSS illustration
- Responsive sizing system
- Theme-compatible colors

---

### Stage 3: Wiggle/Dance Animation
**Goal**: Create engaging, playful movement for the Knight

**Animation Options** (choose one or combine):

**Option A: Gentle Wiggle**
- Subtle rotation: -5° to +5°
- Duration: 1.5s - 2s
- Easing: ease-in-out
- Infinite loop

**Option B: Bounce Dance**
- Vertical translation: 0px to -20px
- Rotation: -8° to +8°
- Duration: 2s
- Easing: cubic-bezier for bounce effect
- Infinite loop

**Option C: Knight Gallop** (More complex)
- Combined rotation + translation
- Mimics horse galloping motion
- 3-4 keyframe steps
- Duration: 2.5s
- Infinite loop

**Tasks**:
- [ ] Implement chosen animation keyframes
- [ ] Add transform-origin for natural pivot point
- [ ] Test performance on mobile devices
- [ ] Add `will-change: transform` for GPU acceleration
- [ ] Ensure animation respects `prefers-reduced-motion`

**Deliverables**:
- Animation keyframes in `chess-piece-404.css`
- Smooth 60 FPS animation
- Accessibility support

---

### Stage 4: 404 Message & Typography
**Goal**: Create clear, friendly error messaging

**Content Structure**:
```
[Animated Knight]

404
Page Not Found

The page you're looking for has moved to a different square.

[Back to Home Button]
```

**Tasks**:
- [ ] Style "404" heading:
  - Large, bold font (text-6xl md:text-8xl)
  - Theme-aware color (foreground)
  - Slight letter spacing
- [ ] Style "Page Not Found" subtitle:
  - Medium size (text-2xl md:text-3xl)
  - Muted foreground color
  - Semibold weight
- [ ] Add friendly chess-themed message:
  - Regular text size (text-base md:text-lg)
  - Centered, max-width for readability
- [ ] Create "Back to Home" button:
  - Use existing Button component with primary variant
  - Include home icon from lucide-react
  - Proper spacing and sizing

**Deliverables**:
- Typographic hierarchy
- Chess-themed copy
- Call-to-action button

---

### Stage 5: Layout & Centering
**Goal**: Perfect vertical and horizontal centering

**Tasks**:
- [ ] Implement centering strategy:
  ```css
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  ```
- [ ] Add proper spacing between elements:
  - Knight to heading: 2rem - 3rem
  - Heading to subtitle: 0.5rem - 1rem
  - Subtitle to description: 1rem
  - Description to button: 2rem
- [ ] Test on various viewport heights
- [ ] Ensure mobile Safari compatibility (100vh issues)
- [ ] Add padding for edge cases (very small screens)

**Deliverables**:
- Perfectly centered layout
- Responsive spacing system
- Mobile-safe viewport handling

---

### Stage 6: Theme Integration
**Goal**: Seamless light/dark mode support

**Tasks**:
- [ ] Extract colors from `globals.css`:
  - `--background`
  - `--foreground`
  - `--muted-foreground`
  - `--primary`
  - `--border`
- [ ] Apply theme colors to Knight:
  - Piece body: `--foreground` or `--muted`
  - Piece outline: `--border`
  - Base: `--card`
- [ ] Test in both themes:
  - Light mode visibility
  - Dark mode visibility
  - Contrast ratios
- [ ] Add optional subtle glow/shadow for depth

**Deliverables**:
- Theme-aware color system
- Perfect visibility in both modes
- Consistent with app design

---

### Stage 7: Responsive Optimization
**Goal**: Perfect mobile-to-desktop experience

**Breakpoints**:
```css
/* Mobile: default (320px - 639px) */
/* Tablet: sm (640px - 767px) */
/* Desktop: md (768px+) */
```

**Tasks**:
- [ ] Test on mobile (320px - 480px):
  - Knight size: 120px - 140px
  - Font sizes: text-5xl, text-xl, text-sm
  - Button: full width or centered
- [ ] Test on tablet (640px - 768px):
  - Knight size: 160px - 180px
  - Font sizes: text-7xl, text-2xl, text-base
  - Button: auto width centered
- [ ] Test on desktop (768px+):
  - Knight size: 200px - 250px
  - Font sizes: text-8xl, text-3xl, text-lg
  - Button: auto width centered
- [ ] Add `prefers-reduced-motion` support:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .knight {
      animation: none;
    }
  }
  ```
- [ ] Optimize animation performance:
  - Use `transform` and `opacity` only
  - Add `will-change: transform`
  - Test on low-end devices

**Deliverables**:
- Mobile-first responsive CSS
- Performance optimizations
- Accessibility features

---

### Stage 8: Additional Enhancements (Optional)
**Goal**: Extra polish and delight

**Optional Features**:
- [ ] Add subtle background pattern (chessboard grid)
- [ ] Particle effects (floating chess pieces in background)
- [ ] Sound effect on load (gentle "knight move" sound)
- [ ] Easter egg: Click knight for special animation
- [ ] Recently visited pages list (if applicable)
- [ ] Search functionality to find what user was looking for

**Deliverables**:
- Enhanced visual experience
- Interactive elements
- Better user guidance

---

### Stage 9: Testing & Documentation
**Goal**: Ensure quality and maintainability

**Tasks**:
- [ ] Test 404 triggering:
  - Navigate to `/invalid-route`
  - Navigate to `/view/nonexistent`
  - Test dynamic routes
- [ ] Browser testing:
  - Chrome, Firefox, Safari, Edge
  - Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Performance audit:
  - Lighthouse score
  - Animation FPS
  - Paint timing
- [ ] Document usage in README:
  - How to customize animation
  - How to change chess piece
  - How to adjust timing
- [ ] Add code comments

**Deliverables**:
- Fully tested 404 page
- Documentation
- Performance benchmarks

---

## File Structure

```
lca-auth/
├── app/
│   ├── not-found.tsx              # Main 404 page component
│   └── error.tsx                  # Runtime error handler (optional)
├── styles/
│   └── animations/
│       └── chess-piece-404.css    # Isolated animation CSS
└── public/
    └── sounds/                    # Optional sound effects
        └── knight-move.mp3
```

---

## CSS Custom Properties Reference

```css
/* In chess-piece-404.css */
:root {
  /* Animation timing */
  --chess-404-animation-duration: 2s;
  --chess-404-animation-delay: 0s;
  --chess-404-animation-easing: ease-in-out;

  /* Knight sizing */
  --chess-404-knight-size-mobile: 120px;
  --chess-404-knight-size-tablet: 180px;
  --chess-404-knight-size-desktop: 220px;

  /* Knight colors (inherit from globals.css) */
  --chess-404-piece-color: var(--foreground);
  --chess-404-piece-border: var(--border);
  --chess-404-piece-base: var(--card);

  /* Animation properties */
  --chess-404-wiggle-angle: 8deg;
  --chess-404-bounce-height: 20px;
}
```

---

## Component Structure (not-found.tsx)

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import '@/styles/animations/chess-piece-404.css'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      {/* Animated Knight */}
      <div className="chess-knight-404 mb-8" aria-hidden="true">
        {/* CSS-generated knight */}
      </div>

      {/* Error message */}
      <h1 className="text-6xl md:text-8xl font-bold mb-2">404</h1>
      <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground mb-4">
        Page Not Found
      </h2>
      <p className="text-base md:text-lg text-muted-foreground text-center max-w-md mb-8">
        The page you're looking for has moved to a different square.
      </p>

      {/* CTA */}
      <Link href="/">
        <Button variant="primary" size="lg" className="gap-2">
          <Home className="w-5 h-5" />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
```

---

## Technical Specifications

### Browser Support
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- CSS Flexbox
- CSS Custom Properties
- CSS Animations & Keyframes
- Pseudo-elements (::before, ::after)

### Performance Targets
- 60 FPS animation
- < 50ms Time to Interactive
- GPU-accelerated transforms
- Minimal reflows/repaints

### Accessibility
- Respects `prefers-reduced-motion`
- Semantic HTML (h1, h2, p, button)
- ARIA labels where needed
- Keyboard navigable
- Screen reader friendly

---

## Timeline Estimate

| Stage | Estimated Time | Priority |
|-------|---------------|----------|
| Stage 1 | 20 min | High |
| Stage 2 | 1.5 hours | High |
| Stage 3 | 45 min | High |
| Stage 4 | 30 min | High |
| Stage 5 | 30 min | High |
| Stage 6 | 30 min | High |
| Stage 7 | 45 min | High |
| Stage 8 | 1 hour | Low |
| Stage 9 | 30 min | Medium |
| **Total** | **~6 hours** | |

---

## Success Criteria

✓ Smooth 60 FPS chess piece animation
✓ Perfect vertical and horizontal centering
✓ Fully responsive from 320px to 1920px+
✓ Seamless light/dark mode integration
✓ Works across all app routes when page not found
✓ Accessible and respects user preferences
✓ Clean, maintainable code with isolated CSS
✓ Delightful, chess-themed user experience

---

**Version**: 2.0 (404 Chess Animation)
**Last Updated**: November 16, 2025
**Status**: Planning Phase Complete ✓

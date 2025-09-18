# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the **Limpopo Chess Academy website** - a Next.js application for managing chess tournaments, player data, and chess academy operations. The application uses Supabase for authentication and database operations, providing both public tournament viewing and authenticated user/admin functionality.

## Development Commands

### Core Development
- `pnpm dev` - Start development server on 127.0.0.1 (local IP binding for mobile testing)
- `pnpm build` - Build production version
- `pnpm start` - Start production server on 127.0.0.1
- `pnpm lint` - Run Next.js linting

### Package Management
- `pnpm install` - Install dependencies (uses pnpm workspace)
- `pnpm add <package>` - Add new dependency

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.4.6 with App Router
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Authentication**: Supabase Auth (Google, Facebook, Email/Password)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization
- **File Processing**: XLSX for tournament data parsing

### Project Structure

#### Core Directories
- `src/app/` - App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/utils/supabase/` - Supabase client configurations (server, client, middleware)
- `src/repositories/` - Data access layer for complex queries
- `src/services/` - Business logic and external service integrations
- `src/lib/` - Utility functions and shared logic
- `src/types/` - TypeScript type definitions

#### Key Application Areas
- **Authentication Flow**: `/login`, `/signup`, `/auth/` routes with OAuth providers
- **Public Pages**: Tournament listings and individual tournament views
- **User Dashboard**: Protected user profile and dashboard pages
- **Admin Dashboard**: Comprehensive admin interface with tournaments, players, performance analytics
- **Tournament Management**: Upload, parse, and manage tournament data from Excel files

### Authentication & Authorization Architecture

The app uses Supabase Auth with a comprehensive middleware setup:

- **Server-side auth**: `src/utils/supabase/server.ts` for server components/actions
- **Client-side auth**: `src/utils/supabase/client.ts` for browser interactions
- **Middleware**: `middleware.ts` handles route protection and session management
- **Protected routes**: Automatic redirect to `/login` for unauthenticated users
- **Public routes**: `/auth/*`, `/forms/*`, `/tournaments/*` are publicly accessible

### Database Layer Architecture

#### Repository Pattern
- `playerRepo.ts` - Player data access with normalized names and performance stats
- `tournamentRepo.ts` - Tournament data operations and Excel file processing

#### Key Database Tables
- `tournaments` - Tournament metadata and details
- `players` - Tournament-specific player data with rankings and round details
- `master_players` - Normalized player database for cross-tournament analysis
- `local_active_players_duplicate` - Player performance statistics and analytics

### Tournament Data Processing

The application handles tournament data through a sophisticated parsing system:

#### Excel File Processing
- Two parser types: "Enhanced" (structured format) and "Original" (legacy format)
- Metadata extraction for tournament details (organizer, location, time control, etc.)
- Player ranking parsing with tie-break support
- Round-by-round game result processing

#### Performance Rating System
- Cross-tournament player performance tracking
- Age-based filtering (U10, U12, U14, U16, U18, U20)
- Gender-based analytics
- Confidence scoring for player identity resolution

### UI Component Architecture

#### Design System
- **shadcn/ui**: Base component library with consistent styling
- **Theme System**: Dark/light mode support with CSS variables
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Component Structure**: Atomic design with reusable UI components

#### Key UI Patterns
- **Modal System**: Consistent modal patterns for forms and data views
- **Table Components**: Complex data tables with sorting, filtering, and expansion
- **Navigation**: Responsive navigation with mobile hamburger menu
- **Admin Layout**: Sidebar-based dashboard layout with collapsible menu

## Development Guidelines

### File Organization
- Use the established repository/service pattern for data access
- Keep server actions in dedicated `server-actions.ts` files
- Place complex UI components in component-specific directories
- Use TypeScript interfaces for all data structures

### Authentication Patterns
- Always use the appropriate Supabase client (server vs client)
- Handle auth states gracefully in both server and client components
- Implement proper error handling for auth operations

### Database Operations
- Use the repository pattern for complex queries
- Implement proper error handling and logging
- Use TypeScript for type-safe database operations
- Handle both authenticated and public data access patterns

### UI Development
- Follow the established component patterns from shadcn/ui
- Use CSS variables for consistent theming
- Implement responsive designs with mobile-first approach
- Use proper loading states and error handling in components

## Environment Setup

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous public key

### Development Server
The development server binds to `127.0.0.1` specifically to support mobile device testing on the local network.

### Dependencies
The project uses a pnpm workspace configuration and includes specific ignore patterns for `@tailwindcss/oxide` and `sharp` in the workspace configuration.
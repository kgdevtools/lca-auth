'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * AutoSyncProvider - Triggers Lichess sync only when on live-games routes
 * This prevents unnecessary API calls when viewing other pages
 */
export default function AutoSyncProvider() {
  const pathname = usePathname()
  
  useEffect(() => {
    const isLiveGamesRoute = pathname === '/live-games' || 
                           pathname.startsWith('/live-games/') ||
                           pathname.startsWith('/admin/live-games')
    
    let interval: NodeJS.Timeout | null = null
    
    if (isLiveGamesRoute) {
      console.log('%c🎮 Live games route detected, starting sync', 'color: #10b981; font-weight: bold')
      
      // Run immediately on route change to live-games
      triggerSync()
      
      // Then run every 5 seconds
      interval = setInterval(() => {
        triggerSync()
      }, 5000)
    } else {
      console.log('%c🔗 Non-live-games route, sync disabled', 'color: #6b7280; font-style: italic')
    }
    
    // Cleanup on unmount or route change
    return () => {
      if (interval) {
        console.log('%c⏹️ Sync stopped', 'color: #ef4444')
        clearInterval(interval)
      }
    }
  }, [pathname])
  
  return null // This component doesn't render anything
}

async function triggerSync() {
  try {
    const response = await fetch('/api/cron/lichess-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.log('%c❌ Lichess sync failed', 'color: #ef4444; font-weight: bold', response.status)
    } else {
      // Minimal success log - just show games updated count if available
      const gamesUpdated = data.gamesUpdated || '✓'
      console.log(`%c♟️ Sync: ${gamesUpdated} games`, 'color: #10b981; font-size: 12px')
    }
  } catch (error) {
    console.log('%c⚠️ Sync error', 'color: #f59e0b; font-style: italic')
  }
}

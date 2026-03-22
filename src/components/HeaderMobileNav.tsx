'use client'

import { MobileNav } from '@/components/mobile-nav'
import { usePathname } from 'next/navigation'

interface HeaderMobileNavProps {
  isAuthenticated: boolean
  isAdmin?: boolean
}

export default function HeaderMobileNav({ isAuthenticated, isAdmin }: HeaderMobileNavProps) {
  const pathname = usePathname()
  
  const isNestedRoute = pathname?.startsWith('/academy') || 
                        pathname?.startsWith('/user') || 
                        pathname?.startsWith('/admin')
  
  if (isNestedRoute) {
    return null
  }

  return <MobileNav isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
}

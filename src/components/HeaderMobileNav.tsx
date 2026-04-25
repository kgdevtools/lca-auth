'use client'

import { MobileNav } from '@/components/mobile-nav'

interface HeaderMobileNavProps {
  isAuthenticated: boolean
  isAdmin?: boolean
}

export default function HeaderMobileNav({ isAuthenticated, isAdmin }: HeaderMobileNavProps) {
  return <MobileNav isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
}

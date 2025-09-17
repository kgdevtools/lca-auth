'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

interface WarningBannerProps {
  message: string;
}

export function WarningBanner({ message }: WarningBannerProps) {
  return (
    <Alert className="bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200 mb-4">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  )
}


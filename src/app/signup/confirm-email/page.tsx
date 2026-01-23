"use client"

import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message")

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl lg:max-w-3xl shadow-lg border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Check Your Email
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {message && (
            <div className="p-4 rounded-sm bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
              <p className="font-medium text-center">{message}</p>
            </div>
          )}

          <div className="text-center space-y-4">
            <p className="text-lg text-foreground font-medium">
              We've sent a confirmation email to your inbox.
            </p>
            <p className="text-base text-muted-foreground">
              Click the link in the email to activate your account.
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              Don't forget to check your spam folder if you don't see it.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/login">
              <Button className="w-full h-12 text-base font-semibold">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <ConfirmEmailContent />
    </Suspense>
  )
}

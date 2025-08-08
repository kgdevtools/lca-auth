import { signInWithGoogle } from './server-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { type SearchParams } from 'next/dist/server/request/search-params'

export default function LoginPage() {
  // Extract error from search params via URL API (Server Component)
  const url = typeof window === 'undefined' ? undefined : new URL(window.location.href)
  // Note: In Server Components we can't access window. Use a simple guard; error will be handled by middleware redirect if needed.
  const errorMessage = undefined
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Continue with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <Alert className="mb-3">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <Suspense fallback={<Button disabled className="w-full">Loading…</Button>}>
            <form action={signInWithGoogle} className="w-full">
              <Button type="submit" className="w-full" size="md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.815C14.094 16.108 18.681 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 16.318 4 9.68 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c4.837 0 9.236-1.852 12.549-4.878l-5.799-4.902C28.759 35.523 26.486 36.4 24 36.4c-5.192 0-9.607-3.317-11.258-7.946l-6.53 5.033C9.54 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 01-4.053 5.22l.003-.002 5.799 4.902C35.65 39.194 40 36 43.001 31.5c1.23-2.1 1.999-4.55 1.999-7.5 0-1.341-.138-2.651-.389-3.917z" />
                </svg>
                Continue with Google
              </Button>
            </form>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}



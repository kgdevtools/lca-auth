'use client'

import { signInWithGoogle, signInWithEmail, signInWithFacebook } from './server-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WarningBanner } from '@/components/warning-banner'
import Image from 'next/image'
import Link from "next/link"
import { Facebook } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm md:max-w-md lg:max-w-lg">
        <CardHeader className="flex flex-col items-center">
          <Image src="/lca_mark.svg" alt="LCA Logo" className="mb-4 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40" />
          <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl">Sign in</CardTitle>
          <CardDescription className="text-muted-foreground text-center lg:text-base">Login to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <WarningBanner message="Still under development: Some services may not work." />
          {message && (
            <Alert className="mb-4 bg-red-100 border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form action={signInWithEmail} className="space-y-4 mb-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" placeholder="m@example.com" required disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" name="password" required disabled />
            </div>
            <Button type="submit" className="w-full" disabled>
              Sign In
            </Button>
          </form>
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Suspense fallback={<Button disabled className="w-full">Loading…</Button>}>
            <form action={signInWithGoogle} className="w-full mb-2">
              <Button type="submit" className="w-full" size="md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 mr-2">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.815C14.094 16.108 18.681 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 16.318 4 9.68 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c4.837 0 9.236-1.852 12.549-4.878l-5.799-4.902C28.759 35.523 26.486 36.4 24 36.4c-5.192 0-9.607-3.317-11.258-7.946l-6.53 5.033C9.54 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 01-4.053 5.22l.003-.002 5.799 4.902C35.65 39.194 40 36 43.001 31.5c1.23-2.1 1.999-4.55 1.999-7.5 0-1.341-.138-2.651-.389-3.917z" />
                </svg>
                Continue with Google
              </Button>
            </form>
            <form action={signInWithFacebook} className="w-full">
              <Button type="submit" className="w-full" size="md" disabled>
                <Facebook className="h-5 w-5 mr-2" />
                Continue with Facebook
              </Button>
            </form>
          </Suspense>
          <div className="mt-4 text-center text-sm text-muted-foreground lg:text-base">
            Don't have an account?{' '}
            <Link href="/signup" className="underline text-primary hover:text-primary/80">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



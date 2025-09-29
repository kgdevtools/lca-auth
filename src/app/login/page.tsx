"use client"

import { signInWithGoogle } from "./server-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Suspense } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function LoginContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message")

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="flex flex-col items-center pt-6 pb-4">
          <div className="relative mb-4 w-64 h-24 sm:w-72 sm:h-28 md:w-80 md:h-32 lg:w-96 lg:h-36">
            <Image
              src="/Picture1.png"
              alt="LCA Logo (light)"
              fill
              priority
              className="object-contain block dark:hidden"
              sizes="(min-width: 1024px) 24rem, (min-width: 768px) 20rem, 16rem"
            />
            <Image
              src="/LCA_Logo_Dark.png"
              alt="LCA Logo (dark)"
              fill
              priority
              className="object-contain hidden dark:block"
              sizes="(min-width: 1024px) 24rem, (min-width: 768px) 20rem, 16rem"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
              <AlertDescription className="font-medium">{message}</AlertDescription>
            </Alert>
          )}

          <Suspense
            fallback={
              <Button disabled className="w-full h-12">
                Loading…
              </Button>
            }
          >
            <form action={signInWithGoogle} className="w-full">
              <Button
                type="submit"
                className="w-full h-14 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors"
                size="lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6 mr-3">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.815C14.094 16.108 18.681 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.408 6.053 28.97 4 24 4 16.318 4 9.68 8.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c4.837 0 9.236-1.852 12.549-4.878l-5.799-4.902C28.759 35.523 26.486 36.4 24 36.4c-5.192 0-9.607-3.317-11.258-7.946l-6.53 5.033C9.54 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 01-4.053 5.22l.003-.002 5.799 4.902C35.65 39.194 40 36 43.001 31.5c1.23-2.1 1.999-4.55 1.999-7.5 0-1.341-.138-2.651-.389-3.917z"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </Suspense>

          <div className="text-center text-sm text-muted-foreground/80 lg:text-base font-medium">
            Don't have an account?{" "}
            <Link href="/signup" className="underline text-primary hover:text-primary/80 font-semibold">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

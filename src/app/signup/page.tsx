"use client"

import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { signUpWithGoogle, signUpWithEmail } from './server-actions'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

function SignupContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Validate fields
    if (!email.trim()) {
      setError('Email is required')
      setIsLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    if (!password) {
      setError('Password is required')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Submit the form
    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    
    const result = await signUpWithEmail(formData)
    if (result?.error) {
      setError(result.error)
    }
    
    setIsLoading(false)
  }

  const handleGoogleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsGoogleLoading(true)

    // Submit the form
    const formData = new FormData(e.currentTarget)
    await signUpWithGoogle(formData)
    
    setIsGoogleLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-xl lg:max-w-2xl shadow-lg border-border/50 overflow-hidden">
        {/* Image covering entire top part of the card */}
        <div className="relative w-full h-48 sm:h-56 md:h-64">
          <Image
            src="/Picture1.png"
            alt="LCA Logo (light)"
            fill
            priority
            className="object-cover block dark:hidden"
            sizes="(min-width: 1024px) 32rem, (min-width: 768px) 28rem, 24rem"
          />
          <Image
            src="/LCA_Logo_Dark.png"
            alt="LCA Logo (dark)"
            fill
            priority
            className="object-cover hidden dark:block"
            sizes="(min-width: 1024px) 32rem, (min-width: 768px) 28rem, 24rem"
          />
        </div>
        
        <CardHeader className="flex flex-col items-center pt-4 pb-2">
          <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl leading-tight">Sign Up</CardTitle>
          <CardDescription className="text-muted-foreground text-center lg:text-base leading-tight">
            Create your LCA Chess account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(message || error) && (
            <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
              <AlertDescription className="font-medium">{error || message}</AlertDescription>
            </Alert>
          )}

          {/* Email/Password Signup Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-10"
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm_password" className="text-sm">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-10"
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Signup Form */}
          <form onSubmit={handleGoogleSubmit} className="w-full">
            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors"
              size="lg"
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 mr-2">
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
                  Sign Up with Google
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground/80 lg:text-base font-medium leading-tight">
            Already have an account?{" "}
            <Link href="/login" className="underline text-primary hover:text-primary/80 font-semibold">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  )
}

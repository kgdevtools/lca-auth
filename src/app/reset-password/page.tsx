"use client"

import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { resetPassword } from './server-actions'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    // Submit the form
    const formData = new FormData()
    formData.append('email', email)
    
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setIsSuccess(true)
    }
    
    setIsLoading(false)
  }

  if (isSuccess) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg shadow-lg border-border/50 overflow-hidden">
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl leading-tight text-center">
              Reset Link Sent
            </CardTitle>
            <CardDescription className="text-muted-foreground text-center lg:text-base leading-tight">
              Check your email for instructions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Password reset email sent! 📧
                </h3>
                <p className="text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Check your inbox and spam folder.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground">What to do next:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>• Check your email inbox</li>
                  <li>• Look for the reset password email</li>
                  <li>• Click the reset link in the email</li>
                  <li>• Create a new password</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Link href="/login">
                <Button className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
              
              <div className="text-center text-sm text-muted-foreground">
                Didn't receive the email? 
                <button 
                  onClick={() => setIsSuccess(false)}
                  className="underline text-primary hover:text-primary/80 font-semibold ml-1"
                >
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg shadow-lg border-border/50 overflow-hidden">
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
          <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl leading-tight">Reset Password</CardTitle>
          <CardDescription className="text-muted-foreground text-center lg:text-base leading-tight">
            Enter your email to receive a reset link
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {(message || error) && (
            <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
              <AlertDescription className="font-medium">{error || message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
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

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          <div className="space-y-3 pt-4">
            <Link href="/login">
              <Button variant="outline" className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
            
            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="underline text-primary hover:text-primary/80 font-semibold">
                Sign In
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

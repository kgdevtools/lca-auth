"use client"

import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { updatePassword } from './server-actions'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

function ResetPasswordConfirmContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // Check if we have the required parameters
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Validate fields
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
    formData.append('password', password)
    
    const result = await updatePassword(formData)
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
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl leading-tight text-center">
              Password Updated
            </CardTitle>
            <CardDescription className="text-muted-foreground text-center lg:text-base leading-tight">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Success! 🔐
                </h3>
                <p className="text-muted-foreground">
                  Your password has been updated successfully. 
                  You can now sign in with your new password.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground">Security reminder:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>• Use a strong, unique password</li>
                  <li>• Don't share your password with anyone</li>
                  <li>• Consider using a password manager</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Link href="/login">
                <Button className="w-full h-12 text-base font-bold rounded-sm hover:bg-accent/90 transition-colors">
                  Sign In with New Password
                </Button>
              </Link>
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
          <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl leading-tight">Set New Password</CardTitle>
          <CardDescription className="text-muted-foreground text-center lg:text-base leading-tight">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">
                New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your new password (min. 6 characters)"
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
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Confirm your new password"
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
                  Updating Password...
                </>
              ) : (
                'Update Password'
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <ResetPasswordConfirmContent />
    </Suspense>
  )
}

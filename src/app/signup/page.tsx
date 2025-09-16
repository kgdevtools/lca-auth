import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { WarningBanner } from '@/components/warning-banner'
import Image from 'next/image'

export default function SignupPage() {
  const federations = ["LSG", "LCP", "LWT", "LVT", "LMG"]
  
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        <CardHeader className="flex flex-col items-center">
          <Image src="/lca_mark.svg" alt="LCA Logo" className="mb-4 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40" />
          <CardTitle className="text-2xl font-bold text-foreground lg:text-3xl">Sign Up</CardTitle>
          <CardDescription className="text-muted-foreground text-center lg:text-base">Create your account to join the Chess Academy</CardDescription>
        </CardHeader>
        <CardContent>
          <WarningBanner message="Still under development: Some services may not work." />
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surname">Surname <span className="text-destructive">*</span></Label>
                <Input id="surname" type="text" placeholder="Doe" required disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" type="text" placeholder="John" required disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chessaId">ChessSA ID</Label>
              <Input id="chessaId" type="text" placeholder="Optional" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="born">Born</Label>
              <Input id="born" type="date" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating</Label>
              <Input id="rating" type="number" placeholder="Optional" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="federation">Federation</Label>
              <Select disabled>
                <SelectTrigger id="federation">
                  <SelectValue placeholder="Select a federation" />
                </SelectTrigger>
                <SelectContent>
                  {federations.map((fed) => (
                    <SelectItem key={fed} value={fed}>{fed}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required disabled />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="dob-disclaimer" disabled />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="dob-disclaimer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground lg:text-base"
                >
                  By checking this, you acknowledge that we may or may not display your date of birth in tournament results as required by regulations. We are committed to protecting your privacy.
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled>
              Register
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground lg:text-base">
            Already have an account?{' '}
            <Link href="/login" className="underline text-primary hover:text-primary/80">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

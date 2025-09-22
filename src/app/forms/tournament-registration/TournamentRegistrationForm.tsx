"use client"
import type React from "react"
import { useState } from "react"
import { registerLcaOpen2025, getAllPlayers } from "./server-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"
import { HelpCircle, X, CheckCircle2, Trophy, Users, Calendar } from "lucide-react"

interface PlayerRegistration {
  id: string
  surname: string
  names: string
  section: string
  chessa_id: string | null
  federation: string | null
  rating: number | null
  sex: string | null
  created_at: string
  phone: string
  dob: string
  emergency_name: string
  emergency_phone: string
  comments?: string
  gender?: string | null
  club?: string | null
  city?: string | null
  fide_id?: string | null
}

interface RegistrationResult {
  success?: boolean
  error?: string
  player?: PlayerRegistration
}

// Tooltip component for discount information
function DiscountTooltip() {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-full p-1"
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="Discount information"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {showTooltip && (
        <div className="absolute z-10 w-64 p-4 mt-2 text-sm bg-card border border-border rounded-lg shadow-xl backdrop-blur-sm">
          <div className="font-semibold mb-2 text-card-foreground">Discount Information</div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>PCC members get 80% discount</li>
            <li>LCA members get 50% discount</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              href="/forms/register-player"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Head over to LCA Registrations →
            </Link>
          </div>
          <button
            type="button"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
            onClick={() => setShowTooltip(false)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// Modal component for poster preview
function PosterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="absolute top-4 right-4 z-10 p-2 bg-card/90 backdrop-blur-sm rounded-md shadow-lg hover:bg-muted transition-colors border border-border"
          onClick={onClose}
        >
          <X className="h-5 w-5 text-card-foreground" />
        </button>
        <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          <Image
            src="/IMG-20250921-WA0000.jpg"
            alt="Limpopo Chess Academy Open 2025 Tournament Poster"
            width={800}
            height={1200}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}

export default function TournamentRegistrationForm() {
  // Form state
  const [form, setForm] = useState({
    surname: "",
    names: "",
    phone: "",
    dob: "",
    chessaId: "",
    fideId: "",
    rating: "",
    section: "",
    emergencyName: "",
    emergencyPhone: "",
    comments: "",
    gender: "",
    club: "",
    city: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<PlayerRegistration | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [allPlayers, setAllPlayers] = useState<PlayerRegistration[]>([])
  const [showPosterModal, setShowPosterModal] = useState(false)

  // Handlers
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleSectionSelect(section: string) {
    setForm((f) => ({ ...f, section }))
  }

  type FormFields = {
    surname: string
    names: string
    phone: string
    dob: string
    chessaId: string
    fideId: string
    rating: string
    section: string
    emergencyName: string
    emergencyPhone: string
    comments: string
    gender: string
    club: string
    city: string
  }

  function validate(form: FormFields) {
    const errors: Record<string, string> = {}
    if (!form.surname.trim()) errors.surname = "Surname is required."
    if (!form.names.trim()) errors.names = "Name(s) is required."
    if (!form.phone.trim()) errors.phone = "Phone number is required."
    else if (!/^\d{8,}$/.test(form.phone.replace(/[^\d]/g, ""))) errors.phone = "Enter a valid phone number."
    if (!form.dob) errors.dob = "Date of birth is required."
    if (!form.section) errors.section = "Please select a section."
    if (!form.emergencyName.trim()) errors.emergencyName = "Emergency contact name is required."
    if (!form.emergencyPhone.trim()) errors.emergencyPhone = "Emergency contact phone is required."
    else if (!/^\d{8,}$/.test(form.emergencyPhone.replace(/[^\d]/g, "")))
      errors.emergencyPhone = "Enter a valid phone number."
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setSubmitting(true)
    try {
      const result: RegistrationResult = await registerLcaOpen2025({
        surname: form.surname,
        names: form.names,
        phone: form.phone,
        dob: form.dob,
        chessaId: form.chessaId,
        fideId: form.fideId,
        rating: form.rating,
        section: form.section,
        emergencyName: form.emergencyName,
        emergencyPhone: form.emergencyPhone,
        comments: form.comments,
        gender: form.gender,
        club: form.club,
        city: form.city,
      })
      if (result?.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      if (!result?.success || !result?.player) {
        setError("Registration failed. Please try again.")
        setSubmitting(false)
        return
      }
      // On successful registration, fetch all players
      const allPlayersData = await getAllPlayers()
      setAllPlayers(allPlayersData)
      setSuccess(result.player)

      // Reset form
      setForm({
        surname: "",
        names: "",
        phone: "",
        dob: "",
        chessaId: "",
        fideId: "",
        rating: "",
        section: "",
        emergencyName: "",
        emergencyPhone: "",
        comments: "",
        gender: "",
        club: "",
        city: "",
      })
    } catch (error) {
      console.error("Form submission error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    // Calculate section counts from all players
    const sectionCounts = allPlayers.reduce(
      (acc: Record<string, number>, player) => {
        acc[player.section] = (acc[player.section] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return (
      <div className="max-w-6xl mx-auto space-y-6 mt-8">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-emerald-700 dark:text-emerald-300">Registration Successful!</h2>
          <p className="text-emerald-600 dark:text-emerald-400 text-lg max-w-2xl mx-auto">
            Welcome to the Limpopo Chess Academy Open 2025. Your registration has been confirmed and you're all set to
            compete!
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-card-foreground text-xl">Your Registration Details</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Confirmation of your tournament entry
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                <div className="text-foreground font-medium">
                  {success.surname}, {success.names}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Section</div>
                <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                  {success.section} Section
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div className="text-foreground">{success.phone}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                <div className="text-foreground">{success.dob}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Chess SA ID</div>
                <div className="text-foreground">{success.chessa_id || "Not provided"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">FIDE ID</div>
                <div className="text-foreground">{success.fide_id || "Not provided"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Rating</div>
                <div className="text-foreground">{success.rating || "Unrated"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Gender</div>
                <div className="text-foreground">{success.gender || "Not specified"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Club</div>
                <div className="text-foreground">{success.club || "Independent"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Location</div>
                <div className="text-foreground">{success.city || "Not specified"}</div>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <div className="text-sm font-medium text-muted-foreground">Emergency Contact</div>
                <div className="text-foreground">
                  {success.emergency_name} ({success.emergency_phone})
                </div>
              </div>
              {success.comments && (
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <div className="text-sm font-medium text-muted-foreground">Comments</div>
                  <div className="text-foreground bg-muted rounded-md p-3 border border-border">{success.comments}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-md">
                  <Users className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-card-foreground text-xl">Tournament Overview</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Current registration status across all sections
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["A", "B", "C"].map((section) => (
                  <Badge
                    key={section}
                    variant={success.section === section ? "default" : "outline"}
                    className={
                      success.section === section
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground bg-muted/50"
                    }
                  >
                    {section} Section: {sectionCounts[section] || 0} players
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border border-border rounded-md overflow-hidden bg-muted/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground font-medium w-12">#</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Player Name</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-center">Section</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-center">Rating</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-center hidden md:table-cell">
                      Chess SA ID
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPlayers.map((player, index) => (
                    <TableRow
                      key={player.id}
                      className={`border-border transition-colors ${
                        player.id === success.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-2">
                          {player.surname}, {player.names}
                          {player.id === success.id && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50">
                          {player.section}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{player.rating || "Unrated"}</TableCell>
                      <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                        {player.chessa_id || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allPlayers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No players registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50">
          <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>Next Steps:</strong> Official tournament pairings will be posted on chess-results.com when
            available. Keep an eye on your email and our social media for updates.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <PosterModal isOpen={showPosterModal} onClose={() => setShowPosterModal(false)} />

      <form
        className="max-w-3xl mx-auto bg-card border border-border rounded-lg shadow-xl p-6 md:p-8 space-y-6 mt-8"
        onSubmit={handleSubmit}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div
              className="relative cursor-pointer group w-full max-w-md mx-auto"
              onClick={() => setShowPosterModal(true)}
            >
              <div className="relative w-full h-16 overflow-hidden rounded-md shadow-lg border border-border group-hover:border-muted-foreground transition-colors">
                <Image
                  src="/IMG-20250921-WA0000.jpg"
                  alt="Limpopo Chess Academy Open 2025 Tournament Poster"
                  width={800}
                  height={1200}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 flex items-center justify-center group-hover:from-black/60 group-hover:to-black/40 transition-all">
                  <span className="text-white font-semibold text-sm">View Tournament Poster</span>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Limpopo Chess Academy Open 2025</h1>
          <p className="text-muted-foreground text-lg">Tournament Registration Form</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <div className="text-destructive font-semibold mb-1">Registration Error</div>
            <div className="text-destructive/80">{error}</div>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground text-xl">Personal Information</CardTitle>
            <CardDescription className="text-muted-foreground">Please provide your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="surname" className="text-foreground font-medium">
                  Surname *
                </Label>
                <Input
                  id="surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  placeholder="Enter your surname"
                  className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.surname ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                  }`}
                />
                {fieldErrors.surname && <p className="text-destructive text-sm">{fieldErrors.surname}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="names" className="text-foreground font-medium">
                  Name(s) *
                </Label>
                <Input
                  id="names"
                  name="names"
                  value={form.names}
                  onChange={handleChange}
                  placeholder="Enter your name(s)"
                  className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.names ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                  }`}
                />
                {fieldErrors.names && <p className="text-destructive text-sm">{fieldErrors.names}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground font-medium">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.phone ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                  }`}
                />
                {fieldErrors.phone && <p className="text-destructive text-sm">{fieldErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-foreground font-medium">
                  Date of Birth *
                </Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleChange}
                  className={`bg-background border-input text-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.dob ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                  }`}
                />
                {fieldErrors.dob && <p className="text-destructive text-sm">{fieldErrors.dob}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="chessaId" className="text-foreground font-medium">
                  Chess SA ID
                </Label>
                <Input
                  id="chessaId"
                  name="chessaId"
                  value={form.chessaId}
                  onChange={handleChange}
                  placeholder="Enter your Chess SA ID (if available)"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fideId" className="text-foreground font-medium">
                  FIDE ID
                </Label>
                <Input
                  id="fideId"
                  name="fideId"
                  value={form.fideId}
                  onChange={handleChange}
                  placeholder="Enter your FIDE ID (if available)"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating" className="text-foreground font-medium">
                  Current Rating
                </Label>
                <Input
                  id="rating"
                  name="rating"
                  value={form.rating}
                  onChange={handleChange}
                  placeholder="Enter your current rating (if available)"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center text-card-foreground text-xl">
              Tournament Section
              <DiscountTooltip />
            </CardTitle>
            <CardDescription className="text-muted-foreground">Please select your tournament section</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { section: "A", price: "R160", description: "Open to all irrespective of age or rating" },
                  { section: "B", price: "R120", description: "Players rated 1500 and lower" },
                  {
                    section: "C",
                    price: "R100",
                    description: "Junior players aged 14 years and younger irrespective of rating",
                  },
                ].map(({ section, price, description }) => (
                  <div
                    key={section}
                    onClick={() => handleSectionSelect(section)}
                    className={`p-6 border rounded-md cursor-pointer transition-all duration-200 ${
                      form.section === section
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border bg-muted/30 hover:border-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-lg text-foreground">
                        {section === "C" ? "Juniors" : `${section} Section`}
                      </div>
                      <div className="text-2xl font-bold text-primary">{price}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                ))}
              </div>
              {fieldErrors.section && <p className="text-destructive text-sm">{fieldErrors.section}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground text-xl">Emergency Contact</CardTitle>
            <CardDescription className="text-muted-foreground">
              Please provide emergency contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergencyName" className="text-foreground font-medium">
                  Emergency Contact Name *
                </Label>
                <Input
                  id="emergencyName"
                  name="emergencyName"
                  value={form.emergencyName}
                  onChange={handleChange}
                  placeholder="Enter emergency contact name"
                  className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.emergencyName
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : ""
                  }`}
                />
                {fieldErrors.emergencyName && <p className="text-destructive text-sm">{fieldErrors.emergencyName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-foreground font-medium">
                  Emergency Contact Phone *
                </Label>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={handleChange}
                  placeholder="Enter emergency contact phone"
                  className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                    fieldErrors.emergencyPhone
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : ""
                  }`}
                />
                {fieldErrors.emergencyPhone && <p className="text-destructive text-sm">{fieldErrors.emergencyPhone}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground text-xl">Additional Information</CardTitle>
            <CardDescription className="text-muted-foreground">
              Any additional comments or special requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-foreground font-medium">
                Comments
              </Label>
              <Textarea
                id="comments"
                name="comments"
                value={form.comments}
                onChange={handleChange}
                placeholder="Enter any additional comments or special requirements"
                rows={4}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                Registering...
              </div>
            ) : (
              "Register for Tournament"
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

"use client"
import { useState, useRef } from "react"
import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Phone, MapPin, Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { submitContactForm } from "./server-actions"

export default function ContactUsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Refs for focusing on invalid fields
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    }
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError("")
    }
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "Name is required"
    if (!form.email.trim()) errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Please enter a valid email"
    if (!form.subject.trim()) errors.subject = "Subject is required"
    if (!form.message.trim()) errors.message = "Message is required"
    return errors
  }

  function focusFirstError(errors: Record<string, string>) {
    if (errors.name) nameRef.current?.focus()
    else if (errors.email) emailRef.current?.focus()
    else if (errors.subject) subjectRef.current?.focus()
    else if (errors.message) messageRef.current?.focus()
  }

  function isFormValid() {
    return (
      form.name.trim() &&
      form.email.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      form.subject.trim() &&
      form.message.trim()
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setSubmitError("")

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      focusFirstError(errors)
      return
    }

    setSubmitting(true)

    try {
      const result = await submitContactForm(form)

      if (result.success) {
        setSuccess(true)
        setForm({ name: "", email: "", phone: "", subject: "", message: "" })
      } else {
        setSubmitError(result.error || "Failed to send message. Please try again.")
      }
    } catch (error) {
      console.error("Form submission error:", error)
      setSubmitError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-emerald-700 dark:text-emerald-300">
              Message Sent Successfully!
            </h2>
            <p className="text-emerald-600 dark:text-emerald-400 text-lg max-w-2xl mx-auto mb-6">
              Thank you for contacting Limpopo Chess Academy. We've received your message and will get back to you
              within 24-48 hours.
            </p>
            <Button
              onClick={() => setSuccess(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Send Another Message
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Get in touch with Limpopo Chess Academy for coaching, tournaments, or any chess-related inquiries
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground text-2xl">Send us a Message</CardTitle>
              <CardDescription className="text-muted-foreground">
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {submitError && (
                <Alert className="mb-6 bg-destructive/10 border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">{submitError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground font-medium">
                      Full Name *
                    </Label>
                    <Input
                      ref={nameRef}
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                        fieldErrors.name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                      }`}
                    />
                    {fieldErrors.name && <p className="text-destructive text-sm">{fieldErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      Email Address *
                    </Label>
                    <Input
                      ref={emailRef}
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                      className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                        fieldErrors.email ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                      }`}
                    />
                    {fieldErrors.email && <p className="text-destructive text-sm">{fieldErrors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number (optional)"
                      className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-foreground font-medium">
                      Subject *
                    </Label>
                    <Input
                      ref={subjectRef}
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="What is this regarding?"
                      className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 ${
                        fieldErrors.subject
                          ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                          : ""
                      }`}
                    />
                    {fieldErrors.subject && <p className="text-destructive text-sm">{fieldErrors.subject}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground font-medium">
                    Message *
                  </Label>
                  <Textarea
                    ref={messageRef}
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    className={`bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 resize-none ${
                      fieldErrors.message ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                    }`}
                  />
                  {fieldErrors.message && <p className="text-destructive text-sm">{fieldErrors.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !isFormValid()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      Sending Message...
                    </div>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-card-foreground text-2xl">Contact Information</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Reach out to us directly through any of these channels
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md mt-1">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Phone Numbers</h3>
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          <strong>Joe:</strong> 061 541 9367 / 072 828 1063
                        </p>
                        <p>
                          <strong>Kgaogelo:</strong> 083 454 4862
                        </p>
                        <p>
                          <strong>Tebogo:</strong> 064 008 8227 / 067 369 0673
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md mt-1">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Address</h3>
                      <p className="text-muted-foreground">
                        73 Hauptfleisch Street
                        <br />
                        Flora Park, Polokwane
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md mt-1">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Response Time</h3>
                      <p className="text-muted-foreground">
                        We typically respond within 24-48 hours during business days
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                <strong>Quick Response:</strong> For urgent tournament-related inquiries, please call directly. For
                general questions about coaching or programs, this contact form is perfect.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}

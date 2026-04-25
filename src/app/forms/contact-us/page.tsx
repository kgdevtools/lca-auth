"use client"
import { useState, useRef } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Phone, MapPin, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { submitContactForm } from "./server-actions"
import { cn } from "@/lib/utils"

const INPUT =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">· optional</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const nameRef    = useRef<HTMLInputElement>(null)
  const emailRef   = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }))
    if (submitError) setSubmitError("")
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.name.trim())    errors.name    = "Name is required"
    if (!form.email.trim())   errors.email   = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email"
    if (!form.subject.trim()) errors.subject = "Subject is required"
    if (!form.message.trim()) errors.message = "Message is required"
    return errors
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
      if (errors.name) nameRef.current?.focus()
      else if (errors.email) emailRef.current?.focus()
      else if (errors.subject) subjectRef.current?.focus()
      else if (errors.message) messageRef.current?.focus()
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
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300 mb-4">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Message sent! We'll get back to you within 24–48 hours.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
            Send another message
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Contact Us</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Get in touch with Limpopo Chess Academy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-start">
          {/* ── Form ── */}
          <div className="lg:col-span-3 bg-card rounded-sm border border-border shadow-sm">
            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
              {submitError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm border border-destructive/30 bg-destructive/5 text-destructive text-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name" error={fieldErrors.name}>
                  <input
                    ref={nameRef}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className={cn(INPUT, fieldErrors.name && "border-destructive focus:border-destructive")}
                  />
                </Field>
                <Field label="Email address" error={fieldErrors.email}>
                  <input
                    ref={emailRef}
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={cn(INPUT, fieldErrors.email && "border-destructive focus:border-destructive")}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone" optional>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Your phone number"
                    className={INPUT}
                  />
                </Field>
                <Field label="Subject" error={fieldErrors.subject}>
                  <input
                    ref={subjectRef}
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="What is this regarding?"
                    className={cn(INPUT, fieldErrors.subject && "border-destructive focus:border-destructive")}
                  />
                </Field>
              </div>

              <Field label="Message" error={fieldErrors.message}>
                <textarea
                  ref={messageRef}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us more about your inquiry…"
                  rows={5}
                  className={cn(INPUT, "resize-none", fieldErrors.message && "border-destructive focus:border-destructive")}
                />
              </Field>

              <Button
                type="submit"
                disabled={submitting || !isFormValid()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </div>

          {/* ── Contact info ── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-card rounded-sm border border-border shadow-sm px-4 sm:px-5 py-4">
              <SectionHeader label="Contact Information" />
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Phone</p>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>Joe: 061 541 9367 / 072 828 1063</p>
                      <p>Kgaogelo: 083 454 4862</p>
                      <p>Tebogo: 064 008 8227 / 067 369 0673</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-0.5">Address</p>
                    <p className="text-xs text-muted-foreground">73 Hauptfleisch Street, Flora Park, Polokwane</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-0.5">Response time</p>
                    <p className="text-xs text-muted-foreground">Within 24–48 hours on business days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-sm border border-border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
              For urgent tournament inquiries, call directly. For general coaching or program questions, this form is ideal.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

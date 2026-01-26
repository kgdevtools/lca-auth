"use server"

import { createClient } from "@/utils/supabase/server"
import { sendContactNotification } from "@/services/email.service"

interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

interface ContactResult {
  success?: boolean
  error?: string
}

export async function submitContactForm(data: ContactFormData): Promise<ContactResult> {
  try {
    // 🔎 Validation
    if (!data.name?.trim()) {
      return { success: false, error: "Name is required" }
    }

    if (!data.email?.trim()) {
      return { success: false, error: "Email is required" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return { success: false, error: "Please enter a valid email address" }
    }

    if (!data.subject?.trim()) {
      return { success: false, error: "Subject is required" }
    }

    if (!data.message?.trim()) {
      return { success: false, error: "Message is required" }
    }

    // ⚡ Use the shared server client
    const supabase = await createClient()

    const { error } = await supabase.from("contact_submissions").insert([
      {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || null,
        subject: data.subject.trim(),
        message: data.message.trim(),
        status: "new",
      },
    ])

    if (error) {
      console.error("Supabase error:", error)
      return {
        success: false,
        error: "Failed to submit contact form. Please try again.",
      }
    }

    // Send notification email (non-blocking failures are logged)
    try {
      await sendContactNotification({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || null,
        subject: data.subject.trim(),
        message: data.message.trim(),
      })
    } catch (err) {
      console.error("Contact notification error:", err)
    }

    return { success: true }
  } catch (error) {
    console.error("Contact form submission error:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    }
  }
}
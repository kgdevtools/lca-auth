import nodemailer from "nodemailer"

interface ContactFormData {
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USERNAME and SMTP_PASSWORD must be set in environment")
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465

  return { host, port, secure, auth: { user, pass } }
}

export async function sendContactNotification(data: ContactFormData) {
  const to = process.env.CONTACT_NOTIFY_EMAIL
  if (!to) {
    console.warn("CONTACT_NOTIFY_EMAIL not set, skipping contact notification")
    return
  }

  const from = process.env.FROM_EMAIL || to

  const subject = `New contact form: ${data.subject || "(no subject)"}`
  const text = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || ""}\n\nMessage:\n${data.message}`
  const html = `
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || ""}</p>
    <hr/>
    <p>${data.message.replace(/\n/g, "<br/>")}</p>
  `

  try {
    const transporter = nodemailer.createTransport(getSmtpConfig())

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })
  } catch (err) {
    console.error("Failed to send contact notification:", err)
    throw err
  }
}

export default sendContactNotification

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

interface RegistrationNotice {
  tournament: string;
  slug: string;
  surname: string;
  names: string;
  section: string;
  count: number; // total registrations for this tournament after this insert
}

/**
 * Notify the organiser of a new tournament registration. Sends one email per
 * registration; the subject is louder at every 10th (milestone). Reuses the same
 * SMTP transport as the contact form. Best-effort: callers log + swallow errors.
 */
export async function sendRegistrationNotification(data: RegistrationNotice) {
  const to = process.env.REGISTRATION_NOTIFY_EMAIL || process.env.CONTACT_NOTIFY_EMAIL;
  if (!to) {
    console.warn("REGISTRATION_NOTIFY_EMAIL / CONTACT_NOTIFY_EMAIL not set, skipping registration notification");
    return;
  }
  const from = process.env.FROM_EMAIL || to;
  const milestone = data.count > 0 && data.count % 10 === 0;

  const subject = milestone
    ? `🎯 ${data.count} registrations — ${data.tournament}`
    : `New registration: ${data.surname} ${data.names} (Section ${data.section}) — ${data.tournament}`;

  const text =
    `Tournament: ${data.tournament} (${data.slug})\n` +
    `Player: ${data.surname} ${data.names}\n` +
    `Section: ${data.section}\n` +
    `Total registrations: ${data.count}\n`;

  const html = `
    <p><strong>${data.tournament}</strong> <span style="color:#888">(${data.slug})</span></p>
    <p><strong>Player:</strong> ${data.surname} ${data.names}<br/>
       <strong>Section:</strong> ${data.section}<br/>
       <strong>Total registrations:</strong> ${data.count}</p>
    ${milestone ? `<p style="font-size:18px"><strong>🎯 Milestone: ${data.count} registrations!</strong></p>` : ""}
  `;

  try {
    const transporter = nodemailer.createTransport(getSmtpConfig());
    await transporter.sendMail({ from, to, subject, text, html });
  } catch (err) {
    console.error("Failed to send registration notification:", err);
    throw err;
  }
}

export default sendContactNotification

import "server-only"

import { Resend } from "resend"

// Transactional email, through Resend.
//
// The API key is read lazily rather than at import. A missing key should stop
// the one feature that needs it, not the whole app — `next build` and every
// page that never sends mail have no business caring whether email is
// configured.

export class EmailNotConfigured extends Error {
  constructor(missing: string) {
    super(`Email is not configured: ${missing} is not set.`)
    this.name = "EmailNotConfigured"
  }
}

/** Where mail comes from. Must be an address on a domain verified in Resend —
    Resend rejects anything else, which is the failure people hit first. */
function sender(): string {
  const from = process.env.EMAIL_FROM?.trim()
  if (!from) {
    throw new EmailNotConfigured("EMAIL_FROM")
  }
  return from
}

function client(): Resend {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    throw new EmailNotConfigured("RESEND_API_KEY")
  }
  return new Resend(key)
}

export type SendResult = { id: string }

async function send(options: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<SendResult> {
  const { data, error } = await client().emails.send({
    from: sender(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })

  // The SDK reports failures in the payload rather than by throwing, so an
  // unchecked call looks like it worked and silently sends nothing.
  if (error) {
    throw new Error(`Resend refused the message: ${error.message}`)
  }
  if (!data?.id) {
    throw new Error("Resend accepted the message but returned no id.")
  }

  return { id: data.id }
}

// Deliberately plain HTML with inline styles. Email clients strip <style>
// blocks and know nothing about our CSS variables, so nothing here is shared
// with the app's styling — a reset email that arrives unstyled is fine, one
// that arrives unreadable is not.
function resetHtml(url: string, minutes: number): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">Reset your password</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">
          Someone asked to reset the password for your Forward account. Click the
          button below to choose a new one.
        </p>
        <p style="margin:0 0 24px">
          <a href="${url}" style="display:inline-block;background:#2f27ce;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 20px;border-radius:8px">Choose a new password</a>
        </p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#52525b">
          This link works once and expires in ${minutes} minutes. If you didn't
          ask for this, you can ignore this email — your password will not
          change.
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;word-break:break-all">
          If the button doesn't work, paste this into your browser:<br>${url}
        </p>
      </td></tr>
    </table>
  </body>
</html>`
}

function resetText(url: string, minutes: number): string {
  return [
    "Reset your password",
    "",
    "Someone asked to reset the password for your Forward account.",
    "Open this link to choose a new one:",
    "",
    url,
    "",
    `This link works once and expires in ${minutes} minutes.`,
    "If you didn't ask for this, you can ignore this email — your password will not change.",
  ].join("\n")
}

export async function sendPasswordResetEmail(options: {
  to: string
  url: string
  expiresInMinutes: number
}): Promise<SendResult> {
  return send({
    to: options.to,
    subject: "Reset your Forward password",
    html: resetHtml(options.url, options.expiresInMinutes),
    text: resetText(options.url, options.expiresInMinutes),
  })
}

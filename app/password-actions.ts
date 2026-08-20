"use server"

import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import {
  EmailNotConfigured,
  EmailRejected,
  sendPasswordResetEmail,
} from "@/lib/email/resend"
import { MIN_PASSWORD_LENGTH } from "@/lib/auth"
import {
  consumeResetToken,
  createResetRequest,
  RESET_TOKEN_TTL_MINUTES,
  revokeTokensFor,
} from "@/lib/password-reset"

/** Where the reset link points. In production this has to be the real origin —
    a link to localhost in someone's inbox is the classic way this ships
    broken. */
function origin(): string {
  const configured = process.env.AUTH_URL?.trim().replace(/\/+$/, "")
  if (configured) {
    return configured
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_URL must be set in production to build reset links.")
  }
  return "http://localhost:3000"
}

export type ForgotState = {
  /** Shown once the request has been accepted, whether or not mail went out. */
  done: boolean
  error: string | null
}

export async function requestPasswordReset(
  _prevState: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { done: false, error: "Enter a valid email address." }
  }

  let request
  try {
    request = await createResetRequest(email)
  } catch (error) {
    console.error("Could not create a reset token:", error)
    return { done: false, error: "Something went wrong. Try again shortly." }
  }

  // No account, or one went out a moment ago. Reported exactly like success:
  // a form that answers differently is a way to find out who has an account.
  if (!request.sent) {
    return { done: true, error: null }
  }

  const url = `${origin()}/reset-password?token=${encodeURIComponent(request.token)}`

  try {
    await sendPasswordResetEmail({
      to: request.email,
      url,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    })
  } catch (error) {
    // Misconfiguration is worth saying out loud — it is ours to fix, and
    // "check your inbox" would be a lie when nothing was ever sent.
    //
    // A rejection Resend calls permanent gets the same treatment: an unverified
    // sending domain or a bad key will still be broken in a minute, so "try
    // again shortly" would send someone off to do exactly the thing that
    // cannot work. The reason goes to the log rather than the screen — it
    // names our infrastructure, and the person reading it cannot act on it.
    if (
      error instanceof EmailNotConfigured ||
      (error instanceof EmailRejected && error.permanent)
    ) {
      console.error(
        error instanceof EmailRejected
          ? `Email rejected (${error.status}): ${error.message}`
          : error.message
      )
      return {
        done: false,
        error: "Email isn't set up correctly on this server. Contact support.",
      }
    }
    console.error("Could not send the reset email:", error)
    return {
      done: false,
      error: "We couldn't send that email. Try again shortly.",
    }
  }

  return { done: true, error: null }
}

export type ResetState = { done: boolean; error: string | null }

export async function resetPassword(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      done: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }
  }
  if (password !== confirm) {
    return { done: false, error: "Those passwords don't match." }
  }

  // Spent before the password is written, so a token cannot be replayed by a
  // second request that arrives while the first is still hashing.
  const check = await consumeResetToken(token)
  if (!check.valid) {
    return {
      done: false,
      error:
        check.reason === "used"
          ? "That link has already been used. Request a new one."
          : "That link is invalid or has expired. Request a new one.",
    }
  }

  await db
    .update(users)
    .set({ passwordHash: await hash(password, 12) })
    .where(eq(users.id, check.userId))

  await revokeTokensFor(check.userId)

  // No automatic sign-in. Whoever just set the password should prove they can
  // use it, and the session that results belongs to the login flow rather than
  // to a link out of an email.
  return { done: true, error: null }
}

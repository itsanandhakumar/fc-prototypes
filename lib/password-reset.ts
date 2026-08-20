import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { and, desc, eq, gt, isNull } from "drizzle-orm"

import { db } from "@/lib/db"
import { passwordResetTokens, users } from "@/lib/db/schema"

/** Long enough that guessing is hopeless, short enough to survive a mail client
    wrapping the URL. 32 bytes is 43 base64url characters. */
const TOKEN_BYTES = 32

export const RESET_TOKEN_TTL_MINUTES = 60

/** How long an account has to wait before another email is sent. Without this,
    a form anyone can submit is a way to flood someone else's inbox. */
const RESEND_COOLDOWN_SECONDS = 60

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export type ResetRequest =
  | { sent: true; token: string; email: string; expiresAt: Date }
  /** The address has no account, or one was sent moments ago. The caller still
      reports success — which of the two it was is not the sender's business. */
  | { sent: false }

/**
 * Issue a reset token for an email address, if it has an account.
 *
 * Accounts created through Google have no password yet. They still get a link:
 * setting one adds a second way in rather than locking out someone who
 * demonstrably owns the address, which is how registration already treats the
 * same collision.
 */
export async function createResetRequest(email: string): Promise<ResetRequest> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    return { sent: false }
  }

  const cooldownStart = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000)
  const [recent] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.createdAt, cooldownStart)
      )
    )
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1)

  if (recent) {
    return { sent: false }
  }

  const token = randomBytes(TOKEN_BYTES).toString("base64url")
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  return { sent: true, token, email: user.email, expiresAt }
}

export type TokenCheck =
  | { valid: true; userId: string; tokenId: string }
  | { valid: false; reason: "invalid" | "expired" | "used" }

/**
 * Look a token up without spending it — what the reset page calls to decide
 * whether to render the form or an apology.
 */
export async function checkResetToken(token: string): Promise<TokenCheck> {
  if (!token) {
    return { valid: false, reason: "invalid" }
  }

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
    .limit(1)

  if (!row) {
    return { valid: false, reason: "invalid" }
  }
  if (row.usedAt) {
    return { valid: false, reason: "used" }
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: "expired" }
  }

  return { valid: true, userId: row.userId, tokenId: row.id }
}

/**
 * Spend the token and report who it belonged to.
 *
 * The update is conditional on the token still being unused, so two requests
 * arriving together cannot both succeed — whichever loses the race changes no
 * rows and is told the link is spent.
 */
export async function consumeResetToken(token: string): Promise<TokenCheck> {
  const check = await checkResetToken(token)
  if (!check.valid) {
    return check
  }

  const result = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.id, check.tokenId),
        isNull(passwordResetTokens.usedAt)
      )
    )

  const changed = (result as unknown as { rowsAffected?: number }).rowsAffected
  if (changed === 0) {
    return { valid: false, reason: "used" }
  }

  return check
}

/** After a successful reset, every other outstanding link for that account is
    dead weight — and one of them may be sitting in an inbox someone else can
    read. The token just spent is already marked, so this catches the rest. */
export async function revokeTokensFor(userId: string) {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt)
      )
    )
}

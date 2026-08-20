// Routes and helpers shared by the auth surface. The identity itself lives in
// `auth.ts` at the root — this file holds only what both the edge proxy and the
// client components can safely import.

export const HOME_ROUTE = "/dashboard"
export const LOGIN_ROUTE = "/"

// Auth.js names its session cookie by environment: the secure variant is only
// set over HTTPS. The proxy checks for either rather than guessing which one it
// is behind.
export const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

/** What the header shows when the account has no display name — the local part
    of the email reads better than a blank space. */
export function displayNameOf(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const trimmed = name?.trim()
  if (trimmed) {
    return trimmed
  }
  return email?.split("@")[0] ?? "Your account"
}

export const MIN_PASSWORD_LENGTH = 8

export function validateCredentials(
  email: string,
  password: string
): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address."
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

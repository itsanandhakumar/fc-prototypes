// Routes and helpers shared by the auth surface. The identity itself lives in
// `auth.ts` at the root — this file holds only what both the edge proxy and the
// client components can safely import.

export const HOME_ROUTE = "/blogger"
export const LOGIN_ROUTE = "/"
export const FORGOT_PASSWORD_ROUTE = "/forgot-password"
export const RESET_PASSWORD_ROUTE = "/reset-password"

/** Reachable without a session. Password reset is the whole reason this list
    exists: someone who cannot log in is by definition logged out, so sending
    these back to the login screen would make the feature unreachable. */
export const PUBLIC_ROUTES = [
  LOGIN_ROUTE,
  FORGOT_PASSWORD_ROUTE,
  RESET_PASSWORD_ROUTE,
] as const

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => route === pathname)
}

// Auth.js names its session cookie by environment: the secure variant is only
// set over HTTPS. The proxy checks for either rather than guessing which one it
// is behind.
export const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const

// What to greet someone by. The first word of the name reads the way a person
// would say it out loud; the studio accounts are named like people here, so
// they come out the same way.
export function greetingNameOf(name: string): string {
  return name.split(/\s+/).filter(Boolean)[0] ?? name
}

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

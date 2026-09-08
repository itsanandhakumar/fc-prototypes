// Prototype auth. No real identity provider yet — a fixed set of demo accounts
// stands in for one, and the session is just a cookie the proxy checks.

export const SESSION_COOKIE = "forward_session"

export type Account = {
  email: string
  name: string
  workspace: string
}

// Every account signed in on this device. Switching between them is instant
// because there is nothing to re-authenticate against yet.
export const ACCOUNTS: Account[] = [
  {
    email: "demo@forward.tools",
    name: "Sam Okonkwo",
    workspace: "Forward — House blog",
  },
  {
    email: "editor@forward.tools",
    name: "Priya Raman",
    workspace: "Forward — Client work",
  },
  {
    email: "agency@northbound.co",
    name: "Northbound Studio",
    workspace: "Northbound — Retainer",
  },
]

export const DEMO_PASSWORD = "forward"

/**
 * Where signing in lands, and where the proxy sends anyone already signed in
 * who asks for the login screen.
 *
 * Audit rather than Blogger: it is the page that says what needs doing, and
 * the other two are where the doing happens. Arriving at the work before the
 * brief is the wrong way round.
 */
export const HOME_ROUTE = "/audit"
export const LOGIN_ROUTE = "/"

export function findAccount(email: string | undefined): Account | undefined {
  if (!email) {
    return undefined
  }
  const normalised = email.trim().toLowerCase()
  return ACCOUNTS.find((account) => account.email === normalised)
}

export function verifyCredentials(email: string, password: string) {
  return Boolean(findAccount(email)) && password === DEMO_PASSWORD
}

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

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

export const HOME_ROUTE = "/dashboard"
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

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

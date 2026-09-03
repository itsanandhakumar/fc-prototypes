import "server-only"

// The `state` parameter of the OAuth round trip, and the cookie it is checked
// against.
//
// Without it, anyone could send a signed-in user to our callback carrying an
// authorisation code minted for a portal of the attacker's choosing, and we
// would happily store it — the customer would then publish their drafts into a
// stranger's HubSpot. The cookie is the half the attacker cannot forge.

export const OAUTH_STATE_COOKIE = "forward_hubspot_oauth"

/** Long enough to approve an app, short enough that an abandoned attempt does
    not leave a usable cookie lying around. */
export const OAUTH_STATE_MAX_AGE = 10 * 60

export function mintState(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

/** Compares in constant time. The window is small and the value is single-use,
    but a timing oracle on a CSRF token is free to avoid. */
export function stateMatches(a: string | undefined, b: string | undefined) {
  if (!a || !b || a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

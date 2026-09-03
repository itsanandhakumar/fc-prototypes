import "server-only"

// The OAuth half of the HubSpot connector.
//
// Forward used to take a private-app token pasted into a form. That is the
// wrong shape for a product: a private app is created inside one portal by
// someone with admin rights, its token is a long-lived credential handed over
// in plain text, and it cannot be revoked from our side. OAuth moves all three
// — the customer approves Forward from their own portal, we never see a
// password, and either side can cut the connection off.
//
// The trade is that an access token now expires every 30 minutes, so nothing
// may read `connection.accessToken` directly any more. `hubspotAccessToken()`
// in ./token.ts is the only supported way to get one.

/**
 * What Forward asks the customer to grant.
 *
 * `content` is what the blog APIs ask for — posts, authors and tags all sit
 * behind that single scope. `files` is separate and is only needed to upload a
 * featured image into the portal's file manager.
 *
 * Configurable, because this list has to match the app's own `requiredScopes`
 * *exactly* and only the person who created the app knows what they wrote
 * there. A scope requested here but not on the app fails at the consent
 * screen; the reverse fails later, at the call. HubSpot is also part-way
 * through replacing broad scopes with granular ones, so pinning the names in
 * code would make a rename a deploy rather than an edit.
 */
export function hubspotScopes(): string[] {
  const configured = process.env.HUBSPOT_SCOPES?.trim()
  return configured ? configured.split(/[\s,]+/).filter(Boolean) : ["content", "files"]
}

// OAuth v3, not v1. HubSpot released v3 in January 2026 and deprecated v1 the
// same day; v1 keeps working until 16 February 2027. v3 is the same flow with
// two differences that matter here: every sensitive parameter goes in a
// form-encoded body rather than the query string, so credentials stay out of
// access logs and browser history, and errors follow RFC 6749.
//
// Note the host. The token endpoints are on api.hubspot.com; the CMS APIs the
// client calls are on api.hubapi.com. They are not interchangeable.
const AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize"
const TOKEN_URL = "https://api.hubspot.com/oauth/v3/token"
const INTROSPECT_URL = "https://api.hubspot.com/oauth/v3/token/introspect"

/** Refresh this long before the token actually dies, so a request that is
    already in flight when the clock runs out does not fail. */
export const REFRESH_MARGIN_MS = 2 * 60 * 1000

export class HubSpotAuthError extends Error {
  constructor(
    message: string,
    /** True when reconnecting is the fix, which the UI says out loud. */
    readonly reconnect = false
  ) {
    super(message)
    this.name = "HubSpotAuthError"
  }
}

export type HubSpotOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * The app's credentials, and the address HubSpot sends the customer back to.
 *
 * The redirect URI has to match one registered on the app *exactly* — same
 * scheme, host, port and path — which is why it is pinned in the environment
 * rather than assembled from whatever origin the request happened to arrive
 * on. `origin` is only a fallback for local work, where the port moves around
 * and re-registering by hand each time would be tedious.
 */
export function hubspotOAuthConfig(origin?: string): HubSpotOAuthConfig {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim()
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new HubSpotAuthError(
      "HubSpot is not configured on this server. Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET — see ai/guide/hubspot-oauth-setup.md."
    )
  }

  const configured =
    process.env.HUBSPOT_REDIRECT_URI?.trim() ||
    (process.env.AUTH_URL?.trim()
      ? `${process.env.AUTH_URL.trim().replace(/\/+$/, "")}${CALLBACK_PATH}`
      : origin
        ? `${origin.replace(/\/+$/, "")}${CALLBACK_PATH}`
        : "")

  if (!configured) {
    throw new HubSpotAuthError(
      "HubSpot has no redirect URI. Set HUBSPOT_REDIRECT_URI (or AUTH_URL) to this app's own address."
    )
  }

  return { clientId, clientSecret, redirectUri: configured }
}

/** Kept here rather than in the route so the config above can build the
    default redirect URI without importing the route. */
export const CALLBACK_PATH = "/api/connectors/hubspot/callback"

export function authorizeUrl(config: HubSpotOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    // Space-separated, per HubSpot. URLSearchParams encodes the spaces.
    scope: hubspotScopes().join(" "),
    state,
  })

  return `${AUTHORIZE_URL}?${params.toString()}`
}

export type HubSpotTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  /** RFC 6749's shape, which v3 returns. */
  error?: string
  error_description?: string
  /** HubSpot's own field, kept alongside for backward compatibility. */
  message?: string
}

// Both grants post the same form to the same place, so they share a body.
async function postToken(
  body: Record<string, string>
): Promise<HubSpotTokens> {
  let response: Response
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
      cache: "no-store",
    })
  } catch (error) {
    throw new HubSpotAuthError(
      `Could not reach HubSpot to exchange the token${
        error instanceof Error ? ` (${error.message})` : ""
      }.`
    )
  }

  const raw = await response.text()
  let parsed: TokenResponse = {}
  try {
    parsed = JSON.parse(raw) as TokenResponse
  } catch {
    // Left empty; the status and the raw body carry the story.
  }

  if (!response.ok) {
    throw new HubSpotAuthError(
      parsed.error_description ||
        parsed.message ||
        parsed.error ||
        `HubSpot refused the token exchange (${response.status}).`,
      // A dead refresh token is the one case the customer can fix themselves.
      body.grant_type === "refresh_token"
    )
  }

  if (!parsed.access_token || !parsed.refresh_token) {
    throw new HubSpotAuthError(
      "HubSpot returned a token response with no tokens in it."
    )
  }

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    // HubSpot reports 1800 seconds today. Trusting the field rather than the
    // number means a change on their side does not strand us on a stale token.
    expiresAt: new Date(Date.now() + (parsed.expires_in ?? 1800) * 1000),
  }
}

export async function exchangeCode(
  config: HubSpotOAuthConfig,
  code: string
): Promise<HubSpotTokens> {
  return postToken({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  })
}

/**
 * HubSpot's refresh tokens do not rotate — the same one keeps working, and the
 * response hands it back unchanged. That is what makes it safe for two
 * concurrent requests to refresh at once without a lock: the loser of the race
 * simply writes an equally valid pair.
 */
export async function refreshTokens(
  config: HubSpotOAuthConfig,
  refreshToken: string
): Promise<HubSpotTokens> {
  return postToken({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  })
}

export type HubSpotTokenInfo = {
  portalId: number
  hubDomain?: string
  user?: string
  scopes: string[]
}

/**
 * Who the token belongs to. This is what turns "connected" into "connected to
 * Forward Marketing · Portal 24601" in Settings.
 *
 * v3 introspection is a POST authenticated with the app's own credentials,
 * where v1 put the token in the path of a GET. The app has to prove it owns
 * the token before HubSpot will describe it, which is why this needs the
 * config that the rest of the reads do not.
 */
export async function tokenInfo(
  config: HubSpotOAuthConfig,
  token: string
): Promise<HubSpotTokenInfo> {
  let response: Response
  try {
    response = await fetch(INTROSPECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token_type_hint: "access_token",
        // `token`, not `access_token`. HubSpot's own reference for this
        // endpoint names it `access_token`; the API rejects that with a 400
        // listing `client_id, client_secret, token` as the required set.
        token,
      }).toString(),
      cache: "no-store",
    })
  } catch (error) {
    throw new HubSpotAuthError(
      `Could not reach HubSpot to describe the token${
        error instanceof Error ? ` (${error.message})` : ""
      }.`
    )
  }

  if (!response.ok) {
    // HubSpot names the offending parameter in the body, and a bare status
    // here cost an afternoon once. Pass it through.
    const detail = (await response.text()).slice(0, 300)
    throw new HubSpotAuthError(
      `HubSpot would not describe the token (${response.status})${
        detail ? ` — ${detail}` : ""
      }.`,
      true
    )
  }

  const data = (await response.json()) as {
    active?: boolean
    hub_id?: number
    hub_domain?: string
    user?: string
    scopes?: string[]
  }

  // A token HubSpot reports as inactive is one that was revoked between the
  // exchange and this call. Rare, but storing it would leave a connection that
  // looks fine and fails on first use.
  if (data.active === false) {
    throw new HubSpotAuthError(
      "HubSpot reports that token as already inactive. Connect again.",
      true
    )
  }

  return {
    portalId: data.hub_id ?? 0,
    hubDomain: data.hub_domain,
    user: data.user,
    scopes: data.scopes ?? [],
  }
}

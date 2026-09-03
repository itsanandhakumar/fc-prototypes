import "server-only"

import { connectionFor, saveConnection } from "@/lib/connections"
import type { ConnectionRow } from "@/lib/db/schema"
import {
  HubSpotAuthError,
  hubspotOAuthConfig,
  refreshTokens,
  REFRESH_MARGIN_MS,
} from "@/lib/hubspot/oauth"

// The only supported way to get a HubSpot access token.
//
// Reading `connection.accessToken` directly worked when the token was a
// private-app one that never expired. An OAuth token lasts half an hour, so a
// connection made this morning is dead by lunchtime unless something refreshes
// it — and the only moment we can be sure it is about to be used is right
// before a call. So the refresh lives here, on the read path, rather than in a
// cron job that would have to guess.

export type HubSpotSession = {
  token: string
  connection: ConnectionRow
}

export async function hubspotSession(userId: string): Promise<HubSpotSession> {
  const connection = await connectionFor(userId, "hubspot")

  if (!connection) {
    throw new HubSpotAuthError(
      "Connect HubSpot in Settings before publishing.",
      true
    )
  }

  // A row with no refresh token predates OAuth: it holds a pasted private-app
  // token. Rather than quietly keep using a credential the customer can no
  // longer see or revoke from their own portal, we ask them to reconnect once.
  if (!connection.refreshToken) {
    throw new HubSpotAuthError(
      "This HubSpot connection was made with a private-app token. Disconnect and connect again — Forward now signs in to HubSpot directly.",
      true
    )
  }

  const expiresAt = connection.expiresAt?.getTime() ?? 0
  if (expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return { token: connection.accessToken, connection }
  }

  const config = hubspotOAuthConfig()
  const tokens = await refreshTokens(config, connection.refreshToken)

  await saveConnection({
    userId,
    provider: "hubspot",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    // Refreshing changes the credential, not the account or the blog it points
    // at, so everything the customer chose is carried across untouched.
    accountLabel: connection.accountLabel,
    meta: connection.meta,
  })

  return {
    token: tokens.accessToken,
    connection: {
      ...connection,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  }
}

/** When only the token is wanted. */
export async function hubspotAccessToken(userId: string): Promise<string> {
  const { token } = await hubspotSession(userId)
  return token
}

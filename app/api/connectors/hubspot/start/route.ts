import { NextResponse, type NextRequest } from "next/server"

import {
  authorizeUrl,
  HubSpotAuthError,
  hubspotOAuthConfig,
} from "@/lib/hubspot/oauth"
import {
  mintState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "@/lib/hubspot/state"
import { requireUser } from "@/lib/session"

// Step one of connecting: hand the customer to HubSpot.
//
// A route rather than a server action because the browser has to *leave* —
// HubSpot's consent screen is a page on their domain, and an action can only
// return data to a page that stays where it is.

export async function GET(request: NextRequest) {
  await requireUser()

  let url: string
  try {
    const config = hubspotOAuthConfig(request.nextUrl.origin)
    const state = mintState()
    url = authorizeUrl(config, state)

    const response = NextResponse.redirect(url)
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE,
    })
    return response
  } catch (error) {
    // A server with no HubSpot app configured is a deployment mistake, not
    // something the customer did. Saying so beats a redirect to a broken
    // consent screen.
    const message =
      error instanceof HubSpotAuthError
        ? error.message
        : "Could not start the HubSpot connection."
    return NextResponse.redirect(
      new URL(
        `/blogger?settings=connectors&hubspotError=${encodeURIComponent(message)}`,
        request.nextUrl.origin
      )
    )
  }
}

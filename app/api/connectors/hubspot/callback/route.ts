import { NextResponse, type NextRequest } from "next/server"

import { saveConnection } from "@/lib/connections"
import {
  exchangeCode,
  HubSpotAuthError,
  hubspotOAuthConfig,
  tokenInfo,
} from "@/lib/hubspot/oauth"
import { OAUTH_STATE_COOKIE, stateMatches } from "@/lib/hubspot/state"
import { requireUser } from "@/lib/session"

// Step two: HubSpot sends the customer back here with a code.
//
// What is stored at the end of this is a working connection with no blog
// chosen yet. That is a deliberate half-state rather than an oversight — the
// blog, the language and the default author can only be listed once there is a
// token to list them with, so the choice belongs on the far side of the round
// trip. Settings reads a connection with no `blogId` as "finish setting this
// up", which is also what makes the flow survive a closed tab: the grant is
// already saved, so coming back later resumes rather than restarts.

function back(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/blogger", request.nextUrl.origin)
  url.searchParams.set("settings", "connectors")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = NextResponse.redirect(url)
  // Single use, whether it worked or not.
  response.cookies.delete(OAUTH_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const user = await requireUser()
  const params = request.nextUrl.searchParams

  // The customer pressed Cancel, or HubSpot refused. Either way this is a
  // normal outcome, not an error to shout about.
  const denied = params.get("error")
  if (denied) {
    return back(request, {
      hubspotError:
        params.get("error_description") ||
        "HubSpot did not grant access. Nothing was connected.",
    })
  }

  const code = params.get("code")
  if (!code) {
    return back(request, {
      hubspotError: "HubSpot sent no authorisation code back.",
    })
  }

  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!stateMatches(params.get("state") ?? undefined, expected)) {
    return back(request, {
      hubspotError:
        "That connection attempt could not be verified. Start again from Settings.",
    })
  }

  try {
    const config = hubspotOAuthConfig(request.nextUrl.origin)
    const tokens = await exchangeCode(config, code)
    const info = await tokenInfo(config, tokens.accessToken)

    await saveConnection({
      userId: user.id,
      provider: "hubspot",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      // Named for the portal for now. The blog's name is added to the label
      // once one has been chosen, because that is the part the writer thinks
      // in — "PAL Blog", not "Portal 24601".
      accountLabel: info.hubDomain
        ? `${info.hubDomain} · Portal ${info.portalId}`
        : `Portal ${info.portalId}`,
      meta: {
        portalId: info.portalId,
        hubDomain: info.hubDomain,
        scopes: info.scopes,
      },
    })
  } catch (error) {
    return back(request, {
      hubspotError:
        error instanceof HubSpotAuthError
          ? error.message
          : "Could not finish connecting to HubSpot.",
    })
  }

  return back(request, { hubspot: "choose" })
}

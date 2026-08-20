import { NextResponse, type NextRequest } from "next/server"

import { HOME_ROUTE, LOGIN_ROUTE, SESSION_COOKIES } from "@/lib/auth"

// Nothing is reachable before login: any route other than the login screen
// redirects back to it without a session.
//
// This only checks that a session cookie is *present*. It is a routing hint,
// not the security boundary — the cookie is signed, but verifying it needs the
// auth secret and a database round trip, neither of which belongs in the proxy.
// Every page and action calls `requireUser()`, which does the real check.
export function proxy(request: NextRequest) {
  const isLoggedIn = SESSION_COOKIES.some((name) =>
    Boolean(request.cookies.get(name)?.value)
  )
  const isLoginRoute = request.nextUrl.pathname === LOGIN_ROUTE

  if (!isLoggedIn && !isLoginRoute) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
  }

  if (isLoggedIn && isLoginRoute) {
    return NextResponse.redirect(new URL(HOME_ROUTE, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // `/api/auth` has to stay open — it is what issues the session in the first
  // place, so redirecting it would make signing in impossible.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|logo.svg).*)"],
}

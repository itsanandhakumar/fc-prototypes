import { NextResponse, type NextRequest } from "next/server"

import { HOME_ROUTE, LOGIN_ROUTE, SESSION_COOKIE } from "@/lib/auth"

// Nothing is reachable before login: any route other than the login screen
// redirects back to it without a session.
export function proxy(request: NextRequest) {
  const isLoggedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg).*)"],
}

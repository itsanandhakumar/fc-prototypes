"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  SESSION_COOKIE,
  verifyCredentials,
} from "@/lib/auth"

export type LoginState = { error: string | null }

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)

  redirect(LOGIN_ROUTE)
}

async function startSession(email: string) {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function loginWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!verifyCredentials(email, password)) {
    return { error: "That email and password don't match an account." }
  }

  await startSession(email.trim().toLowerCase())
  redirect(HOME_ROUTE)
}

export async function loginWithGoogle() {
  // Placeholder for the real OAuth handshake.
  await startSession("demo@forward.tools")
  redirect(HOME_ROUTE)
}

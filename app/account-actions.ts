"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { findAccount, SESSION_COOKIE } from "@/lib/auth"

// Switching account just repoints the session at another signed-in account.
export async function switchAccount(email: string) {
  const account = findAccount(email)
  if (!account) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, account.email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })

  revalidatePath("/dashboard")
}

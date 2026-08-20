"use server"

import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"
import { AuthError } from "next-auth"

import { signIn, signOut } from "@/auth"
import { HOME_ROUTE, LOGIN_ROUTE, validateCredentials } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export type LoginState = { error: string | null }

export async function logout() {
  await signOut({ redirectTo: LOGIN_ROUTE })
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: HOME_ROUTE })
}

export async function loginWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  try {
    await signIn("credentials", { email, password, redirectTo: HOME_ROUTE })
  } catch (error) {
    // A successful sign-in ends in a redirect, which Next signals by throwing.
    // Only a real auth failure is ours to report — anything else, including
    // that redirect, has to keep travelling.
    if (error instanceof AuthError) {
      return { error: "That email and password don't match an account." }
    }
    throw error
  }

  return { error: null }
}

export async function registerWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  const invalid = validateCredentials(email, password)
  if (invalid) {
    return { error: invalid }
  }

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    // The address is already known. If it arrived through Google it has no
    // password yet, so setting one here links the two ways in rather than
    // refusing an account the person demonstrably owns.
    if (existing.passwordHash) {
      return { error: "An account with that email already exists. Log in instead." }
    }

    await db
      .update(users)
      .set({ passwordHash: await hash(password, 12), name: name || undefined })
      .where(eq(users.id, existing.id))
  } else {
    await db.insert(users).values({
      email,
      name: name || null,
      passwordHash: await hash(password, 12),
    })
  }

  try {
    await signIn("credentials", { email, password, redirectTo: HOME_ROUTE })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." }
    }
    throw error
  }

  return { error: null }
}

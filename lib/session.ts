import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { LOGIN_ROUTE } from "@/lib/auth"

export type SessionUser = {
  id: string
  email: string
  name: string | null
  image: string | null
}

/** The signed-in user, or null. Use this where a signed-out visitor is a normal
    state rather than an error. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  }
}

// The real access check. The proxy only looks for a cookie, so this is what
// actually verifies the session — every page and every action that touches a
// post goes through it, which is also where `userId` comes from for scoping
// queries.
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser()
  if (!user) {
    redirect(LOGIN_ROUTE)
  }
  return user
}

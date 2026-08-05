"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { BODY_VIEW_COOKIE, type BodyView } from "@/lib/preferences"

export async function setDefaultBodyView(view: BodyView) {
  const cookieStore = await cookies()

  cookieStore.set(BODY_VIEW_COOKIE, view, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath("/editor")
}

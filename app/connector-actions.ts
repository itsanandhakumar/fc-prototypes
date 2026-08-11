"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  CONNECTORS_COOKIE,
  findBlogDestination,
  findPlatform,
  HUBSPOT,
  parseConnectedIds,
} from "@/lib/connectors"
import type { DraftBrief } from "@/lib/draft-generator"
import { publishPost } from "@/lib/post-store"

async function writeConnected(ids: string[]) {
  const cookieStore = await cookies()

  cookieStore.set(CONNECTORS_COOKIE, ids.join(","), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
}

async function readConnected() {
  const cookieStore = await cookies()
  return parseConnectedIds(cookieStore.get(CONNECTORS_COOKIE)?.value)
}

// Connecting is mocked: there is no OAuth handshake to run yet. Takes either
// kind of id — the account's connections are one list to the person holding it.
export async function connectPlatform(platformId: string) {
  if (!findPlatform(platformId) && !findBlogDestination(platformId)) {
    return
  }

  const connected = await readConnected()
  await writeConnected([...new Set([...connected, platformId])])

  revalidatePath("/dashboard")
  revalidatePath("/editor")
}

export async function disconnectPlatform(platformId: string) {
  const connected = await readConnected()
  await writeConnected(connected.filter((id) => id !== platformId))

  revalidatePath("/dashboard")
  revalidatePath("/editor")
}

// Publishing pushes the post to the connected HubSpot blog. Mocked like the
// connection itself: nothing leaves the prototype.
export async function publishToHubSpot(input: {
  postId?: string
  title: string
  body: string
  /** Kept with the post, so a draft published without ever being saved still
      carries the brief it was written from. */
  brief?: DraftBrief
}) {
  const connected = await readConnected()

  if (!connected.includes(HUBSPOT.id)) {
    return
  }

  const published = publishPost({
    id: input.postId || undefined,
    title: input.title,
    body: input.body,
    brief: input.brief,
  })

  revalidatePath("/dashboard")
  redirect(`/dashboard?posted=${encodeURIComponent(published.id)}`)
}

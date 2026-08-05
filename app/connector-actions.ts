"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  CONNECTORS_COOKIE,
  findPlatform,
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

// Connecting is mocked: there is no OAuth handshake to run yet.
export async function connectPlatform(platformId: string) {
  if (!findPlatform(platformId)) {
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

// Posting commits the blog itself as published and records where it went.
export async function postToPlatforms(input: {
  postId?: string
  title: string
  body: string
  platformIds: string[]
  /** Kept with the post, so a draft posted without ever being saved still
      carries the brief it was written from. */
  brief?: DraftBrief
}) {
  const connected = await readConnected()
  const platforms = input.platformIds.filter((id) => connected.includes(id))

  if (!platforms.length) {
    return
  }

  const published = publishPost({
    id: input.postId || undefined,
    title: input.title,
    body: input.body,
    platforms,
    brief: input.brief,
  })

  revalidatePath("/dashboard")
  redirect(`/dashboard?posted=${encodeURIComponent(published.id)}`)
}

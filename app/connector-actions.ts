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
import type { StoredInsights } from "@/lib/db/schema"
import type { DraftBrief } from "@/lib/draft-generator"
import { savePost } from "@/lib/post-store"
import { requireUser } from "@/lib/session"

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

  revalidatePath("/blogger")
  revalidatePath("/editor")
  // Social Studio asks the same question of the same cookie: the workspace will
  // not post to a network the account is not signed in to, so connecting from
  // the publish dialog has to reach the page holding that answer.
  revalidatePath("/socials/editor")
}

export async function disconnectPlatform(platformId: string) {
  const connected = await readConnected()
  await writeConnected(connected.filter((id) => id !== platformId))

  revalidatePath("/blogger")
  revalidatePath("/editor")
  // Social Studio asks the same question of the same cookie: the workspace will
  // not post to a network the account is not signed in to, so connecting from
  // the publish dialog has to reach the page holding that answer.
  revalidatePath("/socials/editor")
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
  /** The panel's cached analysis, kept alongside it for the same reason. */
  insights?: StoredInsights
}) {
  const user = await requireUser()
  const connected = await readConnected()

  if (!connected.includes(HUBSPOT.id)) {
    return
  }

  // Nothing is sent to HubSpot yet — there is no portal token and no API call.
  // What this does do is real: the post is committed to the database as
  // Published, owned by this user, so the state the app reports afterwards is
  // the state it is actually in.
  const published = await savePost({
    userId: user.id,
    id: input.postId || undefined,
    title: input.title,
    body: input.body,
    status: "Published",
    brief: input.brief
      ? {
          brief: input.brief.brief,
          keywords: input.brief.keywords,
          targetCharacters: input.brief.targetCharacters,
        }
      : undefined,
    insights: input.insights,
  })

  revalidatePath("/blogger")
  redirect(`/blogger?posted=${encodeURIComponent(published.id)}`)
}

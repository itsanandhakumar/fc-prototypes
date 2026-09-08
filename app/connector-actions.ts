"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { BLOG_LANGUAGE_COOKIE, findBlogLanguage } from "@/lib/blog-language"
import {
  CONNECTORS_COOKIE,
  findBlogDestination,
  findPlatform,
  HUBSPOT,
  parseConnectedIds,
} from "@/lib/connectors"
import type { PublishSettings } from "@/lib/blog-publish"
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

async function writeBlogLanguage(code: string) {
  const cookieStore = await cookies()

  cookieStore.set(BLOG_LANGUAGE_COOKIE, code, {
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

/**
 * Connecting a blog for the first time, which is the one moment the blog's
 * language is asked for. Both halves are written together because a connected
 * blog with no language would leave the account in the state this question
 * exists to prevent, and the language is deliberately not rewritten on a later
 * reconnect — the person was only ever asked once.
 */
export async function connectBlogDestination(
  destinationId: string,
  languageCode: string
) {
  if (!findBlogDestination(destinationId) || !findBlogLanguage(languageCode)) {
    return
  }

  await writeBlogLanguage(languageCode)
  await connectPlatform(destinationId)
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
  /** What the publish dialog was settled on. Kept for the same reason: the
      next publish of this post should open on these answers. */
  publish?: PublishSettings
}) {
  const connected = await readConnected()

  if (!connected.includes(HUBSPOT.id)) {
    return
  }

  const published = publishPost({
    id: input.postId || undefined,
    // The dialog's title is the one that goes out: it opens on the editor's
    // and the writer may have corrected it on the way past.
    title: input.publish?.title || input.title,
    body: input.body,
    brief: input.brief,
    publish: input.publish,
  })

  revalidatePath("/blogger")
  redirect(`/blogger?posted=${encodeURIComponent(published.id)}`)
}

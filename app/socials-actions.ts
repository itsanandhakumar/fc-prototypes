"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { CONNECTORS_COOKIE, parseConnectedIds } from "@/lib/connectors"
import type { SocialVariant } from "@/lib/social-data"
import {
  publishPost,
  retrySocialPost,
  saveDraft,
  schedulePost,
} from "@/lib/social-store"

type Write = {
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
}

export async function retryPost(id: string) {
  retrySocialPost(id)

  // The summary strip is derived from the same list, so it moves with it.
  revalidatePath("/socials")
}

export async function saveSocialDraft({ id, name, variants }: Write) {
  const saved = saveDraft({ id, name, variants })

  revalidatePath("/socials")

  return saved.id
}

/** Queued rather than sent. The workspace has already turned the day and time
    into an offset — see lib/social-schedule.ts — because it is the side holding
    the one `now` both ends agreed on. */
export async function scheduleSocialPost({
  id,
  name,
  variants,
  minutesAhead,
}: Write & { minutesAhead: number }) {
  const saved = schedulePost({ id, name, variants, minutesAhead })

  revalidatePath("/socials")

  return saved.id
}

/**
 * Out, now.
 *
 * The connection is checked here as well as in the dialog, the way
 * `publishToHubSpot` does: the dialog will not offer a platform the account is
 * not signed in to, but publishing is the irreversible one, and a guard that
 * only exists in the button is not a guard.
 */
export async function publishSocialPost({ id, name, variants }: Write) {
  const cookieStore = await cookies()
  const connected = parseConnectedIds(cookieStore.get(CONNECTORS_COOKIE)?.value)

  const sent = variants.filter((variant) =>
    connected.includes(variant.platformId)
  )
  if (!sent.length) {
    return undefined
  }

  const saved = publishPost({ id, name, variants: sent })

  revalidatePath("/socials")

  return saved.id
}

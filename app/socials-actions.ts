"use server"

import { revalidatePath } from "next/cache"

import { connectedProviders } from "@/lib/connections"
import type { SocialVariant } from "@/lib/social-data"
import {
  publishPost,
  retrySocialPost,
  saveDraft,
  schedulePost,
} from "@/lib/social-store"
import { requireUser } from "@/lib/session"

type Write = {
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
  sourcePostId?: string
}

export async function retryPost(id: string) {
  const user = await requireUser()
  await retrySocialPost(user.id, id)

  // The summary strip is derived from the same list, so it moves with it.
  revalidatePath("/socials")
}

export async function saveSocialDraft({
  id,
  name,
  variants,
  sourcePostId,
}: Write) {
  const user = await requireUser()
  const saved = await saveDraft({
    userId: user.id,
    id,
    name,
    variants,
    sourcePostId,
  })

  revalidatePath("/socials")
  return saved.id
}

/**
 * Queued rather than sent.
 *
 * The workspace hands over an offset because it is the side holding the one
 * `now` both ends agreed on — see `lib/social-schedule.ts`. It becomes a real
 * instant here, which is what the store keeps and what a scheduler can query.
 */
export async function scheduleSocialPost({
  id,
  name,
  variants,
  sourcePostId,
  minutesAhead,
}: Write & { minutesAhead: number }) {
  const user = await requireUser()

  const at = new Date(Date.now() + Math.max(0, minutesAhead) * 60_000)
  const saved = await schedulePost({
    userId: user.id,
    id,
    name,
    variants,
    sourcePostId,
    at,
  })

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
 *
 * Nothing is sent to LinkedIn or X yet — neither has credentials. The post is
 * recorded as Published so the workspace reflects the writer's intent, and the
 * variants carry no permalink, which is what will distinguish these from posts
 * that really went once sending exists.
 */
export async function publishSocialPost({
  id,
  name,
  variants,
  sourcePostId,
}: Write) {
  const user = await requireUser()
  const connected = await connectedProviders(user.id)

  const sent = variants.filter((variant) =>
    connected.includes(variant.platformId)
  )
  if (!sent.length) {
    return undefined
  }

  const saved = await publishPost({
    userId: user.id,
    id,
    name,
    variants: sent,
    sourcePostId,
  })

  revalidatePath("/socials")
  return saved.id
}

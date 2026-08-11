"use server"

import { revalidatePath } from "next/cache"

import type { SocialVariant } from "@/lib/social-data"
import { retrySocialPost, saveDraft } from "@/lib/social-store"

export async function retryPost(id: string) {
  retrySocialPost(id)

  // The summary strip is derived from the same list, so it moves with it.
  revalidatePath("/socials")
}

export async function saveSocialDraft({
  id,
  name,
  variants,
}: {
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
}) {
  const saved = saveDraft({ id, name, variants })

  revalidatePath("/socials")

  return saved.id
}

"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  generateBody,
  parseKeywords,
  parseTargetCharacters,
  type DraftBrief,
} from "@/lib/draft-generator"
import { deleteDraft, saveDraft } from "@/lib/post-store"

// The brief travels to the editor on the URL; the draft is generated there and
// only enters the store once the writer saves it.
export async function generateFromPrompt(formData: FormData) {
  const params = new URLSearchParams()

  // Either of these can carry the draft; keeping empties out of the URL means
  // the editor can tell which one the writer actually gave.
  const prompt = String(formData.get("prompt") ?? "").trim()
  if (prompt) {
    params.set("prompt", prompt)
  }

  const title = String(formData.get("title") ?? "").trim()
  if (title) {
    params.set("title", title)
  }

  const keywords = String(formData.get("keywords") ?? "").trim()
  if (keywords) {
    params.set("keywords", keywords)
  }

  params.set("chars", String(formData.get("chars") ?? "800"))

  redirect(`/editor?${params.toString()}`)
}

// Picking an alternate title creates a *separate* post and opens it. Whatever
// was being edited is left exactly as it was, unless the writer asked for the
// draft they were on to be replaced — `deleteDraft` refuses to touch anything
// published, so only a draft can ever be swapped out this way.
export async function createPostFromTitle(
  title: string,
  replaceDraftId?: string
) {
  if (replaceDraftId) {
    deleteDraft(replaceDraftId)
  }

  const brief: DraftBrief = {
    brief: title,
    title,
    keywords: [],
    targetCharacters: 4800,
    target: "both",
  }

  const created = saveDraft({
    title,
    body: generateBody(brief),
    brief,
  })

  revalidatePath("/dashboard")
  redirect(`/editor?post=${encodeURIComponent(created.id)}`)
}

export async function savePostAsDraft(formData: FormData) {
  const title = String(formData.get("title") ?? "")

  const saved = saveDraft({
    id: String(formData.get("postId") ?? "") || undefined,
    title,
    body: String(formData.get("body") ?? ""),
    // Kept with the post so the editor can still say how it was made.
    brief: {
      brief: String(formData.get("brief") ?? "") || title,
      title,
      keywords: parseKeywords(String(formData.get("keywords") ?? "")),
      targetCharacters: parseTargetCharacters(
        String(formData.get("chars") ?? "")
      ),
      target: "both",
    },
  })

  revalidatePath("/dashboard")
  // Saving hands the writer back to the list, with the draft they just saved
  // called out at the top of it.
  redirect(`/dashboard?saved=${encodeURIComponent(saved.id)}`)
}

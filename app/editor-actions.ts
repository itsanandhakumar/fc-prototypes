"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { PostStatus } from "@/lib/blog-data"
import type { StoredInsights } from "@/lib/db/schema"
import { parseKeywords, parseTargetCharacters } from "@/lib/draft-generator"
import { deleteDraft, savePost } from "@/lib/post-store"
import { requireUser } from "@/lib/session"

// The brief travels to the editor on the URL; the draft is written there, by
// the streaming generate endpoint, and only enters the database once the writer
// saves it. Nothing is stored on the way through.
export async function generateFromPrompt(formData: FormData) {
  await requireUser()

  const params = new URLSearchParams()

  const prompt = String(formData.get("prompt") ?? "").trim()
  if (prompt) {
    params.set("prompt", prompt)
  }

  const keywords = String(formData.get("keywords") ?? "").trim()
  if (keywords) {
    params.set("keywords", keywords)
  }

  params.set("chars", String(formData.get("chars") ?? "800"))

  redirect(`/editor?${params.toString()}`)
}

// Picking a suggested post idea starts a *separate* post and opens it. Whatever
// was being edited is left exactly as it was, unless the writer asked for the
// draft they were on to be replaced — `deleteDraft` refuses to touch anything
// published, so only a draft can ever be swapped out this way.
//
// The new post is not written here: the editor opens with the title on the URL
// and generates through the same streaming path as any other draft, so the
// writer watches it being written instead of waiting on a blank screen.
export async function createPostFromTitle(
  title: string,
  replaceDraftId?: string
) {
  const user = await requireUser()

  if (replaceDraftId) {
    await deleteDraft(user.id, replaceDraftId)
    revalidatePath("/blogger")
  }

  redirect(`/editor?title=${encodeURIComponent(title)}`)
}

function readInsights(formData: FormData): StoredInsights | undefined {
  const raw = String(formData.get("insights") ?? "")
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw) as StoredInsights
  } catch {
    // A save must not fail because the panel's cached analysis was malformed —
    // the post is the thing worth keeping.
    return undefined
  }
}

async function save(formData: FormData, status: PostStatus) {
  const user = await requireUser()

  const title = String(formData.get("title") ?? "").trim() || "Untitled post"

  const saved = await savePost({
    userId: user.id,
    id: String(formData.get("postId") ?? "") || undefined,
    title,
    body: String(formData.get("body") ?? ""),
    status,
    // Kept with the post so the editor can still say how it was made, and so
    // Regenerate honours the instructions the draft came from.
    brief: {
      brief: String(formData.get("brief") ?? "") || title,
      keywords: parseKeywords(String(formData.get("keywords") ?? "")),
      targetCharacters: parseTargetCharacters(
        String(formData.get("chars") ?? "")
      ),
    },
    insights: readInsights(formData),
  })

  revalidatePath("/blogger")
  // Saving hands the writer back to the list, with the post they just saved
  // called out at the top of it.
  redirect(`/blogger?saved=${encodeURIComponent(saved.id)}`)
}

export async function savePostAsDraft(formData: FormData) {
  await save(formData, "Draft")
}

// There is no publish action here. Publishing goes to the connected blog and is
// a confirmation rather than a form submit, so it lives in `PublishDialog` and
// `publishToHubSpot` — which is also what writes the post as Published.

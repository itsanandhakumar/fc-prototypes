import {
  socialPosts,
  type SocialPost,
  type SocialVariant,
} from "@/lib/social-data"

// Prototype storage: in memory, seeded from the mock posts. Mirrors
// lib/post-store.ts, and resets the same way when the dev server restarts.

let posts: SocialPost[] = [...socialPosts]

export function getSocialPosts(): SocialPost[] {
  return posts
}

export function getSocialPost(id: string | undefined): SocialPost | undefined {
  if (!id) {
    return undefined
  }
  return posts.find((post) => post.id === id)
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  return slug || "untitled-post"
}

function uniqueId(name: string): string {
  const base = slugify(name)
  let id = base
  let suffix = 2
  while (posts.some((post) => post.id === id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

/** Saving upserts and moves the post to the head of the list, the way
    lib/post-store.ts does. */
export function saveDraft({
  id,
  name,
  variants,
}: {
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
}): SocialPost {
  const existing = getSocialPost(id)

  const saved: SocialPost = {
    id: existing?.id ?? uniqueId(name),
    name,
    status: "Draft",
    updatedMinutesAgo: 0,
    // A draft has been nowhere, so it carries no figures.
    variants: variants.map((variant) => ({ ...variant })),
  }

  posts = [saved, ...posts.filter((post) => post.id !== saved.id)]

  return saved
}

/**
 * Sends a rejected post again. Nothing is really sent, so the retry always
 * works — the point is that a failure is recoverable rather than a dead end.
 *
 * It comes back with no metrics, which is correct rather than a gap: a post
 * that went out a moment ago has not been seen by anyone yet. So it lifts the
 * published count and today's bar on the streak, and leaves impressions alone
 * until it has earned some.
 */
export function retrySocialPost(id: string): SocialPost | undefined {
  const existing = getSocialPost(id)
  if (!existing || existing.status !== "Failed") {
    return undefined
  }

  const recovered: SocialPost = {
    ...existing,
    status: "Published",
    updatedMinutesAgo: 0,
    variants: existing.variants.map((variant) => ({
      ...variant,
      failure: undefined,
    })),
  }

  posts = posts.map((post) => (post.id === id ? recovered : post))

  return recovered
}

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

/** What every write to the store has in common: the post, its copy, and where
    it goes. What differs is the state it lands in, which is the argument. */
type Write = {
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
}

/** Upserts and moves the post to the head of the list, the way
    lib/post-store.ts does. */
function upsert(
  { id, name, variants }: Write,
  state: Pick<SocialPost, "status" | "scheduledInMinutes"> & {
    /** Why a platform turned it down, by platform id. */
    failures?: Record<string, string>
  }
): SocialPost {
  const existing = getSocialPost(id)

  const saved: SocialPost = {
    id: existing?.id ?? uniqueId(name),
    name,
    status: state.status,
    updatedMinutesAgo: 0,
    scheduledInMinutes: state.scheduledInMinutes,
    variants: variants.map((variant) => ({
      ...variant,
      // Figures belong to a post that has been seen, and none of these have
      // been: a post published a moment ago has no engagement yet, and one
      // rewritten since it was published is not the post those numbers were
      // measuring. Both come back empty and earn their numbers again.
      failure: state.failures?.[variant.platformId],
    })),
  }

  posts = [saved, ...posts.filter((post) => post.id !== saved.id)]

  return saved
}

/**
 * Saving always stores a draft.
 *
 * That includes a post that was scheduled: taking it back to a draft takes it
 * out of the queue, which is the only sense "save" can have for something with
 * a departure time on it. It is also the way to call one off, and the composer
 * says so where the button is.
 */
export function saveDraft(write: Write): SocialPost {
  return upsert(write, { status: "Draft" })
}

/** Queued, to go out in `minutesAhead`. The store keeps the offset rather than
    a date for the reason everything else here does — see lib/time.ts — and the
    picker does the conversion in lib/social-schedule.ts. */
export function schedulePost(
  write: Write & { minutesAhead: number }
): SocialPost {
  return upsert(write, {
    status: "Scheduled",
    scheduledInMinutes: Math.max(0, Math.round(write.minutesAhead)),
  })
}

/**
 * Out, on every platform that took it.
 *
 * Each network answers for itself, so the outcome is per platform rather than
 * per post: a post is Failed if any variant was turned down — the one thing
 * that needs attention is the thing the status should name — and Published
 * only when all of them went.
 */
export function publishPost(
  write: Write & { failures?: Record<string, string> }
): SocialPost {
  const rejected = write.variants.some(
    (variant) => write.failures?.[variant.platformId]
  )

  return upsert(write, {
    status: rejected ? "Failed" : "Published",
    failures: write.failures,
  })
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

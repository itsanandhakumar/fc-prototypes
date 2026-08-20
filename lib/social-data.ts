// The shape a social post takes once it has left the database and is on its
// way to the UI.
//
// `updatedMinutesAgo` and `scheduledInMinutes` are offsets computed once on the
// server from real timestamps — the same trick `lib/blog-data.ts` uses, and for
// the same reason: a client component computing "3h ago" reads the browser's
// clock, which is never quite the server's, so the two render passes disagree
// and React throws.

export type SocialStatus = "Draft" | "Scheduled" | "Published" | "Failed"

export type VariantMetrics = {
  impressions: number
  likes: number
  comments: number
  reposts: number
}

/** One platform's copy. The variant is the unit that gets posted, so the
    numbers hang off it rather than off the post: the summary can add them up
    for a sense of volume, but only the per-platform figures are a like-for-like
    measurement — each network counts an impression its own way. */
export type SocialVariant = {
  platformId: string
  text: string
  /** Published only. */
  metrics?: VariantMetrics
  /** Why this platform rejected it. One variant can fail while its siblings
      go out fine, which is why this sits here rather than on the post. */
  failure?: string
}

export type SocialPost = {
  id: string
  /** An internal label. Never posted — X has no title field. */
  name: string
  status: SocialStatus
  updatedMinutesAgo: number
  /** Scheduled only. Counts forward the way updatedMinutesAgo counts back. */
  scheduledInMinutes?: number
  variants: SocialVariant[]
}

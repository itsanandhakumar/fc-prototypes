// The social platforms Forward will eventually post to.
//
// Connecting an account is deliberately not built. The publishing workflow was
// deferred to the Studio product — it needs domain hosting, featured images and
// per-platform rewriting, none of which belongs in the blog writer. What stays
// is the list itself, shown disabled in Settings, so the roadmap is visible
// without implying the feature is one click away.
//
// The character limits are the platforms' real ones, which is why they are worth
// keeping: they are what Studio will compose against.

export type Platform = {
  id: string
  name: string
  characterLimit: number
}

export const PLATFORMS: Platform[] = [
  { id: "linkedin", name: "LinkedIn", characterLimit: 3000 },
  { id: "x", name: "X", characterLimit: 280 },
  { id: "bluesky", name: "Bluesky", characterLimit: 300 },
  { id: "threads", name: "Threads", characterLimit: 500 },
  { id: "mastodon", name: "Mastodon", characterLimit: 500 },
]

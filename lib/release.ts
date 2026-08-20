// What this deployment ships.
//
// The 20 Aug call asked for the blog writer to go public on its own, with
// Socials and the connectors visible but inert. That could have been a second
// branch, but two branches of the same app drift: every fix lands twice, and
// the one nobody is looking at rots. So it is one branch and one environment
// variable, and "the release build" is a deploy setting rather than a place in
// git.
//
// `blogger` — the public release. Blog writing and Copy. Socials and publishing
//   are shown as coming soon rather than hidden, because a product with one
//   visible feature reads as finished, and this one is not.
// `full` — everything, for development and for the internal build.

export type ReleaseMode = "blogger" | "full"

export const RELEASE_MODE: ReleaseMode =
  process.env.NEXT_PUBLIC_RELEASE_MODE === "blogger" ? "blogger" : "full"

/** Social Studio: the whole section. */
export const SOCIALS_ENABLED = RELEASE_MODE === "full"

/** Publishing a blog post to a connected CMS. Off in the public release — the
    first version copies to the clipboard and stops there. */
export const BLOG_PUBLISHING_ENABLED = RELEASE_MODE === "full"

/** Anything to connect at all. Both connector kinds are gated, so in the
    public release the Settings tab has nothing to show. */
export const CONNECTORS_ENABLED = SOCIALS_ENABLED || BLOG_PUBLISHING_ENABLED

/** Shown against a feature that is visible but inert. */
export const COMING_SOON = "Coming soon"

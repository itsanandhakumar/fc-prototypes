// What this deployment ships.
//
// This is the `mvp-live` branch: the public release agreed on the 20 Aug call.
// The blog writer on its own — which, since the HubSpot connector went live,
// means the blog writer publishing to a real blog. Socials stays inert.
//
// The difference between this branch and `feat/functional-mvp` is meant to stay
// exactly one line — the default below. Everything else is written once, on
// both branches, behind these flags. Two branches of the same app drift: every
// fix lands twice and the one nobody is looking at rots, so the less that
// differs, the less there is to rot.
//
// Merging trunk into this branch should therefore never conflict outside this
// file. If it does, a feature was gated by deleting it instead of by asking a
// flag — put it back and add the flag.
//
// `blogger` — the public release. The blog writer, publishing to a connected
//   HubSpot blog. Socials is shown as coming soon rather than hidden, because a
//   product with one visible feature reads as finished, and this one is not.
// `full` — everything, for development and for the internal build.

export type ReleaseMode = "blogger" | "full"

// Inverted from trunk: this branch ships the public release, so `blogger` is
// what you get unless the environment overrides it. The override is kept so a
// developer on this branch can still see the whole app.
export const RELEASE_MODE: ReleaseMode =
  process.env.NEXT_PUBLIC_RELEASE_MODE === "full" ? "full" : "blogger"

/** Social Studio: the whole section. */
export const SOCIALS_ENABLED = RELEASE_MODE === "full"

/**
 * Publishing a blog post to a connected CMS.
 *
 * This used to follow the mode, off in the public release, because in August
 * there was nowhere to publish to and "Publish" could only mean Copy Markdown.
 * The HubSpot connector is real now, so it no longer rides along with Socials:
 * the blogger-only release IS the blog writer publishing to a live blog.
 *
 * The switch stays, because a deployment with no HubSpot app configured still
 * needs an honest answer — `off` falls back to Copy Markdown rather than
 * offering a button that reaches a "HubSpot is not configured" error.
 */
export const BLOG_PUBLISHING_ENABLED =
  process.env.NEXT_PUBLIC_BLOG_PUBLISHING !== "off"

/** Anything to connect at all. Publishing needs Settings → Connectors to be
    reachable — a live blog the customer cannot connect is not a feature. */
export const CONNECTORS_ENABLED = SOCIALS_ENABLED || BLOG_PUBLISHING_ENABLED

/** Shown against a feature that is visible but inert. */
export const COMING_SOON = "Coming soon"

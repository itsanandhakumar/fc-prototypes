// What this deployment ships.
//
// The 20 Aug call asked for the blog writer to go public on its own, with
// Socials and the connectors visible but inert. That could have been a second
// branch, but two branches of the same app drift: every fix lands twice, and
// the one nobody is looking at rots. So it is one branch and one environment
// variable, and "the release build" is a deploy setting rather than a place in
// git.
//
// `blogger` — the public release. The blog writer, publishing to a connected
//   HubSpot blog. Socials is shown as coming soon rather than hidden, because a
//   product with one visible feature reads as finished, and this one is not.
// `full` — everything, for development and for the internal build.

export type ReleaseMode = "blogger" | "full"

export const RELEASE_MODE: ReleaseMode =
  process.env.NEXT_PUBLIC_RELEASE_MODE === "blogger" ? "blogger" : "full"

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

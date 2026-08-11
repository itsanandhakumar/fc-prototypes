// Fitting text to a platform's limit. This file used to also turn a blog draft
// into a first pass at a social post, for the composer the blog editor carried.
// Blogger publishes to HubSpot now and composes nothing, so that went with it —
// writing a post about a post is Social Studio's job.

// Used by the Socials seed and composer, which shape native posts to each
// platform's limit.
export function trimTo(text: string, limit: number): string {
  if (text.length <= limit) {
    return text
  }
  const cut = text.slice(0, limit - 1)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

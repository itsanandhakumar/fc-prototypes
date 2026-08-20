// Fitting text to a platform's limit. This file used to also turn a blog draft
// into a first pass at a social post, for the composer the blog editor carried.
// Blogger publishes to HubSpot now and composes nothing, so that went with it —
// writing a post about a post is Social Studio's job, and lib/social-generator.ts
// does it there.

import type { Platform } from "@/lib/connectors"

// Used by the Socials seed and composer, which shape native posts to each
// platform's limit.
export function trimTo(text: string, limit: number): string {
  if (text.length <= limit) {
    return text
  }
  const cut = text.slice(0, limit - 1)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

/**
 * One draft cut to one platform. Short platforms take the opening thought; long
 * ones carry the whole argument.
 *
 * It lives here rather than in the composer because the deck and the workspace
 * are separate pages now, and both have to arrive at the same words from the
 * same brief — a second copy of this would be a second answer.
 */
export function shapeFor(platform: Platform, master: string): string {
  const paragraphs = master.split(/\n\s*\n/).filter(Boolean)
  const source =
    platform.characterLimit < 600 ? (paragraphs[0] ?? master) : master
  return trimTo(source, platform.characterLimit)
}

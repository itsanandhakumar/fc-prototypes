// Writes a first draft of a social post from a one-line brief. Deterministic,
// no model — the same architecture as lib/draft-generator.ts, but that file's
// corpus is blog-article prose with markdown headings, which is nonsense at
// 280 characters. This one writes the way a person posts.

import { subjectOf, topicFromTitle } from "@/lib/draft-generator"

export type SocialBrief = {
  brief: string
  /** Which platforms it is being written for. Kept with the post so a rewrite
      can honour the same instructions. */
  platformIds: string[]
}

/** Angles a short post can take. Each returns a whole post, so switching
    variant rewrites rather than reshuffles. */
const ANGLES: Array<(topic: string, subject: string) => string> = [
  (topic, subject) =>
    `Most teams treat ${subject} as a box to tick. It is a decision, and it compounds.\n\nThe version that works is unglamorous: pick the smallest piece, do it properly, and check in six weeks whether it held. Nobody writes a case study about that, which is roughly why it keeps working.\n\nIf you are starting on ${topic} this week, start there.`,

  (topic, subject) =>
    `Everything we got wrong about ${subject}, in one line: we optimised the part that was easy to count.\n\nVolume is easy to count. Whether it landed is not. Track the countable one and the dashboard improves while the outcome does not — which is a very expensive way to feel productive.\n\nWorth an honest hour on ${topic} before the next quarter starts.`,

  (topic, subject) =>
    `A question worth asking about ${subject}: how fast does the ground move underneath it?\n\nIf the answer is weeks, a thorough annual pass will be stale before it ships, and you want small frequent ones instead. If the answer is years, the opposite. Most arguments about ${topic} are really disagreements about that one number.`,

  (topic, subject) =>
    `Two hours with a spreadsheet beats two weeks of work on ${subject} that nobody asked for.\n\nList what exists, score each item on impact and effort, delete the bottom two thirds. The deleting is the step people skip, and skipping it is why the work never finishes.\n\nThat is the whole method for ${topic}. There is no step four.`,
]

/** A short internal label for the post. Never posted — it is what the list
    shows in place of a title, since a social post does not have one. */
export function nameFrom(text: string): string {
  const first = (text.trim().split(/\n|(?<=[.!?])\s/)[0] ?? "").trim()
  const words = first.split(/\s+/).filter(Boolean).slice(0, 7).join(" ")
  const trimmed = words.replace(/[.,;:!?]+$/, "")

  if (!trimmed) {
    return "Untitled post"
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * The master text a brief produces. Per-platform shaping happens after this,
 * because each platform trims it to its own limit.
 */
export function generateSocialPost(brief: string, variant = 0): string {
  const source = brief.trim()
  if (!source) {
    return ""
  }

  const topic = topicFromTitle(source)
  const subject = subjectOf(topic)
  const angle = ANGLES[Math.abs(variant) % ANGLES.length]

  return angle(topic, subject)
}

// A headline is not a brief. It arrives with the furniture a headline carries —
// a count at the front, a subtitle after a colon, a parenthetical aside, a
// relative clause spelling out the stakes — and every piece of it reads as
// noise once the title is being used mid-sentence. "Ten Internal Linking
// Mistakes That Quietly Cost You Rankings" is about internal linking mistakes.
const HEADLINE_FURNITURE = [
  /\s*\([^)]*\)\s*$/,
  /:\s.*$/,
  /^(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i,
  /\s+(that|which|who)\s+.*$/i,
]

function briefFromHeadline(title: string): string {
  let brief = title.trim()
  for (const pattern of HEADLINE_FURNITURE) {
    brief = brief.replace(pattern, "").trim()
  }
  // A headline that is nothing but furniture keeps its own words.
  return brief || title.trim()
}

/**
 * A post developed from something already on the blog. The blog post's title is
 * the brief, and it goes through the same angles a typed one does — the result
 * is a post making the argument, not a notice that an article exists somewhere
 * with a link to go and read it.
 *
 * Which angle it takes follows from the title, so two blog posts picked in a
 * row do not come back reading like each other.
 */
export function generateFromBlogTitle(title: string, variant = 0): string {
  const seed = [...title].reduce((total, char) => total + char.charCodeAt(0), 0)
  return generateSocialPost(briefFromHeadline(title), seed + variant)
}

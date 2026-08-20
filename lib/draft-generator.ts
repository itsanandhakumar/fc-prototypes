// The brief: what the writer asks for, and the parsing that turns form fields
// into it. The writing itself happens in `lib/ai/blog.ts` — this module is the
// shared vocabulary between the form, the URL, the editor, and the model call,
// which is why it stays free of both React and server-only imports.

/** Character target the writer asks for on the slider. Intervals widen with
 * the value — 100 near the bottom, 500 near the top — and the final stop is
 * open-ended. */
export const CHARACTER_STOPS: Array<{ value: number; label: string }> = [
  ...[200, 300, 400, 500, 600, 700, 800].map((value) => ({
    value,
    label: value.toLocaleString(),
  })),
  ...[1000, 1200, 1400, 1600, 1800, 2000].map((value) => ({
    value,
    label: value.toLocaleString(),
  })),
  { value: 2500, label: "2,500" },
  { value: 3000, label: "3,000" },
  { value: 6000, label: "3,000+" },
]

export const MIN_CHARACTERS = CHARACTER_STOPS[0].value
export const MAX_CHARACTERS = CHARACTER_STOPS[CHARACTER_STOPS.length - 1].value
export const DEFAULT_CHARACTERS = 800

export type DraftBrief = {
  /** What the post is about, in the writer's own words. */
  brief: string
  /** Terms the draft has to cover. */
  keywords: string[]
  targetCharacters: number
}

export function parseKeywords(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export function parseTargetCharacters(
  value: string | number | undefined
): number {
  const asked = Number(value)
  if (!Number.isFinite(asked)) {
    return DEFAULT_CHARACTERS
  }

  // The slider only stops at the values above, but the number can also arrive
  // off a hand-edited URL — so it is clamped rather than trusted.
  return Math.min(MAX_CHARACTERS, Math.max(MIN_CHARACTERS, Math.round(asked)))
}

// ---------------------------------------------------------------------------
// Title parsing, kept from the prototype.
//
// Blog drafts are written by a model now, so none of the fake body generation
// survived — but Social Studio's own generator (`lib/social-generator.ts`)
// still reads a blog title down to its subject when it writes a post about
// one, and these are what it uses.
// ---------------------------------------------------------------------------

// Editorial framing the panel adds to alternate titles. Clicking one of those
// should still produce a draft about the underlying topic, not about the
// framing.
const TITLE_FRAMING = [
  /^the complete guide to\s+/i,
  /^what most teams get wrong about\s+/i,
  /:\s*a practical walkthrough$/i,
]

// Titles arrive in title case; the body reads them mid-sentence.
export function topicFromTitle(title: string): string {
  let topic = title.trim()
  for (const framing of TITLE_FRAMING) {
    topic = topic.replace(framing, "")
  }
  return topic.trim().toLowerCase() || "this topic"
}

// Question and verb openers make a fine title but a poor heading fragment:
// "Why how to run a content refresh matters" does not read. Strip them so
// headings can name the subject directly.
const SUBJECT_OPENERS =
  /^(how do i|how to|how|why|what|when|where|which|should i|the|a|an)\s+/i

const LEADING_VERBS = new Set([
  "audit",
  "avoid",
  "beat",
  "build",
  "choose",
  "cut",
  "do",
  "find",
  "fix",
  "get",
  "handle",
  "keep",
  "make",
  "measure",
  "pick",
  "plan",
  "run",
  "scale",
  "start",
  "stop",
  "structure",
  "turn",
  "use",
  "write",
])

// Words that make a fine sentence but a poor end to a heading fragment.
const TRAILING_FILLER = new Set([
  "affects",
  "and",
  "are",
  "become",
  "becomes",
  "changes",
  "for",
  "from",
  "help",
  "helps",
  "in",
  "is",
  "matter",
  "matters",
  "mean",
  "means",
  "of",
  "on",
  "that",
  "to",
  "which",
  "with",
  "work",
  "works",
])

export function subjectOf(topic: string): string {
  let subject = topic.replace(SUBJECT_OPENERS, "").trim()

  let words = subject.split(/\s+/)
  if (words.length > 1 && LEADING_VERBS.has(words[0])) {
    words = words.slice(1)
  }

  // A whole title makes an unreadable heading — "Why the anchor text problem
  // nobody audits matters" — so keep the leading noun phrase only.
  words = words.slice(0, 3)
  while (words.length > 1 && TRAILING_FILLER.has(words[words.length - 1])) {
    words.pop()
  }

  subject = words
    .join(" ")
    .replace(/^(a|an|the)\s+/i, "")
    .trim()

  return subject || topic
}

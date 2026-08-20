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

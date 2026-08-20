// What happens when a post goes out, platform by platform.
//
// Nothing is really sent — there is no OAuth behind any of this. But posting is
// not one action either: each network is signed into separately, has its own
// rules to clear, and answers separately. That is why a variant carries its own
// `failure` in lib/social-data.ts, and why one platform in a post can fail while
// its siblings go out fine. The run below has that shape.
//
// Every line is read back off the post itself — its length against the limit it
// is being held to, the account it is going out as, the rule its link is subject
// to. Nothing is invented for the sake of having something to show; the pacing
// is what makes it legible, the same way lib/generation-steps.ts works.

import type { Platform } from "@/lib/connectors"
import { formatCount } from "@/lib/social-insights"

export type PublishStep = {
  id: string
  /** Present tense, shown while the step is running. */
  running: string
  /** Past tense, shown once it is done — and what the step found. */
  done: string
  /** A second line kept beside the result, where there is more to say. */
  detail?: string
  /** How long the step is held on screen. */
  ms: number
}

const URL_PATTERN = /https?:\/\/\S+/i

/** The steps one platform goes through. Three, because posting is three
    questions — who are you, is this allowed, did it land — and a longer list
    would be padding a wait rather than reporting one. */
export function publishStepsFor(
  platform: Platform,
  text: string
): PublishStep[] {
  const linked = URL_PATTERN.test(text)

  return [
    {
      id: "connect",
      running: `Signing in to ${platform.name}`,
      done: `Signed in as ${platform.handle}`,
      ms: 600,
    },
    {
      id: "check",
      running: `Checking the post against ${platform.name}'s rules`,
      done: `${formatCount(text.length)} of ${formatCount(
        platform.characterLimit
      )} characters`,
      // Only when there is a link to be subject to it. The note is a real rule
      // about a real URL in this copy, not a fact about the platform in general.
      detail: linked ? platform.linkNote : undefined,
      ms: 700,
    },
    {
      id: "send",
      running: `Sending to ${platform.name}`,
      done: `Posted to ${platform.name}`,
      ms: 900,
    },
  ]
}

/** How long a whole platform takes, for the caller that wants to say so before
    it starts. */
export function durationOf(steps: PublishStep[]): number {
  return steps.reduce((total, step) => total + step.ms, 0)
}

/** FNV-1a, as in lib/social-data.ts: the id has to be the same every time this
    post is looked at, or a post would appear to move after it went out. */
function hash(seed: string): number {
  let h = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    h ^= seed.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Where the post now lives. The id is made up, but it is made up the way the
 * network's own ids look — a long number on LinkedIn and X, an opaque token on
 * Bluesky and Threads — because a link is the one part of "it went out" that a
 * reader checks against something they have seen before.
 */
export function permalinkFor(platform: Platform, seed: string): string {
  const h = hash(`${platform.id}:${seed}`)
  const g = hash(`${seed}:${platform.id}`)

  return (
    platform.permalink
      // Nineteen digits, the length of the ids these networks actually mint.
      // Two hashes rather than one padded out: a run of zeroes reads as a
      // placeholder, which is the one thing a permalink must not look like.
      .replace("{id}", `${h}${g}`.padEnd(19, "1").slice(0, 19))
      .replace("{token}", (h.toString(36) + g.toString(36)).slice(0, 13))
  )
}

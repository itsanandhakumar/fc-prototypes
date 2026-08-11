// Everything the summary strip shows, derived from the posts underneath it.
// Nothing here is asserted — change the seed and the strip moves with it, which
// is the same contract lib/generation-steps.ts holds itself to.

import type { SocialPost } from "@/lib/social-data"

const MINUTES_PER_DAY = 60 * 24
/** Points on the sparkline, and so how far back the strip looks. */
export const TREND_DAYS = 12
const WEEK = 7

/** One platform's share of the totals, so the strip can show where a summed
    figure actually came from. */
export type PlatformTotals = {
  platformId: string
  posts: number
  impressions: { thisWeek: number; lastWeek: number }
  engagement: { thisWeek: number; lastWeek: number }
  /** This week, split into the three things a reader can do. */
  likes: number
  comments: number
  reposts: number
}

export type SocialSummary = {
  /** Consecutive days back from today with at least one post out. */
  streakDays: number
  /** Posts per day, oldest first, TREND_DAYS long. */
  daily: number[]
  impressions: { thisWeek: number; lastWeek: number }
  engagement: { thisWeek: number; lastWeek: number }
  /** In the order the variants were written. Callers that care about display
      order should run this through orderPlatformIds — kept out of here so this
      module stays free of value imports and testable on its own. */
  platforms: PlatformTotals[]
}

/** Which day bucket a post falls in. 0 is today, counting backwards. */
function dayOf(post: SocialPost): number {
  return Math.floor(post.updatedMinutesAgo / MINUTES_PER_DAY)
}

function impressionsOf(post: SocialPost): number {
  return post.variants.reduce(
    (total, variant) => total + (variant.metrics?.impressions ?? 0),
    0
  )
}

// Engagement is the three things a reader can actively do. Impressions are not
// one of them — they measure delivery, not response.
function engagementOf(post: SocialPost): number {
  return post.variants.reduce((total, variant) => {
    const metrics = variant.metrics
    if (!metrics) {
      return total
    }
    return total + metrics.likes + metrics.comments + metrics.reposts
  }, 0)
}

export function summarize(posts: SocialPost[]): SocialSummary {
  // Only a post that went out can have done anything.
  const published = posts.filter((post) => post.status === "Published")

  const daily = Array.from({ length: TREND_DAYS }, () => 0)
  let thisWeekImpressions = 0
  let lastWeekImpressions = 0
  let thisWeekEngagement = 0
  let lastWeekEngagement = 0

  const byPlatform = new Map<string, PlatformTotals>()
  const totalsFor = (platformId: string): PlatformTotals => {
    const existing = byPlatform.get(platformId)
    if (existing) {
      return existing
    }
    const fresh: PlatformTotals = {
      platformId,
      posts: 0,
      impressions: { thisWeek: 0, lastWeek: 0 },
      engagement: { thisWeek: 0, lastWeek: 0 },
      likes: 0,
      comments: 0,
      reposts: 0,
    }
    byPlatform.set(platformId, fresh)
    return fresh
  }

  for (const post of published) {
    const day = dayOf(post)

    if (day < TREND_DAYS) {
      // The array reads oldest first, so today lands at the end.
      daily[TREND_DAYS - 1 - day] += 1
    }

    if (day < WEEK) {
      thisWeekImpressions += impressionsOf(post)
      thisWeekEngagement += engagementOf(post)
    } else if (day < WEEK * 2) {
      lastWeekImpressions += impressionsOf(post)
      lastWeekEngagement += engagementOf(post)
    }

    // Every platform this post went to is tallied separately, so a summed
    // figure can always be taken apart again.
    for (const variant of post.variants) {
      const metrics = variant.metrics
      if (!metrics) {
        continue
      }

      const totals = totalsFor(variant.platformId)
      const engaged = metrics.likes + metrics.comments + metrics.reposts

      if (day < WEEK) {
        totals.posts += 1
        totals.impressions.thisWeek += metrics.impressions
        totals.engagement.thisWeek += engaged
        totals.likes += metrics.likes
        totals.comments += metrics.comments
        totals.reposts += metrics.reposts
      } else if (day < WEEK * 2) {
        totals.impressions.lastWeek += metrics.impressions
        totals.engagement.lastWeek += engaged
      }
    }
  }

  // Walk back from today until a day has nothing in it.
  const postedOn = new Set(published.map(dayOf))
  let streakDays = 0
  while (postedOn.has(streakDays)) {
    streakDays += 1
  }

  return {
    streakDays,
    daily,
    impressions: { thisWeek: thisWeekImpressions, lastWeek: lastWeekImpressions },
    engagement: { thisWeek: thisWeekEngagement, lastWeek: lastWeekEngagement },
    platforms: [...byPlatform.values()],
  }
}

/** How a day in `daily` is named, counting back from today. No clock involved —
    the offsets are all the data has. */
export function dayLabel(daysAgo: number): string {
  if (daysAgo === 0) {
    return "Today"
  }
  if (daysAgo === 1) {
    return "Yesterday"
  }
  return `${daysAgo} days ago`
}

/** Null when there is no baseline — a jump from nothing is not a percentage,
    and rendering one would print Infinity. */
export function percentChange(now: number, before: number): number | null {
  if (before === 0) {
    return null
  }
  return Math.round(((now - before) / before) * 100)
}

/** Thousands separators without `toLocaleString`, whose grouping depends on the
    runtime's locale — the server's and the browser's do not have to agree, and
    a mismatch here would be a hydration error. */
export function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

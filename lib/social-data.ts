// Mock content for the Socials prototype. `updatedMinutesAgo` is a fixed offset
// rather than a real timestamp so the server and client render the same string —
// the same trick `lib/blog-data.ts` uses, and the reason nothing here needs a
// clock.

import { findPlatform } from "@/lib/connectors"
import { trimTo } from "@/lib/social-draft"

export type SocialStatus = "Draft" | "Scheduled" | "Published" | "Failed"

export type VariantMetrics = {
  impressions: number
  likes: number
  comments: number
  reposts: number
}

/** One platform's copy. The variant is the unit that gets posted, so the
    numbers hang off it rather than off the post: the summary can add them up
    for a sense of volume, but only the per-platform figures are a like-for-like
    measurement — each network counts an impression its own way. */
export type SocialVariant = {
  platformId: string
  text: string
  /** Published only. */
  metrics?: VariantMetrics
  /** Why this platform rejected it. One variant can fail while its siblings
      go out fine, which is why this sits here rather than on the post. */
  failure?: string
}

export type SocialPost = {
  id: string
  /** An internal label. Never posted — X has no title field. */
  name: string
  status: SocialStatus
  updatedMinutesAgo: number
  /** Scheduled only. Counts forward the way updatedMinutesAgo counts back. */
  scheduledInMinutes?: number
  variants: SocialVariant[]
}

const MINUTES_PER_DAY = 60 * 24

/** Days back, plus an hour offset so two posts on the same day do not sort as
    a tie. */
function daysAgo(days: number, hours = 9): number {
  return days * MINUTES_PER_DAY + hours * 60
}

// The seed carries the part worth writing by hand — one master text per post.
// The per-platform variants are shaped from it below.
type Seed = {
  id: string
  name: string
  status: SocialStatus
  updatedMinutesAgo: number
  scheduledInMinutes?: number
  /** Which platform rejected it, and why. Scheduled/Failed only. */
  failure?: { platformId: string; reason: string }
  master: string
}

// Published posts land on days 0,1,1,2,3,4,6,8,9,11,13 — five consecutive days
// back from today for the streak, then a gap, and enough either side of the
// seven-day line for the week-over-week comparison to have two real halves.
// Day 1 carries two so the activity bars have a height to compare against;
// with one post every day they would only ever read as posted / not posted.
const SOCIAL_SEED: Seed[] = [
  {
    id: "content-calendars-fail",
    name: "Why most content calendars fail",
    status: "Published",
    updatedMinutesAgo: daysAgo(0, 8),
    master:
      "Most teams treat the content calendar as a scheduling tool. It is a decision log.\n\nThe date a post goes out is the least interesting thing on the row. What matters is who owns it, what it is blocked on, and what you expected it to do. Track those and the dates take care of themselves.\n\nWe stopped asking \"what ships Thursday\" and started asking \"what is stuck\". Time-to-publish halved in a quarter.",
  },
  {
    id: "three-post-rule",
    name: "The three-post rule",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 10),
    master:
      "Before any launch we write three posts: the problem, the decision, the result.\n\nIf we cannot write the third one honestly, the launch is not ready. It is the cheapest go/no-go test we have, and it costs an afternoon.\n\nThe posts are a side effect. The argument they force is the point.",
  },
  {
    id: "one-good-thread",
    name: "One good thread beats five",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 16),
    master:
      "We used to post five times a week. Now it is two, and both get read.\n\nThe five were mostly restating each other in different words, which is what happens when the cadence is the goal rather than the argument.",
  },
  {
    id: "refresh-beats-publish",
    name: "Refreshing beats publishing",
    status: "Published",
    updatedMinutesAgo: daysAgo(2, 14),
    master:
      "Three of our four best-performing posts this quarter were refreshes, not new work.\n\nSecond quarter in a row. At some point that stops being a fluke and starts being the strategy.\n\nThe uncomfortable part: it means the backlog matters more than the calendar, and the backlog is nobody's favourite meeting.",
  },
  {
    id: "search-intent-quickly",
    name: "Search intent, quickly",
    status: "Published",
    updatedMinutesAgo: daysAgo(3, 11),
    master:
      "A term with 200 searches and one clear intent beats a 20,000-volume term that means four different things.\n\nVolume tells you how many people asked. Intent tells you whether your answer is the one they wanted. Only one of those is actionable this week.",
  },
  {
    id: "support-tickets-topics",
    name: "Support tickets are an editorial calendar",
    status: "Published",
    updatedMinutesAgo: daysAgo(4, 9),
    master:
      "Your support queue is a list of things people could not figure out, written in their own words.\n\nThat is a keyword research tool most teams already own and never open. Sort by volume, then by how long each takes to resolve. The expensive-and-frequent quadrant is your next quarter.",
  },
  {
    id: "shorter-review-cycles",
    name: "The review was never the bottleneck",
    status: "Published",
    updatedMinutesAgo: daysAgo(6, 15),
    master:
      "The bottleneck was never writing. It was the four days a draft sat waiting for a review that took twenty minutes.\n\nWe gave reviewers a deadline and a default: no response in 48 hours means approved. Nothing broke. Time-to-publish fell by more than half.",
  },
  {
    id: "meta-descriptions-click",
    name: "Meta descriptions people actually click",
    status: "Published",
    updatedMinutesAgo: daysAgo(8, 12),
    master:
      "A meta description is not a summary. It is the sentence that has to win against nine other sentences on the same screen.\n\nThe ones that work name the reader's problem in the first six words and leave the resolution just out of reach. The ones that fail restate the title in longer form.",
  },
  {
    id: "internal-linking-level",
    name: "Internal links point the wrong way",
    status: "Published",
    updatedMinutesAgo: daysAgo(9, 10),
    master:
      "Most internal linking problems are not missing links. They are links pointing at the wrong level of the site.\n\nA post that links up to a category page instead of across to a sibling post wastes the signal entirely. Check the direction before you check the count.",
  },
  {
    id: "fewer-longer-posts",
    name: "Fewer, longer posts",
    status: "Published",
    updatedMinutesAgo: daysAgo(11, 13),
    master:
      "Publishing cadence is the easiest thing to measure and the least useful thing to optimise.\n\nFour posts a month nobody finishes is worse than one that gets cited. Length is not the point either — completeness is.",
  },
  {
    id: "keyword-clustering-cheap",
    name: "Keyword clustering without the tools",
    status: "Published",
    updatedMinutesAgo: daysAgo(13, 9),
    master:
      "You can cluster a few hundred keywords with a spreadsheet and an afternoon.\n\nGroup by the page that already ranks for each term, then look at what falls into the same bucket. Terms that share a ranking page share intent, whatever the volume tool says.",
  },
  {
    id: "pillar-page-thread",
    name: "Pillar pages — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(0, 16),
    master:
      "A pillar page only earns its keep when the cluster around it is genuinely useful on its own.\n\nStart by mapping the questions a reader asks before, during, and after the one your pillar answers. Each becomes a supporting post.",
  },
  {
    id: "analytics-wont-tell-you",
    name: "What analytics won't tell you — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(2, 17),
    master:
      "Analytics will tell you which post got read. It will not tell you which post got believed.\n\nThe second one is the whole job, and the only proxy we have found is whether anyone quotes it back to you unprompted.",
  },
  {
    id: "cadence-vs-argument",
    name: "Cadence vs argument",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(0, 12),
    scheduledInMinutes: 3 * 60,
    master:
      "Nobody has ever subscribed to a cadence. They subscribe to an argument they want to hear the next instalment of.\n\nIf you cannot say what yours is in a sentence, posting more often will not fix it.",
  },
  {
    id: "audit-before-you-write",
    name: "Audit before you write",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(1, 9),
    scheduledInMinutes: 2 * 24 * 60,
    master:
      "Two hours with a spreadsheet beats two weeks of writing into a gap that was never there.\n\nList what you already have, score it on impact and effort, and delete the bottom two thirds before you write a word.",
  },
  {
    id: "search-intent-rejected",
    name: "Search intent, quickly — repost",
    status: "Failed",
    updatedMinutesAgo: daysAgo(0, 7),
    failure: { platformId: "x", reason: "X rejected the post — rate limited" },
    master:
      "A term with 200 searches and one clear intent beats a 20,000-volume term that means four different things.\n\nVolume tells you how many people asked. Intent tells you whether your answer is the one they wanted.",
  },
]

// The platforms the seed fans out across. Both are fully specced in
// lib/connectors.ts; Substack arrives with the composer that needs it.
const SEED_PLATFORM_IDS = ["linkedin", "x"]

/** FNV-1a. Small, deterministic, and stable across server and client — the
    numbers below must not move between renders. */
function hash(seed: string): number {
  let h = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    h ^= seed.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Derived in dependency order rather than drawn independently: likes come out
// of impressions, comments and reposts out of likes. Independent draws are how
// you end up showing 40 likes on 12 impressions.
function metricsFor(id: string, platformId: string): VariantMetrics {
  const h = hash(`${id}:${platformId}`)

  const impressions = 400 + (h % 5000)
  // 1.5%–6% of impressions.
  const likes = Math.round((impressions * (15 + ((h >>> 8) % 45))) / 1000)
  // 4%–14% of likes.
  const comments = Math.round((likes * (40 + ((h >>> 16) % 100))) / 1000)
  // 3%–12% of likes.
  const reposts = Math.round((likes * (30 + ((h >>> 24) % 90))) / 1000)

  return { impressions, likes, comments, reposts }
}

// Short platforms take the opening thought — a trimmed long post reads as a
// truncation, whereas the first paragraph reads as an adaptation. Long ones
// carry the whole argument.
function variantText(master: string, limit: number): string {
  const paragraphs = master
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return trimTo(limit < 600 ? (paragraphs[0] ?? master) : master, limit)
}

function withVariants(seed: Seed): SocialPost {
  const variants = SEED_PLATFORM_IDS.flatMap((platformId) => {
    const platform = findPlatform(platformId)
    if (!platform) {
      return []
    }

    return [
      {
        platformId,
        text: variantText(seed.master, platform.characterLimit),
        // Only a post that went out has anything to report.
        metrics:
          seed.status === "Published"
            ? metricsFor(seed.id, platformId)
            : undefined,
        failure:
          seed.failure?.platformId === platformId
            ? seed.failure.reason
            : undefined,
      },
    ]
  })

  return {
    id: seed.id,
    name: seed.name,
    status: seed.status,
    updatedMinutesAgo: seed.updatedMinutesAgo,
    scheduledInMinutes: seed.scheduledInMinutes,
    variants,
  }
}

export const socialPosts: SocialPost[] = SOCIAL_SEED.map(withVariants)

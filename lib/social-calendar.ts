// Putting posts on days.
//
// Nothing in this app stores a date. Every time is an offset in minutes — see
// lib/time.ts — precisely so the server and the browser can never disagree
// about what "now" is. A calendar cannot work that way: it has to name actual
// days. So the page settles on a single `now` when it renders and hands that
// number down, and every date below is measured from it. Server and client do
// the same arithmetic on the same number and arrive at the same grid.

import type { SocialPost } from "@/lib/social-data"

const MS_PER_MINUTE = 60_000

// Written out rather than taken from `toLocaleString`, whose names depend on
// the runtime's locale — the server's need not match the browser's, and a
// mismatch here would be a hydration error.
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * The day a post belongs on. A scheduled post sits on the day it is due; a
 * draft on the day it was written; a published or failed post on the day it
 * went out, or didn't.
 *
 * For the drafts that is `updatedMinutesAgo`, which is when the post last
 * moved rather than strictly when it was created — the seed does not record a
 * separate creation time, and for a draft nobody has come back to they are the
 * same day anyway.
 */
export function dateOf(post: SocialPost, nowMs: number): Date {
  if (post.status === "Scheduled" && post.scheduledInMinutes !== undefined) {
    return new Date(nowMs + post.scheduledInMinutes * MS_PER_MINUTE)
  }
  return new Date(nowMs - post.updatedMinutesAgo * MS_PER_MINUTE)
}

/** A day's identity, for grouping. Local rather than UTC: the grid is read in
    the reader's own days, and a post at 11pm belongs to the evening it was
    written, not to tomorrow morning in Greenwich. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export type Month = { year: number; month: number }

export function monthOf(date: Date): Month {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function shiftMonth({ year, month }: Month, by: number): Month {
  const shifted = new Date(year, month + by, 1)
  return monthOf(shifted)
}

export function monthLabel({ year, month }: Month): string {
  return `${MONTHS[month]} ${year}`
}

/**
 * Six weeks of days, starting from the Sunday on or before the 1st. Always six
 * rows, never five: a grid that changed height from month to month would move
 * everything under it every time you stepped forward.
 */
export function monthGrid({ year, month }: Month): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

/** The posts of each day, keyed the way `dayKey` keys them. */
export function groupByDay(
  posts: SocialPost[],
  nowMs: number
): Map<string, SocialPost[]> {
  const days = new Map<string, SocialPost[]>()

  for (const post of posts) {
    const key = dayKey(dateOf(post, nowMs))
    const day = days.get(key)
    if (day) {
      day.push(post)
    } else {
      days.set(key, [post])
    }
  }

  // Within a day, earliest first — the order they happen in, which is the
  // order a calendar is read in.
  for (const day of days.values()) {
    day.sort((a, b) => dateOf(a, nowMs).getTime() - dateOf(b, nowMs).getTime())
  }

  return days
}

/** The hour a post sits at, for the line inside its chip. */
export function timeLabel(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours < 12 ? "am" : "pm"
  const hour = hours % 12 === 0 ? 12 : hours % 12

  return minutes === 0
    ? `${hour}${suffix}`
    : `${hour}:${String(minutes).padStart(2, "0")}${suffix}`
}

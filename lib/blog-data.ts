// The shape a post takes once it has left the database and is on its way to
// the UI. It is not the row: `updatedAt` becomes a fixed minutes-ago offset,
// computed once on the server.
//
// That offset is what keeps the list from hydrating differently than it
// rendered. A client component computing "3h ago" from a timestamp reads the
// browser's clock, which is never quite the server's — so the two passes
// disagree and React throws. Measuring the gap once, server-side, means both
// passes render the same string.

import type { StoredBrief, StoredInsights } from "@/lib/db/schema"

export type PostStatus = "Draft" | "Published"

export type BlogPost = {
  id: string
  title: string
  status: PostStatus
  updatedMinutesAgo: number
  body: string
  brief?: StoredBrief
  insights?: StoredInsights
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 60 * 24
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7
const MINUTES_PER_MONTH = MINUTES_PER_DAY * 30

// Compact relative time, e.g. "25m ago", "Yesterday", "2wks ago".
export function formatRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) {
    return "Just now"
  }
  if (minutesAgo < MINUTES_PER_HOUR) {
    return `${minutesAgo}m ago`
  }
  if (minutesAgo < MINUTES_PER_DAY) {
    return `${Math.round(minutesAgo / MINUTES_PER_HOUR)}h ago`
  }
  if (minutesAgo < MINUTES_PER_DAY * 2) {
    return "Yesterday"
  }
  if (minutesAgo < MINUTES_PER_WEEK) {
    return `${Math.round(minutesAgo / MINUTES_PER_DAY)}d ago`
  }
  if (minutesAgo < MINUTES_PER_WEEK * 8) {
    const weeks = Math.round(minutesAgo / MINUTES_PER_WEEK)
    return `${weeks}wk${weeks === 1 ? "" : "s"} ago`
  }
  return `${Math.round(minutesAgo / MINUTES_PER_MONTH)}mo ago`
}

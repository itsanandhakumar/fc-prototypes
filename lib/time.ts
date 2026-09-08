// Every time in the app is an offset in minutes rather than a timestamp, so
// the server and the client always render the same string. Nothing here reads
// a clock.

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 60 * 24
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7
const MINUTES_PER_MONTH = MINUTES_PER_DAY * 30

/** Compact relative time, e.g. "25m ago", "Yesterday", "2wks ago". */
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

/** The same idea pointing forwards, for something not out yet. Relative rather
    than a wall-clock time on purpose: naming an hour would mean knowing what
    time it is, and a real clock is the one thing this app cannot have without
    the server and the browser disagreeing. */
export function formatLeadTime(minutesAhead: number): string {
  if (minutesAhead < 1) {
    return "Any moment"
  }
  if (minutesAhead < MINUTES_PER_HOUR) {
    return `in ${minutesAhead}m`
  }
  if (minutesAhead < MINUTES_PER_DAY) {
    const hours = Math.round(minutesAhead / MINUTES_PER_HOUR)
    return `in ${hours} hour${hours === 1 ? "" : "s"}`
  }
  if (minutesAhead < MINUTES_PER_DAY * 2) {
    return "Tomorrow"
  }
  const days = Math.round(minutesAhead / MINUTES_PER_DAY)
  return `in ${days} days`
}

/**
 * When something happened, written out in full.
 *
 * The rest of this file deliberately never touches a clock, because the server
 * and the browser would disagree about "now" and the page would flicker. This
 * one is different: it formats a moment that is already fixed, so there is no
 * clock to read — but it does resolve the reader's locale and timezone, so it
 * must only ever be called in the browser. A report is a document, and a
 * document carries the date it was made rather than how long ago that was.
 */
export function formatRunTimestamp(ranAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ranAt))
}

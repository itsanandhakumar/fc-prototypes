// Picking when a post goes out.
//
// The store keeps a schedule as `scheduledInMinutes` — an offset, like every
// other time in the app, so the server and the browser can never disagree about
// it (see lib/time.ts). A person does not pick an offset, though: they pick a
// Tuesday and a time of day. So this is the conversion, and it needs the same
// single `now` the calendar needs, handed down from the page for the same
// reason (see lib/social-calendar.ts).

import { MONTHS, timeLabel, WEEKDAYS } from "@/lib/social-calendar"

const MS_PER_MINUTE = 60_000
const MINUTES_PER_DAY = 60 * 24

/** Where the picker opens when the post has no time of its own yet: the
    morning, which is when most of the seeded queue goes out. */
export const DEFAULT_MINUTES = 9 * 60

/** Midnight on the day this moment falls on. Days are compared by their start
    so that "today" keeps meaning today all day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** A day and a time of day, combined into the moment they name. */
export function combine(day: Date, minutesIntoDay: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutesIntoDay / 60),
    minutesIntoDay % 60
  )
}

/** What the store keeps. Rounded rather than truncated, so a time picked on the
    minute does not come back a minute early. */
export function minutesUntil(at: Date, nowMs: number): number {
  return Math.round((at.getTime() - nowMs) / MS_PER_MINUTE)
}

/**
 * The other direction: where an already-scheduled post sits, so reopening it
 * opens the picker on the time it is already set to rather than on a default
 * that would quietly move it.
 *
 * Rounded to the quarter hour on the way out. What the store keeps is an offset
 * — "seven days from now" — and `now` is later every time the page is loaded,
 * so the moment it names slides forward with it. That is the model the whole
 * app runs on (see lib/time.ts) and it is fine for "in 7 days"; it is not fine
 * for a field showing 9:03 where nine o'clock was chosen. Rounding reads the
 * intent back out. The cost is that a time picked deliberately off the quarter
 * comes back on it, which is the cheaper of the two wrongs.
 */
export function momentOf(minutesAhead: number, nowMs: number): Date {
  const at = new Date(nowMs + minutesAhead * MS_PER_MINUTE)
  return combine(
    at,
    Math.round((at.getHours() * 60 + at.getMinutes()) / 15) * 15
  )
}

/** A time that has already been and gone cannot be scheduled. One minute of
    slack, because the picker was opened a moment before it was read. */
export function isPast(at: Date, nowMs: number): boolean {
  return minutesUntil(at, nowMs) < 1
}

// "09:30" — what an <input type="time"> speaks, in both directions.

export function formatTimeValue(minutesIntoDay: number): string {
  const hours = Math.floor(minutesIntoDay / 60)
  return `${String(hours).padStart(2, "0")}:${String(
    minutesIntoDay % 60
  ).padStart(2, "0")}`
}

export function parseTimeValue(value: string): number | undefined {
  const [hours, minutes] = value.split(":").map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return undefined
  }
  return Math.min(Math.max(hours * 60 + minutes, 0), MINUTES_PER_DAY - 1)
}

/** The moment in full: "Tue 19 August at 9am". Written out from the same
    tables the calendar uses rather than through `toLocaleString`, whose names
    depend on the runtime's locale — the server's need not match the browser's,
    and a mismatch here is a hydration error. */
export function describeMoment(at: Date): string {
  return `${WEEKDAYS[at.getDay()]} ${at.getDate()} ${
    MONTHS[at.getMonth()]
  } at ${timeLabel(at)}`
}

export type QuickSlot = { id: string; label: string; at: Date }

/**
 * The three times most posts get scheduled for, worked out from now. They are
 * shortcuts to a day and a time the grid can also reach — pressing one moves
 * the grid, rather than bypassing it, so the picker always shows what was
 * chosen.
 */
export function quickSlots(nowMs: number): QuickSlot[] {
  const now = new Date(nowMs)
  const today = startOfDay(now)

  // The next whole hour. "In an hour" landing at 14:37 is not a time anybody
  // meant to pick.
  const nextHour = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    now.getHours() + 1
  )

  const tomorrow = combine(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
    DEFAULT_MINUTES
  )

  // The coming Monday, and never today: a post scheduled for "Monday" on a
  // Monday morning means next week's.
  const untilMonday = (8 - today.getDay()) % 7 || 7
  const monday = combine(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + untilMonday
    ),
    DEFAULT_MINUTES
  )

  return [
    { id: "hour", label: `Next hour · ${timeLabel(nextHour)}`, at: nextHour },
    {
      id: "tomorrow",
      label: `Tomorrow · ${timeLabel(tomorrow)}`,
      at: tomorrow,
    },
    { id: "monday", label: `Monday · ${timeLabel(monday)}`, at: monday },
  ]
}

"use client"

import * as React from "react"
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react"

import { ConnectStep } from "@/components/socials/connect-step"
import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Platform } from "@/lib/connectors"
import {
  dayKey,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  WEEKDAYS,
} from "@/lib/social-calendar"
import {
  combine,
  DEFAULT_MINUTES,
  describeMoment,
  formatTimeValue,
  isPast,
  minutesUntil,
  momentOf,
  parseTimeValue,
  quickSlots,
  startOfDay,
} from "@/lib/social-schedule"
import { formatLeadTime } from "@/lib/time"
import { cn } from "@/lib/utils"

// Choosing when a post goes out.
//
// A month rather than a date field, because the question is never really "what
// date" — it is "what else is going out that week, and where is the gap". The
// grid answers that: the days already carrying posts say so, and the choice is
// made against them rather than against a blank calendar the writer has to hold
// in their head.

// Full width, and it hovers. A time input is mostly a piece of text with a
// small icon on the end, and at 7rem wide next to a bare label it read as a
// caption rather than a control — which is the whole reason the picker was hard
// to find. The cursor and the hover follow the shortcut buttons above it, so it
// reads as one more thing in that column you press.
const TIME_FIELD =
  "w-full cursor-pointer rounded-md border border-input bg-input/20 px-2.5 py-2 text-xs/relaxed tabular-nums transition-colors outline-none hover:bg-input/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

export function ScheduleDialog({
  open,
  onOpenChange,
  nowMs,
  platforms,
  connectedIds,
  queuedDays,
  scheduledInMinutes,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The one `now` the page settled on, so both ends of the app measure this
      schedule from the same moment. */
  nowMs: number
  /** Where the post is going, in registry order. */
  platforms: Platform[]
  connectedIds: string[]
  /** How many posts are already due on each day, keyed the way `dayKey` keys
      them. What makes this a calendar rather than a date field. */
  queuedDays: Record<string, number>
  /** The time this post is already set to go out, if it has one. */
  scheduledInMinutes?: number
  pending: boolean
  /** Hands back the offset the store keeps; the workspace saves it. */
  onConfirm: (minutesAhead: number) => void
}) {
  // Whatever it is already set to, or tomorrow morning — a time far enough off
  // that confirming without touching anything is never an accident.
  const initial = React.useMemo(() => {
    if (scheduledInMinutes !== undefined) {
      return momentOf(scheduledInMinutes, nowMs)
    }
    const today = startOfDay(new Date(nowMs))
    return combine(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      DEFAULT_MINUTES
    )
  }, [scheduledInMinutes, nowMs])

  const [day, setDay] = React.useState(() => startOfDay(initial))
  const [minutes, setMinutes] = React.useState(
    () => initial.getHours() * 60 + initial.getMinutes()
  )
  const [month, setMonth] = React.useState(() => monthOf(initial))

  const today = React.useMemo(() => startOfDay(new Date(nowMs)), [nowMs])
  const days = React.useMemo(() => monthGrid(month), [month])
  const slots = React.useMemo(() => quickSlots(nowMs), [nowMs])

  const at = combine(day, minutes)
  const gone = isPast(at, nowMs)
  const missing = platforms.filter(
    (platform) => !connectedIds.includes(platform.id)
  )
  const ready = !gone && !pending

  /** A quick slot moves the grid rather than going around it: the picker has to
      keep showing what was chosen, or the two disagree about the answer. */
  function pick(moment: Date) {
    setDay(startOfDay(moment))
    setMinutes(moment.getHours() * 60 + moment.getMinutes())
    setMonth(monthOf(moment))
  }

  // Nowhere to send it: that is the whole question, so it is the whole card.
  if (missing.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <ConnectStep
            missing={missing}
            connectedIds={connectedIds}
            action="schedule"
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Two columns, and no scrolling. A month is 250 pixels tall on its own;
          stacked under the shortcuts and over the times it made a card longer
          than the window, and a picker you have to scroll to see the answer of
          is not showing you the answer. */}
      <DialogContent className="gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule this post</DialogTitle>
          <DialogDescription>
            It goes out at one time, to{" "}
            {platforms.map((platform, index) => (
              <React.Fragment key={platform.id}>
                {index > 0 ? " and " : ""}
                {platform.name}
              </React.Fragment>
            ))}
            . You can change it until it does.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs/relaxed font-medium">
                {monthLabel(month)}
              </h3>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous month"
                  onClick={() => setMonth((current) => shiftMonth(current, -1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next month"
                  onClick={() => setMonth((current) => shiftMonth(current, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            <div className="grid w-full grid-cols-7 gap-0.5 sm:w-64">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="pb-1 text-center text-[0.65rem] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {weekday}
                </div>
              ))}

              {days.map((date) => {
                const key = dayKey(date)
                const chosen = key === dayKey(day)
                // The past is not a schedule. Today stays open — the time of day
                // decides whether it is still reachable, and the summary says so.
                const past = date < today
                const busy = queuedDays[key] ?? 0

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={past}
                    aria-pressed={chosen}
                    aria-label={`${date.getDate()} ${WEEKDAYS[date.getDay()]}${
                      busy
                        ? ` — ${busy} post${busy === 1 ? "" : "s"} already due`
                        : ""
                    }`}
                    onClick={() => setDay(startOfDay(date))}
                    className={cn(
                      "flex h-8 flex-col items-center justify-center gap-0.5 rounded-md text-[0.75rem] tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                      // The chosen day keeps its fill under the cursor. A plain
                      // hover would win on the cascade and take the ink with it,
                      // which leaves the date you just picked blank.
                      !past &&
                        (chosen ? "hover:bg-foreground/90" : "hover:bg-muted"),
                      // A day that cannot be picked has to look like one, and it
                      // is the faintest of the three: a date gone by is further
                      // out of reach than one in the next month along.
                      past
                        ? "text-muted-foreground/40"
                        : date.getMonth() === month.month
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                      chosen && "bg-foreground font-medium text-background"
                    )}
                  >
                    {date.getDate()}
                    {/* What is already on that day. A dot rather than a count:
                      the number matters less than whether the day is taken. */}
                    <span
                      className={cn(
                        "size-1 rounded-full",
                        busy
                          ? chosen
                            ? "bg-background/70"
                            : "bg-foreground/40"
                          : "bg-transparent"
                      )}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Beside the month rather than under it: the day and the time are
              one answer, and the shortcuts are that answer in one press. */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              {slots.map((slot) => (
                <Button
                  key={slot.id}
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => pick(slot.at)}
                >
                  {slot.label}
                </Button>
              ))}
            </div>

            {/* The other half of the answer. A row of preset hours sat here
                too, which was a third way to say what the shortcuts and the
                field already say — and the field says it for any hour, not
                five of them. */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="schedule-time"
                className="text-xs/relaxed font-medium"
              >
                Custom time
              </label>
              <input
                id="schedule-time"
                type="time"
                value={formatTimeValue(minutes)}
                onChange={(event) => {
                  const parsed = parseTimeValue(event.target.value)
                  if (parsed !== undefined) {
                    setMinutes(parsed)
                  }
                }}
                // The browser hangs its time picker off a small clock at the
                // end of the field, and nothing says so — the field reads as
                // text until you happen to hit the icon. Clicking anywhere in
                // it opens the same picker. Guarded because not every browser
                // has one (Safari has no picker at all), and there typing is
                // still the way in, which is what the line below says.
                onClick={(event) => {
                  try {
                    event.currentTarget.showPicker?.()
                  } catch {
                    // Refused — the field is focused either way.
                  }
                }}
                className={TIME_FIELD}
              />
              <p className="text-xs/relaxed text-muted-foreground">
                Click to pick a time, or type one. It goes out at that time on
                the day you chose.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t pt-3">
          {gone ? (
            <p className="min-w-0 flex-1 text-xs/relaxed text-destructive">
              That time has already gone. Pick a later one.
            </p>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs/relaxed">
              <span className="flex items-center gap-1.5 font-medium">
                {platforms.map((platform) => (
                  <PlatformGlyph
                    key={platform.id}
                    platformId={platform.id}
                    style={platformTint(platform)}
                  />
                ))}
                {describeMoment(at)}
              </span>
              <span className="text-muted-foreground">
                {/* The same words the list and the calendar will use for it
                    once it is queued, so the post says the same thing here as
                    it does everywhere it turns up afterwards. */}
                Goes out {formatLeadTime(minutesUntil(at, nowMs)).toLowerCase()}
                . Nothing is really sent.
              </span>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            disabled={!ready}
            onClick={() => onConfirm(minutesUntil(at, nowMs))}
          >
            <CalendarClock />
            {pending
              ? "Scheduling…"
              : scheduledInMinutes !== undefined
                ? "Reschedule"
                : "Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

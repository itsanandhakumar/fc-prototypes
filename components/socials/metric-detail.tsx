import { MessageCircle, Repeat2, ThumbsUp } from "lucide-react"

import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { orderPlatformIds, platformNames } from "@/lib/connectors"
import {
  dayLabel,
  formatCount,
  percentChange,
  TREND_DAYS,
  type PlatformTotals,
  type SocialSummary,
} from "@/lib/social-insights"
import { STATUS_DOT } from "@/lib/social-status"
import { cn } from "@/lib/utils"

// What sits behind each tile. The strip adds the platforms together because a
// single figure is what a summary is for; these say where that figure came
// from, which is the question a summed number always raises.

function nameOf(platformId: string): string {
  return platformNames([platformId])[0] ?? platformId
}

function ordered(platforms: PlatformTotals[]): PlatformTotals[] {
  const order = orderPlatformIds(platforms.map((p) => p.platformId))
  return order.flatMap((id) => platforms.filter((p) => p.platformId === id))
}

/** A bar never disappears entirely — a small number should read as small, not
    as absent. */
function widthOf(value: number, max: number): string {
  if (max <= 0 || value <= 0) {
    return "0%"
  }
  return `${Math.max(1.5, (value / max) * 100)}%`
}

function Change({ now, before }: { now: number; before: number }) {
  const percent = percentChange(now, before)

  if (percent === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="text-muted-foreground tabular-nums">
      {percent > 0 ? "+" : ""}
      {percent}%
    </span>
  )
}

function TotalRow({
  total,
}: {
  total: { thisWeek: number; lastWeek: number }
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-xs/relaxed">
      <span className="font-medium">Total</span>
      <span className="flex shrink-0 items-baseline gap-2">
        <span className="font-medium tabular-nums">
          {formatCount(total.thisWeek)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          was {formatCount(total.lastWeek)}
        </span>
        <Change now={total.thisWeek} before={total.lastWeek} />
      </span>
    </div>
  )
}

/**
 * One row per platform: what it did this week, how big that is next to the
 * others, and what it was before.
 *
 * Earlier passes stacked two charts and two kinds of percentage on one screen —
 * a share of the total (54%) beside a change against last week (+140%). Both
 * are percentages and they mean opposite kinds of thing, which is most of why
 * the card would not read. There is one figure per row now, one bar to size it
 * against the others, and last week stated in words rather than drawn as a
 * second bar to be measured against the first.
 */
function WeekBreakdown({
  platforms,
  total,
  pick,
}: {
  platforms: PlatformTotals[]
  total: { thisWeek: number; lastWeek: number }
  pick: (totals: PlatformTotals) => { thisWeek: number; lastWeek: number }
}) {
  // Bars are scaled against the biggest platform, not the total: the question
  // a row answers is how it compares with the row above it.
  const biggest = Math.max(...platforms.map((t) => pick(t).thisWeek), 1)

  return (
    <div className="flex flex-col gap-4">
      {platforms.map((totals) => {
        const figure = pick(totals)

        return (
          <div key={totals.platformId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-xs/relaxed">
                <PlatformGlyph
                  platformId={totals.platformId}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{nameOf(totals.platformId)}</span>
              </span>
              <span className="shrink-0 text-lg/none font-medium tabular-nums">
                {formatCount(figure.thisWeek)}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: widthOf(figure.thisWeek, biggest) }}
              />
            </div>

            <div className="flex items-baseline justify-between gap-3 text-[0.6875rem] text-muted-foreground">
              <span className="tabular-nums">
                was {formatCount(figure.lastWeek)} last week
              </span>
              <Change now={figure.thisWeek} before={figure.lastWeek} />
            </div>
          </div>
        )
      })}

      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-xs/relaxed">
        <span className="font-medium">Total</span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span className="font-medium tabular-nums">
            {formatCount(total.thisWeek)}
          </span>
          <span className="text-muted-foreground tabular-nums">
            was {formatCount(total.lastWeek)}
          </span>
          <Change now={total.thisWeek} before={total.lastWeek} />
        </span>
      </div>
    </div>
  )
}

export function ImpressionsDetail({ summary }: { summary: SocialSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <WeekBreakdown
        platforms={ordered(summary.platforms)}
        total={summary.impressions}
        pick={(totals) => totals.impressions}
      />

      {/* One line, not three. The caveat that matters is that this is not a
          count of people; the rest was explaining why, which is a paragraph
          nobody reads while looking at a number. */}
      <p className="text-xs/relaxed text-muted-foreground">
        Times served, not people reached — someone following you in both places
        is counted twice.
      </p>
    </div>
  )
}

// The three things a reader can do, each with the mark every network uses for
// it. The icons are why this card needs no legend: a thumb, a speech bubble and
// two arrows are read without a key, where three shades of one blue are not.
const ACTIONS = [
  { key: "likes", label: "Likes", Icon: ThumbsUp },
  { key: "comments", label: "Comments", Icon: MessageCircle },
  { key: "reposts", label: "Reposts", Icon: Repeat2 },
] as const

/**
 * A platform, what it earned, and what that was made of.
 *
 * The old shape asked for four separate readings: a legend for this week
 * against last, a pair of bars in two thicknesses, a second legend for the
 * three actions, and a stacked bar whose segments were named by a row of
 * figures written in the same order somewhere else. Nothing here is keyed to
 * anything else on the screen now — every row carries its own mark, its own
 * figure and its own bar.
 */
export function EngagementDetail({ summary }: { summary: SocialSummary }) {
  const platforms = ordered(summary.platforms)
  // One scale across every action on every platform, so a bar of a given length
  // means the same thing wherever it turns up.
  const biggest = Math.max(
    ...platforms.flatMap((totals) => [
      totals.likes,
      totals.comments,
      totals.reposts,
    ]),
    1
  )

  return (
    <div className="flex flex-col gap-5">
      {platforms.map((totals) => (
        <div key={totals.platformId} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-xs/relaxed">
              <PlatformGlyph
                platformId={totals.platformId}
                className="size-3.5 shrink-0"
              />
              <span className="truncate">{nameOf(totals.platformId)}</span>
            </span>
            <span className="shrink-0 text-lg/none font-medium tabular-nums">
              {formatCount(totals.engagement.thisWeek)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3 text-[0.6875rem] text-muted-foreground">
            <span className="tabular-nums">
              was {formatCount(totals.engagement.lastWeek)} last week
            </span>
            <Change
              now={totals.engagement.thisWeek}
              before={totals.engagement.lastWeek}
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-0.5">
            {ACTIONS.map(({ key, label, Icon }) => (
              <div
                key={key}
                title={`${label} — ${formatCount(totals[key])}`}
                className="flex items-center gap-2"
              >
                <Icon
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="sr-only">{label}</span>
                <span className="w-10 shrink-0 text-right text-[0.6875rem] tabular-nums">
                  {formatCount(totals[key])}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: widthOf(totals[key], biggest) }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <TotalRow total={summary.engagement} />
    </div>
  )
}

/** Whether a column falls inside the run counting back from today, which is the
    right-hand end of the chart. */
function inStreak(index: number, run: number): boolean {
  return run > 0 && index >= TREND_DAYS - run
}

export function StreakDetail({ summary }: { summary: SocialSummary }) {
  const { daily, streakDays } = summary
  const total = daily.reduce((sum, count) => sum + count, 0)
  // The run counts back from today, so it is the right-hand end of the row.
  const run = Math.min(streakDays, TREND_DAYS)

  const tallest = Math.max(...daily, 1)

  // Bars, labels and the streak rule are three rows over the same flex
  // geometry, which is what keeps every column lined up.
  const COLUMNS = "flex items-end gap-1.5"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {/* One block per post, stacked, rather than one bar whose height stands
            for a number written above it. Two blocks is two posts, and there is
            nothing to decode. */}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-xs bg-primary" />
            Each block is a post
          </span>
          {/* The rule below the days is a second thing on the same chart, so it
              gets named as one. Only when there is a run to name. */}
          {run > 0 ? (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("h-1 w-4 rounded-full", STATUS_DOT.Published)}
              />
              The streak
            </span>
          ) : null}
        </span>

        {/* The chart keeps its height whatever the busiest day holds: the
            column is a fixed box and the blocks divide it, so ten posts on one
            day makes thin blocks rather than a chart three times as tall. */}
        <div className={cn(COLUMNS, "h-24")}>
          {daily.map((count, index) => (
            <div
              key={index}
              // The figures are in the line below and in every column's own
              // title; this is the shape of them.
              aria-hidden
              title={`${dayLabel(TREND_DAYS - 1 - index)} — ${
                count === 0
                  ? "nothing posted"
                  : `${count} post${count === 1 ? "" : "s"}`
              }`}
              className="flex h-full flex-1 flex-col-reverse gap-1"
            >
              {Array.from({ length: tallest }, (_, slot) => (
                <span
                  key={slot}
                  className={cn(
                    "flex-1 rounded-sm",
                    slot < count
                      ? "bg-primary"
                      : // A day with nothing still holds its ground floor, so
                        // the gap reads as a day rather than as missing data.
                        slot === 0
                        ? "bg-muted"
                        : "bg-transparent"
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        {/* The streak, drawn under the days it covers.

            Green rather than the blue above it. In one colour the rule read as
            an underline of the chart — a border, not a measurement — and the
            one thing it has to say is where the run starts, which it cannot say
            while it looks like part of the blocks. The green is the one this app
            already gives a published post (lib/social-status.ts), and taken from
            there rather than restated, because that is what the run is made of:
            the days something went out. */}
        <div className={COLUMNS}>
          {daily.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full",
                inStreak(index, run) ? STATUS_DOT.Published : "bg-transparent"
              )}
            />
          ))}
        </div>

        <div className="flex items-baseline justify-between text-[0.6875rem] text-muted-foreground">
          <span>{dayLabel(TREND_DAYS - 1)}</span>
          <span>{dayLabel(0)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs/relaxed">
        <span className="font-medium">
          {run} {run === 1 ? "day" : "days"} in a row
        </span>
        <span className="text-muted-foreground">
          {total} {total === 1 ? "post" : "posts"} in the last {TREND_DAYS} days
        </span>
      </div>

      <div className="flex flex-col gap-1 text-xs/relaxed text-muted-foreground">
        <span>
          A post counts once a day, however many platforms it went to.
        </span>
        <span>The streak is the run of days from today with at least one.</span>
      </div>
    </div>
  )
}

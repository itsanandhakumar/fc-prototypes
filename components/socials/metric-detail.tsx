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
    <span className="tabular-nums text-muted-foreground">
      {percent > 0 ? "+" : ""}
      {percent}%
    </span>
  )
}

function Swatch({ className }: { className: string }) {
  return <span className={cn("size-2.5 shrink-0 rounded-xs", className)} aria-hidden />
}

function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <Swatch className={item.className} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/** Impressions and engagement share a shape: a figure per platform, this week
    against last. Two bars to a platform, scaled against one shared maximum so
    the platforms can be compared with each other and not just with themselves. */
function CompareBars({
  platforms,
  pick,
}: {
  platforms: PlatformTotals[]
  pick: (totals: PlatformTotals) => { thisWeek: number; lastWeek: number }
}) {
  const max = Math.max(
    ...platforms.flatMap((totals) => {
      const figure = pick(totals)
      return [figure.thisWeek, figure.lastWeek]
    }),
    1
  )

  return (
    <div className="flex flex-col gap-4">
      {platforms.map((totals) => {
        const figure = pick(totals)

        return (
          <div key={totals.platformId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs/relaxed">
              <span className="flex min-w-0 items-center gap-2">
                <PlatformGlyph
                  platformId={totals.platformId}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{nameOf(totals.platformId)}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="font-medium tabular-nums">
                  {formatCount(figure.thisWeek)}
                </span>
                <Change now={figure.thisWeek} before={figure.lastWeek} />
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="h-3 w-full overflow-hidden rounded-sm bg-muted/60">
                <div
                  className="h-full rounded-sm bg-primary"
                  style={{ width: widthOf(figure.thisWeek, max) }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted/60">
                  <div
                    className="h-full rounded-sm bg-primary/25"
                    style={{ width: widthOf(figure.lastWeek, max) }}
                  />
                </div>
                <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                  {formatCount(figure.lastWeek)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
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
        <span className="tabular-nums text-muted-foreground">
          from {formatCount(total.lastWeek)}
        </span>
        <Change now={total.thisWeek} before={total.lastWeek} />
      </span>
    </div>
  )
}

export function ImpressionsDetail({ summary }: { summary: SocialSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <Legend
        items={[
          { label: "This week", className: "bg-primary" },
          { label: "Last week", className: "bg-primary/25" },
        ]}
      />

      <CompareBars
        platforms={ordered(summary.platforms)}
        pick={(totals) => totals.impressions}
      />

      <TotalRow total={summary.impressions} />

      {/* The caveat belongs next to the number, not in a doc nobody opens. */}
      <p className="text-xs/relaxed text-muted-foreground">
        Added together across platforms. LinkedIn and X each count an impression
        their own way, and anyone who follows you in both places is counted
        twice — so read this as how much was served, not how many people saw it.
      </p>
    </div>
  )
}

const ACTIONS = [
  { key: "likes", label: "Likes", className: "bg-primary" },
  { key: "comments", label: "Comments", className: "bg-primary/55" },
  { key: "reposts", label: "Reposts", className: "bg-primary/25" },
] as const

export function EngagementDetail({ summary }: { summary: SocialSummary }) {
  const platforms = ordered(summary.platforms)
  // One scale across both platforms, so the segments stay comparable rather
  // than each bar filling its own width.
  const widest = Math.max(
    ...platforms.map((t) => t.likes + t.comments + t.reposts),
    1
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <Legend
          items={[
            { label: "This week", className: "bg-primary" },
            { label: "Last week", className: "bg-primary/25" },
          ]}
        />

        <CompareBars platforms={platforms} pick={(totals) => totals.engagement} />

        <TotalRow total={summary.engagement} />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs/relaxed font-medium">
          This week, by action
        </span>

        <Legend items={ACTIONS.map(({ label, className }) => ({ label, className }))} />

        <div className="flex flex-col gap-3">
          {platforms.map((totals) => {
            const total = totals.likes + totals.comments + totals.reposts

            return (
              <div key={totals.platformId} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs/relaxed">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlatformGlyph
                      platformId={totals.platformId}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{nameOf(totals.platformId)}</span>
                  </span>
                  {/* Every segment's figure in writing, so the split never
                      rests on three shades of one colour. */}
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCount(totals.likes)} · {formatCount(totals.comments)}{" "}
                    · {formatCount(totals.reposts)}
                  </span>
                </div>

                <div
                  className="flex h-3 gap-px overflow-hidden rounded-sm bg-muted/60"
                  style={{ width: widthOf(total, widest) }}
                >
                  {ACTIONS.map(({ key, className }) => (
                    <div
                      key={key}
                      className={cn("h-full", className)}
                      style={{
                        width: total ? `${(totals[key] / total) * 100}%` : "0%",
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function StreakDetail({ summary }: { summary: SocialSummary }) {
  const { daily, streakDays } = summary
  const tallest = Math.max(...daily, 1)
  const total = daily.reduce((sum, count) => sum + count, 0)
  // The run counts back from today, so it is the right-hand end of the chart.
  const run = Math.min(streakDays, TREND_DAYS)

  // Bars, labels and the streak rule are three rows over the same flex
  // geometry, which is what keeps every column lined up.
  const COLUMNS = "flex items-end gap-1.5"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {/* Counts sit above their own bar, so a taller bar never has to be
            measured against an axis to be read. */}
        <div className={COLUMNS}>
          {daily.map((count, index) => (
            <span
              key={index}
              className={cn(
                "flex-1 text-center text-[0.6875rem] tabular-nums",
                count ? "text-muted-foreground" : "text-transparent"
              )}
            >
              {count || 0}
            </span>
          ))}
        </div>

        <div className={cn(COLUMNS, "h-24")}>
          {daily.map((count, index) => (
            <div
              key={index}
              // The exact figure is on the label above and in the note below;
              // this is the shape of it.
              aria-hidden
              title={`${dayLabel(TREND_DAYS - 1 - index)} — ${
                count === 0 ? "nothing posted" : `${count} post${count === 1 ? "" : "s"}`
              }`}
              className={cn(
                "flex-1 rounded-sm",
                count ? "bg-primary" : "bg-muted"
              )}
              style={{
                // A day with nothing still gets a sliver, so the gap reads as a
                // day rather than as missing data.
                height: count === 0 ? "3px" : `${(count / tallest) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* The streak, drawn under the days it covers. */}
        <div className={COLUMNS}>
          {daily.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-0.5 flex-1 rounded-full",
                index >= TREND_DAYS - run && run > 0
                  ? "bg-primary"
                  : "bg-transparent"
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

      <p className="text-xs/relaxed text-muted-foreground">
        A post counts once for the day it went out, however many platforms it
        went to. The streak is the run of days from today with at least one.
      </p>
    </div>
  )
}

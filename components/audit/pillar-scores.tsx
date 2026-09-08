"use client"

import { AlertTriangle, OctagonAlert } from "lucide-react"

import { SeverityBadge } from "@/components/audit/severity-badge"
import { StatusBar, StatusChip } from "@/components/audit/status-chip"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { statusFor } from "@/lib/audit-report"
import {
  SEVERITY_COUNT_ORDER,
  type AuditFinding,
  type AuditPillar,
  type AuditRun,
} from "@/lib/audit-data"
import { cn } from "@/lib/utils"

// The six things the run scores, as six meters.
//
// A meter each rather than one shape over all of them: every score is the same
// ratio against the same limit, which is what a meter says and what a radar
// does not. A radar's area grows with the square of the score, so a pillar at
// 58 reads as a third of one at 95 rather than as two thirds; and the polygon
// it draws changes shape entirely if the pillars are listed in another order,
// which makes the silhouette look like a finding when it is an accident of
// sorting. Six bars down a column compare by length, against one baseline, in
// an order that is chosen rather than incidental.
//
// Sorted worst first, because that is the order the work goes in.
//
// Each one opens against itself, the way a day in the calendar does. Growing
// the card in place pushed every other card down the grid and left a hole
// where the row used to be — the page rearranged itself to answer a question
// about one tile. A popover lands on the tile that was asked and leaves the
// six where they were.

/**
 * The shape each state wears, and the ink it wears it in.
 *
 * A shape rather than a colour doing the work: a triangle and an octagon are
 * told apart in greyscale and by anyone who cannot separate amber from red.
 * Good gets nothing — a mark on every tile is a mark on none of them, and the
 * green bar is already the whole message.
 */
const MARK = {
  good: null,
  warn: {
    icon: AlertTriangle,
    label: "Needs work",
    tone: "text-amber-700 dark:text-amber-300",
  },
  bad: {
    icon: OctagonAlert,
    label: "Urgent",
    tone: "text-destructive",
  },
} as const

function PillarMeter({
  pillar,
  findings,
}: {
  pillar: AuditPillar
  /** Everything counted against this pillar, worst first. */
  findings: AuditFinding[]
}) {
  // The same three steps the chip, the report and the popover inside this very
  // tile already use. Two steps put a 58 and a 78 in the same amber, which said
  // the two needed the same attention; they do not, and the tile that opened to
  // a red bar had contradicted its own face.
  const status = statusFor(pillar.score)
  const mark = MARK[status.level]

  return (
    <Popover>
      {/* The card is the trigger, so the thing that answers opens against the
          thing that was asked. A real button rather than a clickable card, so
          it is reachable by keyboard and announced as a control — which is why
          it wears the card's surface rather than being one: Card renders a
          plain div and has no render prop to hand it a tag. */}
      <PopoverTrigger
        className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-card py-2.5 text-left text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 transition-colors outline-none [--card-spacing:--spacing(3)] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40 data-popup-open:bg-muted/50"
        render={<button type="button" />}
      >
        <span className="flex items-baseline justify-between gap-3 px-(--card-spacing)">
          <span className="min-w-0 truncate text-xs font-medium">
            {pillar.label}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {/* The mark alone. The words go where there is room to read them:
                on hover, to a screen reader, and in the panel the tile opens. */}
            {mark ? (
              <span
                title={mark.label}
                className={cn("flex items-center", mark.tone)}
              >
                <mark.icon className="size-3.5 shrink-0" aria-hidden />
                <span className="sr-only">{mark.label}</span>
              </span>
            ) : null}
            <span className="text-xs font-medium tabular-nums">
              {pillar.score}
            </span>
          </span>
        </span>

        {/* The shared meter rather than one built here. The steps and the
            colours belonged in two places once, and they drifted: this tile
            painted a 58 amber while the panel it opened painted the same 58
            red. One component, one answer. */}
        <StatusBar
          score={pillar.score}
          className="mx-(--card-spacing) w-auto"
        />

        {/* One line, always. A description that wrapped set the height of every
            card in its row, including the ones with nothing to wrap. */}
        <span className="block truncate px-(--card-spacing) text-xs text-muted-foreground">
          {pillar.covers}
        </span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* The figure at the size of a headline, the state as a chip, and
              the distance to a hundred drawn under both — the same treatment
              the score card gets, so a category reads like a smaller version
              of the whole rather than a different kind of thing. */}
          <PopoverTitle className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-medium">{pillar.question}</span>

            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-1.5">
                <span className="text-2xl/none font-medium tabular-nums">
                  {pillar.score}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </span>
              <StatusChip score={pillar.score} className="self-center" />
            </span>

            <StatusBar score={pillar.score} />

            <span className="text-xs text-muted-foreground">
              {pillar.label}
            </span>
          </PopoverTitle>

          <p className="text-xs/relaxed text-muted-foreground">
            {pillar.summary}
          </p>

          {findings.length ? (
            <ul className="flex flex-col gap-2 border-t border-border pt-3">
              {findings.map((finding) => (
                <li
                  key={finding.id}
                  className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <SeverityBadge severity={finding.severity} />
                  <span className="min-w-0 text-xs/relaxed">
                    {finding.title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Nothing was found against this.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The six, worst first, as cards for whatever grid they are dropped into. A
 * fragment rather than its own container: they sit in one grid with the score
 * they add up to, and a wrapper here would break that row.
 */
export function PillarScores({
  run,
  findings,
}: {
  run: AuditRun
  /** Every finding, to be split among the pillars they count against. */
  findings: AuditFinding[]
}) {
  const ranked = [...run.pillars].sort((a, b) => a.score - b.score)

  return (
    <>
      {ranked.map((pillar) => (
        <PillarMeter
          key={pillar.id}
          pillar={pillar}
          findings={findings
            .filter((finding) => finding.pillar === pillar.id)
            .sort(
              (a, b) =>
                SEVERITY_COUNT_ORDER.indexOf(a.severity) -
                SEVERITY_COUNT_ORDER.indexOf(b.severity)
            )}
        />
      ))}
    </>
  )
}

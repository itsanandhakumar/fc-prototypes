"use client"

import { severityLabel } from "@/components/audit/severity-badge"
import { StatusBar, StatusChip } from "@/components/audit/status-chip"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  overallScore,
  SEVERITY_COUNT_ORDER,
  type AuditFinding,
  type AuditRun,
} from "@/lib/audit-data"

/**
 * The whole site's score, and what is behind it.
 *
 * It opens the same way the six beside it do, because the same question gets
 * asked of it: a number on its own is a number to take on trust. What it has
 * to say is different, though — the six explain a part, and this one explains
 * where the figure comes from and which parts are pulling it about.
 */
export function HealthCard({
  run,
  findings,
  verdict,
}: {
  run: AuditRun
  findings: AuditFinding[]
  /** The run's own one-sentence conclusion, as the report states it. */
  verdict?: string
}) {
  const score = overallScore(run)
  const change =
    run.previousScore > 0
      ? Math.round(((score - run.previousScore) / run.previousScore) * 100)
      : null

  // Counted from the findings themselves rather than stored on the run, so this
  // can never disagree with the two lists underneath it.
  const bySeverity = SEVERITY_COUNT_ORDER.map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  })).filter((entry) => entry.count)

  const ranked = [...run.pillars].sort((a, b) => b.score - a.score)
  const strongest = ranked[0]
  const weakest = ranked[ranked.length - 1]

  return (
    <Popover>
      {/* A button wearing the card's surface rather than a clickable card:
          Card renders a plain div and has no render prop to hand it a tag. */}
      <PopoverTrigger
        className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-card py-2.5 text-left text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 transition-colors outline-none [--card-spacing:--spacing(3)] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40 data-popup-open:bg-muted/50 lg:row-span-2"
        render={<button type="button" />}
      >
        <span className="flex flex-col px-(--card-spacing)">
          <span className="text-xs/relaxed text-muted-foreground">
            Health score
          </span>
          <span className="text-2xl/tight font-medium">{score}</span>
        </span>

        {change !== null ? (
          // Direction is carried by the sign, not by a colour.
          <span className="px-(--card-spacing) text-xs text-muted-foreground tabular-nums">
            {change > 0 ? "+" : ""}
            {change}% vs last run
          </span>
        ) : null}

        {bySeverity.length ? (
          <span className="mt-auto flex flex-col gap-0.5 px-(--card-spacing)">
            {bySeverity.map(({ severity, count }) => (
              <span
                key={severity}
                className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>{severityLabel(severity)}</span>
                <span className="tabular-nums">{count}</span>
              </span>
            ))}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* The figure at the size of a headline, with the state beside it as
              a chip and the distance to a hundred drawn under it. Grey type
              alone gave the eye nothing to land on, and the colour the tiles
              already use was going unspent here. */}
          <PopoverTitle className="flex min-w-0 flex-col gap-2">
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-1.5">
                <span className="text-3xl/none font-medium tabular-nums">
                  {score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </span>
              <StatusChip score={score} className="self-center" />
            </span>

            <StatusBar score={score} />

            <span className="text-xs text-muted-foreground">
              Averaged from the six category scores
            </span>
          </PopoverTitle>

          {verdict ? (
            <p className="text-xs/relaxed text-muted-foreground">{verdict}</p>
          ) : null}

          {/* The two ends of the six, each with its own meter — the point is
              the distance between them, which two numbers alone do not show. */}
          <dl className="flex flex-col gap-3 border-t border-border pt-3">
            {[
              { term: "Strongest", pillar: strongest },
              { term: "Weakest", pillar: weakest },
            ].map(({ term, pillar }) => (
              <div key={term} className="flex min-w-0 flex-col gap-1.5">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-xs text-muted-foreground">
                    {term}
                  </dt>
                  <dd className="flex min-w-0 items-baseline gap-2 text-xs">
                    <span className="min-w-0 truncate font-medium">
                      {pillar.label}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {pillar.score}
                    </span>
                  </dd>
                </div>
                <StatusBar score={pillar.score} />
              </div>
            ))}
          </dl>
        </div>
      </PopoverContent>
    </Popover>
  )
}

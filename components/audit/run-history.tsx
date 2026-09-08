"use client"

import * as React from "react"

import { ReportDialog } from "@/components/audit/report-dialog"
import { Badge } from "@/components/ui/badge"
import type { AuditRunRecord } from "@/lib/audit-data"
import { buildReport } from "@/lib/audit-report"
import { formatRelativeTime } from "@/lib/time"
import { cn } from "@/lib/utils"

// Every run against one company, newest first, each one a way into its report.
//
// The row is a button rather than a link: the report opens over the list, so
// the run above and below it stay in view — which is the comparison a history
// is read for.

function RunRow({
  run,
  current,
  now,
  onOpen,
}: {
  run: AuditRunRecord
  current: boolean
  /** The moment the page was rendered, so every row ages off one clock. */
  now: number
  onOpen: () => void
}) {
  const minutesAgo = Math.max(0, Math.round((now - run.ranAt) / 60_000))

  return (
    <li className="border-b border-border first:pt-0 last:border-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-4 rounded-md px-2 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-xs font-medium">
              {run.site}
            </span>
            {/* The run the dashboard is showing. Said rather than linked — it
                is where you already are. */}
            {current ? (
              <Badge variant="outline" className="shrink-0 font-normal">
                Showing now
              </Badge>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(minutesAgo)} · {run.id}
          </span>
        </span>

        {/* The score, and nothing beside it. What each run turned up is in the
            report; down this column, the score is the trend. */}
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs tabular-nums">
          <span className="font-medium">{run.score}</span>
          <span className="text-muted-foreground">score</span>
        </span>
      </button>
    </li>
  )
}

export function RunHistory({
  runs,
  currentId,
  now,
  className,
}: {
  runs: AuditRunRecord[]
  /** Which run the dashboard is showing. */
  currentId: string
  now: number
  className?: string
}) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  const open = runs.find((run) => run.id === openId)

  if (!runs.length) {
    return (
      <p className="rounded-md border border-dashed border-input px-2.5 py-3 text-xs text-muted-foreground">
        No runs against this company yet.
      </p>
    )
  }

  return (
    <>
      <ul className={cn("flex flex-col", className)}>
        {runs.map((run) => (
          <RunRow
            key={run.id}
            run={run}
            current={run.id === currentId}
            now={now}
            onOpen={() => setOpenId(run.id)}
          />
        ))}
      </ul>

      {open ? (
        <ReportDialog
          report={buildReport({
            run: open,
            // This company's runs up to and including the one being read,
            // oldest first. A report shows the trend as it stood when the run
            // happened, not as it stands now.
            history: runs
              .filter((run) => run.ranAt <= open.ranAt)
              .map((run) => run.score)
              .reverse(),
          })}
          ranAt={open.ranAt}
          open
          onOpenChange={(next) => {
            if (!next) {
              setOpenId(null)
            }
          }}
        />
      ) : null}
    </>
  )
}

import { HealthCard } from "@/components/audit/health-card"
import { PillarScores } from "@/components/audit/pillar-scores"
import { Badge } from "@/components/ui/badge"
import { type AuditFinding, type AuditRun } from "@/lib/audit-data"
import { formatRelativeTime } from "@/lib/time"

// The first section: the score, and the six things it is made of.
//
// One grid, not two rows of unrelated cards. The score card and the six pillar
// cards are the same statement at two levels of detail, so they are laid out as
// one block with the score taking the height of both pillar rows beside it —
// which is what says "these six add up to that one" without a caption saying so.
//
// Counts of pages checked and findings were cards up here once and were not
// worth the room: the two lists below print their own totals in their own
// headers, which is where anyone wanting that number is already looking.
export function RunSummary({
  run,
  findings,
  verdict,
}: {
  run: AuditRun
  findings: AuditFinding[]
  /** The run's own conclusion, for the score card to explain itself with. */
  verdict?: string
}) {
  return (
    <section className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="shrink-0 text-sm font-medium">Latest run</h2>

        {/* What was audited, and which pass of it — the two facts about the
            run rather than about the site, kept together at the end of the
            line. The address leads: it says what was looked at, and the time
            and the id only say when and which. */}
        <div className="flex min-w-0 items-center gap-2">
          {/* In a chip rather than loose: two runs of text at different sizes
              sharing a line read as one phrase that has gone wrong, and the
              address is a value rather than a continuation of anything. The
              chip is what says where it starts and stops.

              A label, not a control. This page is about one company and only
              ever that one — the way to a different company is a run against
              it, not a switch up here. */}
          <Badge
            variant="outline"
            className="h-8 min-w-0 rounded-md px-2.5 py-1.5 text-xs font-normal"
          >
            <span className="min-w-0 truncate">{run.site}</span>
          </Badge>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(run.ranMinutesAgo)} · {run.id}
          </span>
        </div>
      </div>

      {/* Four columns so seven cards fill two rows exactly: the score down the
          first, three pillars along each of the other two. Six cards over three
          columns with the score beside them would leave a hole. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthCard run={run} findings={findings} verdict={verdict} />

        <PillarScores run={run} findings={findings} />
      </div>
    </section>
  )
}

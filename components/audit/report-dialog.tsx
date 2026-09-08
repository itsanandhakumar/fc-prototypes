"use client"

import { Download } from "lucide-react"

import { ReportView } from "@/components/audit/report-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AuditReport } from "@/lib/audit-report"
import { formatRunTimestamp } from "@/lib/time"

/**
 * A run's report, opened from the row that names it.
 *
 * Over the history rather than at its own address: a report is read against
 * the list it came from — this run compared with the ones above and below it —
 * and a page would take that list away to show it. What leaves the room is a
 * PDF, which is a thing a report has always been.
 */
export function ReportDialog({
  report,
  ranAt,
  open,
  onOpenChange,
}: {
  report: AuditReport
  /** When the run happened, in epoch milliseconds. */
  ranAt: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-3xl">
        <DialogHeader className="shrink-0 pr-24">
          <DialogTitle className="min-w-0 wrap-anywhere">
            {report.site}
          </DialogTitle>
          {/* The date and time it was run, not how long ago. "4 days ago" is
              right in a list, where the reader is comparing runs to each
              other; on a report that gets sent on and read later it is a fact
              that quietly goes wrong. */}
          <DialogDescription>
            {formatRunTimestamp(ranAt)} · {report.runId}
          </DialogDescription>
        </DialogHeader>

        {/* Beside the close button rather than in the body: it acts on the
            whole report, not on any part of it. Hidden on paper, where a
            control is just ink.

            The browser's print dialog is what produces the file — "Save as
            PDF" is one of its destinations. Generating one here would mean
            drawing the whole report a second time in a PDF library, and
            keeping the two drawings in step forever. */}
        <div className="absolute top-3 right-11" data-print-hidden>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Download />
            Download PDF
          </Button>
        </div>

        {/* The report takes the slack and scrolls, so which run this is stays
            on screen however far down the reader gets.

            On a soft ground rather than on the dialog's own white: the report
            is made of cards, and a white card on a white page is a card with
            its edges rubbed out. The tint is what makes them read as objects
            laid on something. */}
        {/* rounded-b-xl to match the dialog: the tint is bled to the edges
            with negative margins, so without it the wash paints square corners
            over the dialog's rounded ones and the bottom reads as two shapes
            fighting. */}
        <div className="-mx-4 mt-4 -mb-4 min-h-0 flex-1 overflow-y-auto rounded-b-xl bg-muted/50 px-4 py-4">
          <ReportView report={report} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

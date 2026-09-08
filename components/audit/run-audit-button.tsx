"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

import { runAuditOn } from "@/app/audit-actions"
import { ReportDialog } from "@/components/audit/report-dialog"
import { RUN_DURATION, RunProgress } from "@/components/audit/run-progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAuditSite, type AuditRunRecord } from "@/lib/audit-data"
import { buildReport } from "@/lib/audit-report"
import { cn } from "@/lib/utils"

/**
 * Starts a run against this account's company — and, behind a link, against
 * somebody else's.
 *
 * The company is not a field here. It is the account's own site, set once and
 * changed only in Settings, so offering it as a choice at the top of every run
 * would make the ordinary case look like a decision. What is a decision is auditing a
 * different company, which is a separate thing with a separate result: that
 * run joins the history rather than replacing the dashboard, because the
 * dashboard is about your company and a competitor's score is not your score.
 *
 * There is no crawler behind either yet. What happens is a run is recorded and
 * the page moves to it; the findings are the same every time because they are
 * fixed data (see lib/audit-data.ts). That is the part still to build.
 */
export function RunAuditButton({
  company,
  hasReport,
  actionableCount,
  reportedCount,
}: {
  /** The account's own site. Every ordinary run goes here. */
  company: string
  /**
   * Whether there is a report to replace. The warning below is entirely about
   * what would be lost, so with nothing there yet it is a caution about
   * something that cannot happen — and it reads absurdly, promising to rebuild
   * a list of nothing.
   */
  hasReport: boolean
  /** What is on the page now, so the warning is about what is actually there. */
  actionableCount: number
  reportedCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [asking, setAsking] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  /** A finished run against another company, waiting to be read. */
  const [finished, setFinished] = React.useState<{
    run: AuditRunRecord
    history: number[]
  } | null>(null)
  const [running, startRunning] = React.useTransition()
  /** The site a run is currently against, which is what the progress shows. */
  const [runningOn, setRunningOn] = React.useState<string | null>(null)

  // Checked as typed rather than on submit, so the button that would fail is
  // simply not pressable — there is nothing to say about a half-typed address.
  const other = parseAuditSite(typed)

  function run(site: string) {
    // The second dialog closes first: the run is reported in the one that
    // started it, and two stacked dialogs would put the progress behind a
    // question that has already been answered.
    setAsking(false)
    setTyped("")
    setRunningOn(site)

    startRunning(async () => {
      // The work and the account of it run together, and whichever takes
      // longer decides when this ends. Today that is always the account —
      // there is no crawler yet — but the moment there is one, a slow run
      // simply holds the last step instead of finishing early.
      const [result] = await Promise.all([
        runAuditOn(site),
        new Promise((resolve) => setTimeout(resolve, RUN_DURATION)),
      ])

      setRunningOn(null)
      setOpen(false)

      // Your own company's run changes the page behind this dialog, so the
      // page is what to show. Another company's changes nothing here — its
      // report is the only thing it produced, so that is what opens.
      if (result && result.run.site !== company) {
        setFinished(result)
        return
      }

      router.refresh()
    })
  }

  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        <RefreshCw />
        Run new audit
      </Button>

      {/* While a run is on, the dialog cannot be dismissed: closing it would
          leave the run going with nothing on screen saying so. */}
      <Dialog open={open} onOpenChange={runningOn ? () => {} : setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={!runningOn}>
          {runningOn ? (
            <div className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Running the audit</DialogTitle>
                <DialogDescription>
                  This takes a moment. The report opens when it is done.
                </DialogDescription>
              </DialogHeader>

              <RunProgress site={runningOn} />
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Run a new audit?</DialogTitle>
                <DialogDescription>
                  {hasReport
                    ? "The new run replaces everything on this page. Nothing from the current one is kept."
                    : "The first audit of your company."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5">
                <div
                  className={cn(
                    "flex items-baseline justify-between gap-4",
                    hasReport && "border-b border-border pb-2"
                  )}
                >
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Your company
                  </span>
                  <span className="min-w-0 text-right text-xs font-medium wrap-anywhere">
                    {company}
                  </span>
                </div>

                {/* Named as the two lists are named on the page, so it is
                  obvious which parts of the screen this is talking about.
                  Absent on a first run: there is no list to rebuild. */}
                {hasReport ? (
                  <p className="text-xs text-muted-foreground">
                    The six category scores are worked out again, and both lists
                    are rebuilt from what the new run finds — the{" "}
                    <span className="font-medium text-foreground">
                      {actionableCount} to fix from here
                    </span>{" "}
                    and the{" "}
                    <span className="font-medium text-foreground">
                      {reportedCount} to hand on
                    </span>
                    . Anything you have not acted on will not carry over.
                  </p>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
                A mock-up. The run is not wired up yet.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* The other kind of run. A link rather than a button — it opens
                  a question, it does not start anything. */}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0"
                  disabled={running}
                  onClick={() => {
                    setTyped("")
                    setAsking(true)
                  }}
                >
                  Run on a different company
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={running}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={running}
                    onClick={() => run(company)}
                  >
                    <RefreshCw className={cn(running && "animate-spin")} />
                    {running ? "Running…" : "Run audit"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Nested, so the dialog it came from stays behind it as the context
              for the question — Base UI softens the parent while this is up. */}
          <Dialog open={asking} onOpenChange={setAsking}>
            <DialogContent className="sm:max-w-sm">
              <div className="flex min-w-0 flex-col gap-4">
                <DialogHeader>
                  <DialogTitle>Run on a different company</DialogTitle>
                  <DialogDescription>
                    For comparing another company against yours. It joins the
                    history and leaves this dashboard alone.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="audit-other-site">Company website</Label>
                  <Input
                    id="audit-other-site"
                    className="h-9 py-1.5"
                    value={typed}
                    placeholder="example.com"
                    // The browser offers its own history of URLs when a field says it
                    // takes one, which drops a list of unrelated addresses over the
                    // dialog. Nothing here benefits from it: the site being typed is a
                    // decision, not a value to recall.
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) => setTyped(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && other) {
                        event.preventDefault()
                        run(other)
                      }
                    }}
                  />
                  {/* Says what will be used, once there is enough typed to
                      know — the scheme gets filled in, and showing that is
                      better than silently changing what was entered. */}
                  <p className="min-w-0 text-xs wrap-anywhere text-muted-foreground">
                    {other ?? "A domain, with or without https://"}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={running}
                    onClick={() => setAsking(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={running || !other}
                    onClick={() => other && run(other)}
                  >
                    <RefreshCw className={cn(running && "animate-spin")} />
                    {running ? "Running…" : "Run audit"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Over whatever this button was pressed from, rather than at the end of
          a journey to the history. The run just happened; this is it. */}
      {finished ? (
        <ReportDialog
          report={buildReport({
            run: finished.run,
            history: finished.history,
          })}
          ranAt={finished.run.ranAt}
          open
          onOpenChange={(next) => {
            if (!next) {
              setFinished(null)
            }
          }}
        />
      ) : null}
    </>
  )
}

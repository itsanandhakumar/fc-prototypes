import Link from "next/link"
import { cookies } from "next/headers"
import { History } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { CompanySetup } from "@/components/audit/company-setup"
import { FindingTabs } from "@/components/audit/finding-tabs"
import { RunAuditButton } from "@/components/audit/run-audit-button"
import { RunSummary } from "@/components/audit/run-summary"
import { Button } from "@/components/ui/button"
import {
  actionableFindings,
  AUDIT_COMPANY_COOKIE,
  LATEST_RUN,
  parseAuditSite,
  reportedFindings,
} from "@/lib/audit-data"
import { buildReport } from "@/lib/audit-report"
import { latestRunFor, runBefore, runsFor } from "@/lib/audit-store"
import { currentTime } from "@/lib/now"

// The third product in the suite. Blogger writes the posts and Social Studio
// distributes them; Audit is what looks back at the result.
//
// This page is about one company: the account's own. A competitor can be
// audited — that is the point of being able to compare — but those runs live
// in the history, because a competitor's score on this page would be read as
// yours. Three sections, and the order is the argument: what the run found,
// then what can be done about it here, then what cannot.
export default async function AuditPage() {
  const cookieStore = await cookies()
  const company = parseAuditSite(cookieStore.get(AUDIT_COMPANY_COOKIE)?.value)

  // Nothing to show until Audit knows whose site it is about.
  if (!company) {
    return (
      <AppShell>
        <CompanySetup suggested={LATEST_RUN.site} />
      </AppShell>
    )
  }

  const record = latestRunFor(company)
  const previous = record ? runBefore(record.id) : undefined

  // Runs carry the moment they happened, so how long ago that was has to be
  // worked out now. The only clock in the app, read once per request.
  const now = await currentTime()

  // Everything below is a reading of one report: this company's latest. The
  // dashboard is the workspace view of it — the pillars to work through and
  // the findings to act on — while the report itself, and every other
  // company's, is read whole from the history.
  const report = record
    ? buildReport({
        run: record,
        history: runsFor(company)
          .map((entry) => entry.score)
          .reverse(),
      })
    : undefined
  const actionable = report ? actionableFindings(report.findings) : []
  const reported = report ? reportedFindings(report.findings) : []

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-lg font-medium">Audit</h1>
        <p className="text-lg text-muted-foreground">
          What the last run turned up
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* A page rather than a dialog: a history is a thing to read down and
            come back to, so it gets an address of its own. It is also where a
            run against another company lands. */}
        <Button
          variant="outline"
          size="lg"
          // It navigates, so it is a link wearing a button — and Base UI has to
          // be told, or it holds the anchor to a native button's semantics and
          // warns that they are missing.
          nativeButton={false}
          render={<Link href="/audit/history" />}
        >
          <History />
          History
        </Button>

        {/* The counts come from the same two lists the page draws below, so
            the warning names what is actually on screen. */}
        <RunAuditButton
          company={company}
          hasReport={Boolean(report)}
          actionableCount={actionable.length}
          reportedCount={reported.length}
        />
      </div>
    </div>
  )

  // A company nobody has audited yet. Saying so is the whole content of the
  // page — the alternative is drawing six scores about nothing.
  if (!record || !report) {
    return (
      <AppShell>
        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
          {header}
          <p className="rounded-md border border-dashed border-input px-3 py-4 text-xs text-muted-foreground">
            No audit has been run on {company} yet. Run one and its scores and
            findings will appear here.
          </p>
        </main>
      </AppShell>
    )
  }

  const run = {
    ...LATEST_RUN,
    pillars: report.pillars,
    id: record.id,
    site: record.site,
    ranMinutesAgo: Math.max(0, Math.round((now - record.ranAt) / 60_000)),
    previousScore: previous?.score ?? LATEST_RUN.previousScore,
    previousFindings: previous?.findings ?? LATEST_RUN.previousFindings,
  }

  return (
    <AppShell>
      {/* The page itself does not scroll. The run's figures are fixed at the
          top and the findings card takes the slack, scrolling internally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
        {header}

        <RunSummary
          run={run}
          findings={report.findings}
          verdict={report.verdict}
        />

        <FindingTabs actionable={actionable} reported={reported} run={run} />
      </main>
    </AppShell>
  )
}

import { cookies } from "next/headers"

import { AppShell } from "@/components/app-shell"
import { HistorySitePicker } from "@/components/audit/history-site-picker"
import { RunHistory } from "@/components/audit/run-history"
import { Card, CardContent } from "@/components/ui/card"
import { AUDIT_COMPANY_COOKIE, parseAuditSite } from "@/lib/audit-data"
import { getRuns, latestRunFor, runsFor } from "@/lib/audit-store"
import { currentTime } from "@/lib/now"

// Every audit run against one company, on its own page rather than in a dialog
// over the last one. A history is a thing to read down and come back to — it
// deserves an address, a back button, and the room to hold a long list.
//
// One company at a time, and by default the account's own. Runs from two
// companies interleaved by date read as one company's results lurching about;
// the picker above the list is how the others are reached.
export default async function AuditHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const runs = getRuns()

  const cookieStore = await cookies()
  const company = parseAuditSite(cookieStore.get(AUDIT_COMPANY_COOKIE)?.value)

  // Every company with a run against it, the account's own first. Built from
  // the runs themselves, so a company drops off the list exactly when it has
  // no history left to show.
  const sites = [
    ...new Set([...(company ? [company] : []), ...runs.map((run) => run.site)]),
  ]

  const { site: requested } = await searchParams
  const asked = parseAuditSite(requested)
  const selected =
    asked && sites.includes(asked) ? asked : (company ?? sites[0] ?? "")

  const shown = runsFor(selected)

  // Which run the dashboard is showing, so this list can mark it.
  const current = company ? latestRunFor(company) : undefined

  // Runs carry the moment they happened, so how long ago that was has to be
  // worked out now. The only clock in the app, read once per request.
  const now = await currentTime()

  return (
    <AppShell
      breadcrumbs={[{ label: "Audit", href: "/audit" }, { label: "History" }]}
    >
      {/* The page itself does not scroll — the list card takes the slack and
          scrolls internally, the way Blogger's posts card does. */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-lg font-medium">Audit history</h1>
            <p className="text-lg text-muted-foreground">
              {shown.length} {shown.length === 1 ? "run" : "runs"}
              {selected === company ? " on your company" : " on this company"}
            </p>
          </div>

          {sites.length ? (
            <HistorySitePicker
              selected={selected}
              sites={sites}
              company={company}
            />
          ) : null}
        </div>

        <Card className="min-h-0 flex-1">
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <RunHistory runs={shown} currentId={current?.id ?? ""} now={now} />
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}

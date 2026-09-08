"use client"

import * as React from "react"
import { Building2 } from "lucide-react"

import { setAuditCompany } from "@/app/audit-actions"
import { CompanyField } from "@/components/audit/company-field"
import { Card } from "@/components/ui/card"

/**
 * The first thing Audit asks, and the only time it asks: whose site is this?
 *
 * A screen rather than a dialog. A dialog would need a dashboard behind it,
 * and there is nothing to put there — every figure on that page is about a
 * company nobody has named yet, so showing one would mean showing somebody
 * else's, or an empty frame pretending to be waiting.
 */
export function CompanySetup({ suggested }: { suggested: string }) {
  const [pending, startPending] = React.useTransition()

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="flex flex-col gap-4 px-(--card-spacing)">
          <div className="flex flex-col gap-1.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted">
              <Building2 className="size-4 text-muted-foreground" />
            </span>
            <h2 className="font-heading text-sm font-medium">
              Which company is this?
            </h2>
            <p className="text-xs text-muted-foreground">
              Audit is about one company — yours. Every run and every score on
              this page will be about the site you name here. You can change it
              later in Settings.
            </p>
          </div>

          <CompanyField
            label="Company website"
            initialValue={suggested}
            submitLabel="Start auditing"
            // The address is a suggestion, and taking it is the point.
            requireChange={false}
            pending={pending}
            onSubmit={(site) => startPending(async () => setAuditCompany(site))}
          />
        </div>
      </Card>
    </div>
  )
}

"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import {
  AUDIT_COMPANY_COOKIE,
  parseAuditSite,
  type AuditRunRecord,
} from "@/lib/audit-data"
import { recordRun, runsFor } from "@/lib/audit-store"

const YEAR = 60 * 60 * 24 * 365

/**
 * Set which company this account is. Asked once when Audit is first opened,
 * and changed only in Settings — everything the dashboard shows is about this
 * site, so it is not something to switch in passing.
 */
export async function setAuditCompany(site: string) {
  const parsed = parseAuditSite(site)
  if (!parsed) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(AUDIT_COMPANY_COOKIE, parsed, {
    path: "/",
    sameSite: "lax",
    maxAge: YEAR,
  })

  revalidatePath("/audit")
  revalidatePath("/audit/history")
}

/**
 * Run the audit and record that it ran.
 *
 * Returns the run so the caller can show what it produced. A run against
 * another company does not touch the dashboard — that page is about this
 * account's own site and stays that way — so the report it produced is handed
 * straight back and opened where the run was started from. Sending someone to
 * the history to go and find it made them pick the company out of a menu to
 * reach the thing they had just asked for.
 */
export async function runAuditOn(site: string): Promise<{
  run: AuditRunRecord
  /** That company's scores, oldest first, for the report's trend. */
  history: number[]
} | null> {
  const parsed = parseAuditSite(site)
  if (!parsed) {
    return null
  }

  const run = recordRun(parsed)

  revalidatePath("/audit")
  revalidatePath("/audit/history")

  return {
    run,
    history: runsFor(parsed)
      .map((entry) => entry.score)
      .reverse(),
  }
}

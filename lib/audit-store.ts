import {
  FINDINGS,
  LATEST_RUN,
  overallScore,
  SEEDED_RUNS,
  type AuditRunRecord,
} from "@/lib/audit-data"

// Prototype storage: in memory, seeded from the mock runs. Runs survive
// navigation but reset when the dev server restarts — the same deal as
// lib/post-store.ts, and for the same reason: there is no database yet.
//
// Runs are the one thing here that has to know when it happened, so they carry
// an absolute time rather than the fixed offsets everything else in the app
// uses (see lib/time.ts). The offset is worked out at render instead, which
// keeps "2h ago" true five minutes later.

const MINUTE = 60_000

/**
 * Whether to start with the mock history in place.
 *
 * On for a demo, where several companies with several runs each are the point:
 * reports to open without running anything, and a column of scores that
 * actually moves. Off to see the product as someone opening it for the first
 * time sees it — no runs, no report, and every screen having to say so. Flip
 * it and the dev server reloads this module, which empties the store.
 */
const SEED_HISTORY = true

// Read once, at module load, so the seeded history sits at fixed points
// relative to each other rather than sliding with every request.
const SEEDED_AT = Date.now()

const SEED: AuditRunRecord[] = SEEDED_RUNS.map((run) => ({
  id: run.id,
  site: run.site,
  ranAt: SEEDED_AT - run.ranMinutesAgo * MINUTE,
  score: run.score,
  findings: run.findings,
  pillarScores: run.pillarScores,
}))

let runs: AuditRunRecord[] = SEED_HISTORY ? SEED : []

/** Newest first, which is the order everything reads them in. */
export function getRuns(): AuditRunRecord[] {
  return runs
}

/** The most recent run against one site, if it has ever been audited. */
export function latestRunFor(site: string): AuditRunRecord | undefined {
  return runs.find((run) => run.site === site)
}

/** Every run against one site, newest first. */
export function runsFor(site: string): AuditRunRecord[] {
  return runs.filter((run) => run.site === site)
}

/**
 * The run before a given one *against the same site*, for the comparison the
 * dashboard draws. Comparing across companies would be comparing two different
 * websites and calling the difference progress.
 */
export function runBefore(id: string): AuditRunRecord | undefined {
  const index = runs.findIndex((run) => run.id === id)
  if (index === -1) {
    return undefined
  }
  const { site } = runs[index]
  return runs.slice(index + 1).find((run) => run.site === site)
}

function nextId(): string {
  // Off the highest number already used, so a seeded id and a new one can
  // never collide however the mock history is edited.
  const highest = runs.reduce((top, run) => {
    const number = Number(run.id.replace(/\D/g, ""))
    return Number.isFinite(number) && number > top ? number : top
  }, 0)
  return `run-${highest + 1}`
}

/**
 * Record a run against a site.
 *
 * The score and the count are the ones the page is showing, because the
 * findings are fixed data — every new run turns up exactly what the last one
 * did. That makes new rows in the history look alike, which is the truth about
 * this prototype rather than a gap in it: inventing a different score per run
 * would be inventing results nobody produced.
 */
export function recordRun(site: string): AuditRunRecord {
  const run: AuditRunRecord = {
    id: nextId(),
    site,
    ranAt: Date.now(),
    score: overallScore(LATEST_RUN),
    findings: FINDINGS.length,
  }

  runs = [run, ...runs]
  return run
}

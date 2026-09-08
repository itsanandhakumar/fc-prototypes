import {
  FINDINGS,
  LATEST_RUN,
  type AuditFinding,
  type AuditPillar,
  type AuditRunRecord,
} from "@/lib/audit-data"

// What a run produces. The dashboard is a reading of one of these — the
// account's own company's latest — and every other run can only be read as the
// report it is. That is the division the whole product hangs off: one company
// gets a workspace, the rest get documents.
//
// Mock, like everything else here: one crawler's worth of findings, dressed as
// a report. What changes between reports is the site they are about, and that
// is the honest limit of a prototype with no crawler behind it.

/**
 * What a score means, in three steps.
 *
 * Three rather than five letter grades: this is read by people who do not work
 * on websites, and "B" tells them nothing that "Good" does not tell them
 * better. `level` is the state, for whatever has to colour it; `label` is the
 * word, which is what actually carries the meaning.
 */
export type Status = {
  label: string
  level: "good" | "warn" | "bad"
}

const STATUSES: Array<{ from: number } & Status> = [
  { from: 80, label: "Good", level: "good" },
  { from: 60, label: "Needs work", level: "warn" },
  { from: 0, label: "Urgent", level: "bad" },
]

export function statusFor(score: number): Status {
  const match = STATUSES.find((status) => score >= status.from)
  return match ?? STATUSES[STATUSES.length - 1]
}

export type StackItem = { name: string; category: string }

export type SecurityHeader = { name: string; present: boolean }

export type Weight = "high" | "medium" | "low"

export type RoadmapItem = {
  /** Position in the order the work should be done. */
  rank: number
  title: string
  /** What it is worth, and what it costs. Together they decide the order. */
  impact: Weight
  effort: Weight
  /**
   * The findings this closes, by id.
   *
   * The list of problems and the list of fixes were two sections once, and a
   * reader met the same fact in both — once as a complaint and once as a plan.
   * Tying them together means each is stated where it is useful and nowhere
   * else: the problem inside the action that solves it.
   */
  fixes: string[]
  /** Who does it. Named, because most of these are not ours to do. */
  owner: string
}

export type AuditReport = {
  runId: string
  site: string
  /** Out of 100, averaged from the pillars. */
  score: number
  /**
   * This company's scores across every run, oldest first and ending with this
   * one. Empty on the first run, when there is no trend to speak of.
   */
  history: number[]
  /** The one sentence a reader would repeat back. */
  verdict: string
  /** Highest and lowest pillar, named so the reader does not have to hunt. */
  strongest: AuditPillar
  opportunity: AuditPillar
  pillars: AuditPillar[]
  stack: {
    /** Whether the stack is current enough not to be the problem. */
    modern: boolean
    server: string
    items: StackItem[]
  }
  security: { https: boolean; headers: SecurityHeader[] }
  roadmap: RoadmapItem[]
  closing: { title: string; body: string }
  /**
   * The problems behind the scores, each filed under who can act on it. The
   * roadmap says what to do; these say what is wrong. The dashboard draws
   * them as its two lists.
   */
  findings: AuditFinding[]
}

const STACK = {
  modern: true,
  server: "Vercel",
  items: [
    { name: "Next.js", category: "Framework" },
    { name: "Vercel", category: "CDN / Hosting" },
  ],
}

// Named individually rather than counted, because "5 of 6" does not say which
// one is missing, and the missing one is the whole finding.
const SECURITY_HEADERS: SecurityHeader[] = [
  { name: "HSTS (Strict-Transport-Security)", present: true },
  { name: "Content-Security-Policy", present: false },
  { name: "X-Content-Type-Options", present: true },
  { name: "X-Frame-Options", present: true },
  { name: "Referrer-Policy", present: true },
  { name: "Permissions-Policy", present: true },
]

// Ordered by leverage — impact first, then the cheaper of two equals. A list
// of work that is not in the order the work should be done in is just a list.
//
// Between them these cover every finding: the report has one place where a
// problem is named, and it is inside the thing that fixes it.
const ROADMAP: RoadmapItem[] = [
  {
    rank: 1,
    title: "Renew the certificate and turn on two-factor",
    impact: "high",
    effort: "low",
    owner: "Whoever holds the DNS, and the HubSpot admin",
    fixes: ["tls-expiry", "admins-without-2fa"],
  },
  {
    rank: 2,
    title: "Add the missing meta descriptions",
    impact: "high",
    effort: "low",
    owner: "Blogger",
    fixes: [
      "meta-q3-performance",
      "meta-descriptions-post",
      "meta-keyword-clustering",
    ],
  },
  {
    rank: 3,
    title: "Switch the last protection on",
    impact: "high",
    effort: "medium",
    owner: "Hosting",
    fixes: ["no-csp"],
  },
  {
    rank: 4,
    title: "Fix the share picture",
    impact: "medium",
    effort: "low",
    owner: "Blogger",
    fixes: ["featured-image-off-size"],
  },
  {
    rank: 5,
    title: "Add links to your social profiles",
    impact: "medium",
    effort: "low",
    owner: "Blogger",
    fixes: ["no-social-links"],
  },
  {
    rank: 6,
    title: "Pick a winner between the two competing posts",
    impact: "medium",
    effort: "medium",
    owner: "Blogger",
    fixes: ["keyword-cannibalisation"],
  },
  {
    rank: 7,
    title: "Unblock the tag pages and tag what is untagged",
    impact: "medium",
    effort: "medium",
    owner: "Hosting and Blogger",
    fixes: [
      "robots-blocks-tags",
      "tags-fewer-longer",
      "tags-support-tickets",
      "tags-time-to-publish",
      "tags-intent-volume",
    ],
  },
  {
    rank: 8,
    title: "Shrink the picture at the top of each page",
    impact: "medium",
    effort: "medium",
    owner: "Blog theme",
    fixes: ["slow-lcp"],
  },
]

/** A pillar list sorted by score, for picking the ends off. */
function ranked(pillars: AuditPillar[]): AuditPillar[] {
  return [...pillars].sort((left, right) => right.score - left.score)
}

/**
 * The report for a run.
 *
 * Assembled rather than stored: the findings are fixed data, so every report
 * is the same report about a different site. When there is a crawler, this is
 * where its output arrives, and nothing above it has to change.
 */
export function buildReport({
  run,
  history = [],
}: {
  run: AuditRunRecord
  /** Scores of this company's runs, oldest first. */
  history?: number[]
}): AuditReport {
  // A run's own category scores where it has them, today's where it does not.
  // The overall figure comes from the run rather than from these, so the number
  // in the history and the number in the report are the same number.
  const pillars = LATEST_RUN.pillars.map((pillar) => ({
    ...pillar,
    score: run.pillarScores?.[pillar.id] ?? pillar.score,
  }))
  const order = ranked(pillars)
  const strongest = order[0]
  const opportunity = order[order.length - 1]

  return {
    runId: run.id,
    site: run.site,
    score: run.score,
    history,
    verdict: `The site is well built. What holds it back is that it is written to be read by people, and most of what reads it now is software. ${strongest.label} is the strength to build on; ${opportunity.label} is where the ground is being lost.`,
    strongest,
    opportunity,
    pillars,
    stack: STACK,
    security: { https: true, headers: SECURITY_HEADERS },
    roadmap: ROADMAP,
    closing: {
      title: "In short",
      body: "Nothing here needs rebuilding. The tools are current and the site is fast to serve. The work is in what the pages say and how they are filed — which is writing and tagging, not engineering.",
    },
    findings: FINDINGS,
  }
}

/**
 * The job that closes a finding, if one does.
 *
 * A link out of the audit carries the finding it came from, and this is how
 * the other end turns that back into an instruction: the job's title is what
 * to do, where the finding's own words only say what is wrong.
 */
export function jobForFinding(findingId: string): RoadmapItem | undefined {
  return ROADMAP.find((item) => item.fixes.includes(findingId))
}

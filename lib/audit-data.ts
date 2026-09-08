// What an audit run found. Mock, like everything else in the prototype: no
// crawler has run, and the figures are fixed rather than generated so the page
// reads the same on every render.
//
// The shape of this file is the point. A finding is sorted by *who can act on
// it*, not by what kind of problem it is — the suite can change a post in
// Blogger or a post in Social Studio, and it can change nothing else. That
// division is what splits the page into what we can fix and what we can only
// report, so it lives in the data rather than in the components reading it.

/**
 * The account's own company — the site every audit is about unless someone
 * deliberately points a run somewhere else.
 *
 * Asked once, when Audit is first opened, and changed only in Settings. A
 * cookie so the server can apply it on the first render rather than flashing
 * the wrong company first, the same reason the editor's preferences live in
 * one (see lib/preferences.ts).
 */
export const AUDIT_COMPANY_COOKIE = "forward_audit_company"

/**
 * An address as typed, made into one that can be shown.
 *
 * Lenient on purpose: someone entering a site to audit types the domain, and
 * refusing "example.com" for want of a scheme would be the form being precious
 * about a thing it can supply itself. Anything with no dot in it is not an
 * address at all, and that is the one thing rejected.
 */
export function parseAuditSite(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(withScheme)
    return url.hostname.includes(".")
      ? url.origin + (url.pathname === "/" ? "" : url.pathname)
      : undefined
  } catch {
    return undefined
  }
}

export type AuditSeverity = "critical" | "serious" | "warning"

/**
 * The six things a run scores the site on. Every finding belongs to exactly
 * one, which is what lets a low pillar be read as "and here is why" rather
 * than as a number with nothing behind it.
 */
export type AuditPillarId =
  | "tech-stack"
  | "performance"
  | "security"
  | "ai-readiness"
  | "ai-search-visibility"
  | "conversion-brand"

export type AuditPillar = {
  id: AuditPillarId
  label: string
  /** Out of 100. */
  score: number
  /** One line on what the pillar is looking at, for the dashboard card. */
  covers: string
  /**
   * The same thing as a question anyone would ask, for the report.
   *
   * The report leaves the building. "AI Readiness" means nothing to someone in
   * sales; "Can AI tools read and quote the site?" means the same thing to
   * everyone, and needs no glossary.
   */
  question: string
  /** What the run concluded about it, for the report. */
  summary: string
}

/**
 * Below this a pillar is called out as needing work.
 *
 * A round number rather than a computed one: the point of a threshold is that
 * everyone reading the page knows where it is.
 */
export const PILLAR_THRESHOLD = 80

/**
 * Who can act on a finding.
 *
 * `blogger` and `socials` carry somewhere to go and something the button says,
 * because acting on them means opening the product that owns the thing.
 * `external` carries an owner instead: it is a real problem with a real fix,
 * and the fix is not in this suite — no button here would do anything but
 * pretend.
 */
/**
 * A post a finding is actually about, and the field on it that is wrong.
 *
 * A finding that says "three posts" and links to the blog's front page has
 * made the reader do the finding's own work again. These are what the row
 * links to instead: the post, opened at the thing to change.
 */
export type AuditTarget = {
  /** The post's id in the store, so the editor can open it. */
  postId: string
  title: string
}

/**
 * What the reader is being sent to change.
 *
 * Three of these are fields in the publish dialog. `body` is the post itself —
 * some findings are not a value to correct but a decision to make, and the
 * only place to make it is the writing.
 */
export type AuditFix = "meta" | "image" | "tags" | "body"

export type AuditScope =
  | {
      kind: "blogger"
      action: string
      href: string
      /** The posts to fix, when the finding is about particular posts. */
      targets?: AuditTarget[]
      fix?: AuditFix
    }
  | { kind: "socials"; action: string; href: string }
  | { kind: "external"; owner: string }

/**
 * One problem, on one thing.
 *
 * A finding that said "three posts have no summary line" was three jobs
 * wearing one row: the reader could not tick any of it off, and the fix
 * button had to walk them through a queue. Where the posts are independent
 * they are separate findings; where they are a pair — two posts competing for
 * one search — one finding still covers both, because fixing either alone
 * fixes nothing.
 */
export type AuditFinding = {
  id: string
  title: string
  /** Which pillar it counts against. */
  pillar: AuditPillarId
  /** One sentence on why it matters. */
  detail: string
  severity: AuditSeverity
  /** What it is about — a post, a platform, the site itself. */
  subject: string
  scope: AuditScope
}

export type AuditRun = {
  id: string
  /**
   * The address the run was pointed at, in full. Carried by the run rather
   * than read off the connected blog: an audit is of a website, and the
   * website need not be one this suite publishes to.
   */
  site: string
  ranMinutesAgo: number
  pagesChecked: number
  pillars: AuditPillar[]
  /** The two figures from the run before, for the comparisons. */
  previousScore: number
  previousFindings: number
}

/**
 * Scores that agree with the findings below.
 *
 * Security is the one worth explaining: it is the pillar with the most and the
 * worst findings against it, so it scores the lowest. A pillar that read 100
 * with an expiring certificate underneath it would be the page contradicting
 * itself, and the contradiction would be believed over the list.
 */
export const LATEST_RUN: AuditRun = {
  id: "run-1042",
  site: "https://blog.forward.tools",
  ranMinutesAgo: 95,
  pagesChecked: 24,
  previousScore: 71,
  previousFindings: 14,
  pillars: [
    {
      id: "tech-stack",
      label: "Tech Stack",
      score: 95,
      covers: "What the site is built on.",
      question: "Is the site built on something current?",
      summary:
        "Built with current tools and hosted well. This is not what is holding the site back.",
    },
    {
      id: "performance",
      label: "Performance",
      score: 78,
      covers: "How fast a page becomes useful.",
      question: "Does it load fast enough?",
      summary:
        "Pages take about four seconds to become usable on a phone. Most people give up before three.",
    },
    {
      id: "security",
      label: "Security",
      score: 58,
      covers: "Certificates, headers, access.",
      question: "Is it safe, and will it stay online?",
      summary:
        "Two things need attention this month, and one of them takes the site offline if it is missed.",
    },
    {
      id: "ai-readiness",
      label: "AI Readiness",
      score: 82,
      covers: "Whether machines can read it.",
      question: "Can AI tools read and quote the site?",
      summary:
        "Machines can read the site. What they find reads like advertising, which is not the kind of thing they quote.",
    },
    {
      id: "ai-search-visibility",
      label: "AI Search Visibility",
      score: 64,
      covers: "Whether answers cite the site.",
      question: "Do people find us when they search?",
      summary:
        "The brand is recognisable, but too little of the writing answers a question directly enough to be quoted back.",
    },
    {
      id: "conversion-brand",
      label: "Conversion & Brand",
      score: 71,
      covers: "What an arriving reader sees.",
      question: "Does a visitor understand it, and act?",
      summary:
        "The offer is clear and the pictures are nearly right. What is missing is proof, and any way for a reader to follow the company.",
    },
  ],
}

/**
 * The headline figure, averaged from the pillars rather than stored beside
 * them. Stored, the two could drift; averaged, the page can only ever say one
 * thing.
 */
export function overallScore(run: AuditRun): number {
  const total = run.pillars.reduce((sum, pillar) => sum + pillar.score, 0)
  return Math.round(total / run.pillars.length)
}

export function findPillar(
  run: AuditRun,
  id: AuditPillarId
): AuditPillar | undefined {
  return run.pillars.find((pillar) => pillar.id === id)
}

/** Findings counted against one pillar, worst first. */
export function findingsForPillar(
  id: AuditPillarId,
  findings = FINDINGS
): AuditFinding[] {
  return findings.filter((finding) => finding.pillar === id)
}

// Ordered by severity within each scope, because that is the order they are
// read in and sorting at render would hide the ranking from anyone editing
// this list.
export const FINDINGS: AuditFinding[] = [
  // ---- Things Blogger can change -----------------------------------------
  {
    id: "meta-q3-performance",
    pillar: "ai-search-visibility",
    title: "No meta description",
    detail:
      "That is the summary line under the title in a search result. With none saved, search engines write their own from the page — rarely the sentence you would have chosen.",
    severity: "serious",
    subject: "Q3 Content Performance: What Moved the Needle",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "q3-content-performance",
          title: "Q3 Content Performance: What Moved the Needle",
        },
      ],
      fix: "meta",
    },
  },

  {
    id: "meta-descriptions-post",
    pillar: "ai-search-visibility",
    title: "No meta description",
    detail:
      "That is the summary line under the title in a search result. With none saved, search engines write their own from the page — rarely the sentence you would have chosen.",
    severity: "serious",
    subject: "Writing Meta Descriptions People Actually Click",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "meta-descriptions-clicks",
          title: "Writing Meta Descriptions People Actually Click",
        },
      ],
      fix: "meta",
    },
  },

  {
    id: "meta-keyword-clustering",
    pillar: "ai-search-visibility",
    title: "No meta description",
    detail:
      "That is the summary line under the title in a search result. With none saved, search engines write their own from the page — rarely the sentence you would have chosen.",
    severity: "serious",
    subject: "Keyword Clustering Without Expensive Tools",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "keyword-clustering",
          title: "Keyword Clustering Without Expensive Tools",
        },
      ],
      fix: "meta",
    },
  },
  {
    id: "featured-image-off-size",
    pillar: "conversion-brand",
    title: "One post's share picture is the wrong shape",
    detail:
      "It is square, and everywhere it gets shared crops it to a wide rectangle, cutting off the top and bottom.",
    severity: "serious",
    subject: "Why Your Blog Traffic Plateaued",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "blog-traffic-plateau",
          title: "Why Your Blog Traffic Plateaued (And How to Fix It)",
        },
      ],
      fix: "image",
    },
  },
  {
    id: "keyword-cannibalisation",
    pillar: "ai-search-visibility",
    title: "Two posts chase the same search term",
    detail:
      "Both are written to win the same search, so they split the traffic and neither one ranks.",
    severity: "serious",
    subject: "Ten Internal Linking Mistakes · A Practical Framework",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      fix: "body",
      targets: [
        {
          postId: "internal-linking-mistakes",
          title: "Ten Internal Linking Mistakes That Quietly Cost You Rankings",
        },
        {
          postId: "content-refresh-framework",
          title: "A Practical Framework for Content Refreshes",
        },
      ],
    },
  },
  {
    id: "tags-fewer-longer",
    pillar: "ai-search-visibility",
    title: "No tags",
    detail:
      "Nothing files it, so it never turns up on a topic page a reader would browse.",
    severity: "warning",
    subject: "The Case for Fewer, Longer Posts",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "fewer-longer-posts",
          title: "The Case for Fewer, Longer Posts",
        },
      ],
      fix: "tags",
    },
  },

  {
    id: "tags-support-tickets",
    pillar: "ai-search-visibility",
    title: "No tags",
    detail:
      "Nothing files it, so it never turns up on a topic page a reader would browse.",
    severity: "warning",
    subject: "Turning Customer Support Tickets Into Blog Topics",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "support-tickets-to-topics",
          title: "Turning Customer Support Tickets Into Blog Topics",
        },
      ],
      fix: "tags",
    },
  },

  {
    id: "tags-time-to-publish",
    pillar: "ai-search-visibility",
    title: "No tags",
    detail:
      "Nothing files it, so it never turns up on a topic page a reader would browse.",
    severity: "warning",
    subject: "How We Cut Time-to-Publish From Three Weeks to Four Days",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "time-to-publish",
          title: "How We Cut Time-to-Publish From Three Weeks to Four Days",
        },
      ],
      fix: "tags",
    },
  },

  {
    id: "tags-intent-volume",
    pillar: "ai-search-visibility",
    title: "No tags",
    detail:
      "Nothing files it, so it never turns up on a topic page a reader would browse.",
    severity: "warning",
    subject: "Reader Intent Beats Search Volume Every Time",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
      targets: [
        {
          postId: "intent-beats-volume",
          title: "Reader Intent Beats Search Volume Every Time",
        },
      ],
      fix: "tags",
    },
  },

  {
    id: "no-social-links",
    pillar: "conversion-brand",
    title: "The site does not link to its social profiles",
    detail:
      "A reader who wants to follow the company has nowhere to go from the page, and search engines have no way to connect the site to those accounts.",
    severity: "warning",
    subject: "Every page",
    scope: {
      kind: "blogger",
      action: "Fix in Blogger",
      href: "/blogger",
    },
  },

  // ---- Things nothing here can change -------------------------------------
  {
    id: "tls-expiry",
    pillar: "security",
    title: "The security certificate expires in 12 days",
    detail: "Browsers will refuse to open the site on the morning it lapses.",
    severity: "critical",
    subject: "blog.forward.tools",
    scope: { kind: "external", owner: "Whoever holds the DNS" },
  },
  {
    id: "admins-without-2fa",
    pillar: "security",
    title: "Two admins sign in with a password only",
    detail:
      "Both can publish to the blog, and a password is the only thing in the way.",
    severity: "critical",
    subject: "HubSpot · Portal 24601",
    scope: { kind: "external", owner: "HubSpot portal admin" },
  },
  {
    id: "no-csp",
    pillar: "security",
    title: "Pages can run code from anywhere",
    detail:
      "One standard protection is switched off, so any script that reaches a page runs with full access to it.",
    severity: "serious",
    subject: "blog.forward.tools",
    scope: { kind: "external", owner: "Hosting" },
  },
  {
    id: "slow-lcp",
    pillar: "performance",
    title: "Pages take about four seconds to load on a phone",
    detail:
      "The main picture is sent full size and shrunk in the browser. It is a theme change, not a content one.",
    severity: "serious",
    subject: "Blog theme",
    scope: { kind: "external", owner: "Blog theme" },
  },
  {
    id: "robots-blocks-tags",
    pillar: "ai-readiness",
    title: "Search engines are blocked from the tag pages",
    detail:
      "Tagging posts will not help anyone find them while the pages doing the filing cannot be read.",
    severity: "warning",
    subject: "/robots.txt",
    scope: { kind: "external", owner: "Hosting" },
  },
]

/** Worst first. The order findings are read in, and counted in. */
export const SEVERITY_COUNT_ORDER: AuditSeverity[] = [
  "critical",
  "serious",
  "warning",
]

/**
 * A run as the history lists it — enough to say what happened, not enough to
 * redraw the page from. The findings themselves are not kept: this prototype
 * has one set of them (see FINDINGS), and pretending each past run has its own
 * would be inventing results nobody produced.
 */
export type PastRun = {
  id: string
  site: string
  ranMinutesAgo: number
  score: number
  findings: number
  /** What this run scored each category. */
  pillarScores?: Partial<Record<AuditPillarId, number>>
}

/**
 * A run as it is stored. The same facts as PastRun, but stamped with when it
 * actually happened rather than how long ago it was — a stored run has to stay
 * correct as time passes, and an offset would freeze at the moment it was
 * written. The offset is worked out at render (see lib/audit-store.ts).
 */
export type AuditRunRecord = {
  id: string
  site: string
  /** Epoch milliseconds. */
  ranAt: number
  score: number
  findings: number
  /**
   * What this run scored each category, when it scored them differently.
   *
   * Without this a run's row and its report disagree: the row shows the score
   * the run recorded and the report works one out from the current categories,
   * so an older, lower run opens as today's. Absent on a run that scored what
   * the current categories say.
   */
  pillarScores?: Partial<Record<AuditPillarId, number>>
}

/**
 * Everything before the latest run, most recent first.
 *
 * The first entry is the run LATEST_RUN compares itself against, so its score
 * and its count are the ones in `previousScore` and `previousFindings` — the
 * comparison on the page and the row in the history are the same fact.
 */
/**
 * Every run before this session, newest first.
 *
 * More than one company, because comparing against someone else is why the
 * competitor runs exist at all, and more than one run each, because a single
 * row is a fact and a column of them is a trend. Each carries its own category
 * scores so that opening an older run shows what that run found rather than
 * what today's would.
 */
export const SEEDED_RUNS: PastRun[] = [
  {
    id: "run-1042",
    site: "https://blog.forward.tools",
    ranMinutesAgo: 115,
    score: 75,
    findings: 11,
    pillarScores: {
      "tech-stack": 95,
      performance: 78,
      security: 58,
      "ai-readiness": 82,
      "ai-search-visibility": 64,
      "conversion-brand": 71,
    },
  },
  {
    id: "run-1041",
    site: "https://blog.forward.tools",
    ranMinutesAgo: 10080,
    score: 72,
    findings: 11,
    pillarScores: {
      "tech-stack": 95,
      performance: 74,
      security: 52,
      "ai-readiness": 80,
      "ai-search-visibility": 60,
      "conversion-brand": 68,
    },
  },
  {
    id: "run-1038",
    site: "https://blog.forward.tools",
    ranMinutesAgo: 21600,
    score: 69,
    findings: 11,
    pillarScores: {
      "tech-stack": 92,
      performance: 72,
      security: 50,
      "ai-readiness": 78,
      "ai-search-visibility": 58,
      "conversion-brand": 66,
    },
  },
  {
    id: "run-1031",
    site: "https://blog.forward.tools",
    ranMinutesAgo: 48960,
    score: 66,
    findings: 11,
    pillarScores: {
      "tech-stack": 90,
      performance: 70,
      security: 44,
      "ai-readiness": 74,
      "ai-search-visibility": 54,
      "conversion-brand": 62,
    },
  },
  {
    id: "run-1024",
    site: "https://blog.forward.tools",
    ranMinutesAgo: 80640,
    score: 62,
    findings: 11,
    pillarScores: {
      "tech-stack": 88,
      performance: 66,
      security: 40,
      "ai-readiness": 70,
      "ai-search-visibility": 50,
      "conversion-brand": 58,
    },
  },
  {
    id: "run-1040",
    site: "https://forwardcompany.ai",
    ranMinutesAgo: 4320,
    score: 80,
    findings: 11,
    pillarScores: {
      "tech-stack": 90,
      performance: 82,
      security: 88,
      "ai-readiness": 76,
      "ai-search-visibility": 70,
      "conversion-brand": 74,
    },
  },
  {
    id: "run-1030",
    site: "https://forwardcompany.ai",
    ranMinutesAgo: 43200,
    score: 76,
    findings: 11,
    pillarScores: {
      "tech-stack": 88,
      performance: 78,
      security: 84,
      "ai-readiness": 72,
      "ai-search-visibility": 66,
      "conversion-brand": 70,
    },
  },
  {
    id: "run-1039",
    site: "https://competitor.com",
    ranMinutesAgo: 7200,
    score: 63,
    findings: 11,
    pillarScores: {
      "tech-stack": 72,
      performance: 64,
      security: 70,
      "ai-readiness": 58,
      "ai-search-visibility": 52,
      "conversion-brand": 60,
    },
  },
  {
    id: "run-1027",
    site: "https://competitor.com",
    ranMinutesAgo: 57600,
    score: 59,
    findings: 11,
    pillarScores: {
      "tech-stack": 70,
      performance: 60,
      security: 68,
      "ai-readiness": 54,
      "ai-search-visibility": 48,
      "conversion-brand": 56,
    },
  },
  {
    id: "run-1035",
    site: "https://shop.northbound.co",
    ranMinutesAgo: 31680,
    score: 70,
    findings: 11,
    pillarScores: {
      "tech-stack": 84,
      performance: 70,
      security: 76,
      "ai-readiness": 66,
      "ai-search-visibility": 60,
      "conversion-brand": 64,
    },
  },
]

/** Whether this suite can do anything about it. The whole page hangs off this. */
export function isActionable(finding: AuditFinding): boolean {
  return finding.scope.kind !== "external"
}

export function actionableFindings(findings = FINDINGS): AuditFinding[] {
  return findings.filter(isActionable)
}

export function reportedFindings(findings = FINDINGS): AuditFinding[] {
  return findings.filter((finding) => !isActionable(finding))
}

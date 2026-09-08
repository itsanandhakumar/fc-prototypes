import {
  AlertTriangle,
  Bot,
  Gauge,
  Globe,
  Layers,
  OctagonAlert,
  PenLine,
  TrendingDown,
  TrendingUp,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react"

import { ScoreRing, TONE } from "@/components/audit/report-visuals"
import { StatusChip } from "@/components/audit/status-chip"
import { Card } from "@/components/ui/card"
import type { AuditFinding, AuditPillarId } from "@/lib/audit-data"
import { statusFor, type AuditReport } from "@/lib/audit-report"
import { cn } from "@/lib/utils"

// The report as a screen rather than a page.
//
// It is read by people who do not work on websites and did not ask for it, so
// it has to carry itself: a figure they can see the size of, a colour and a
// word for every state, a mark for every category, and each job as a thing on
// the page rather than a line in a list. Nothing is said twice — a problem is
// named once, inside the job that closes it.

/** A mark for each category, so a tile is recognisable before it is read. */
const ICON: Record<AuditPillarId, typeof Layers> = {
  "tech-stack": Layers,
  performance: Gauge,
  security: ShieldCheck,
  "ai-readiness": Bot,
  "ai-search-visibility": Search,
  "conversion-brand": Target,
}

/**
 * A mark for whoever owns a job.
 *
 * Two of these are products in this suite and the rest are somebody else, and
 * that difference is the most useful thing about the list: it says which rows
 * your team can act on and which have to be handed over. A word alone made
 * every row look the same.
 */
function ownerIcon(owner: string) {
  if (owner.includes("Blogger")) return PenLine
  if (owner.includes("Social Studio")) return Share2
  if (owner.includes("Hosting") || owner.includes("DNS")) return Server
  return Globe
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="shrink-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * The headline: one figure, out of one hundred, with the distance to go drawn
 * underneath it.
 *
 * A ring said the same thing, but a ring is a shape to interpret where a bar
 * is a length to see — and the number inside a ring can never be as large as
 * the number that leads the page. This is the only thing on the screen allowed
 * to be this size.
 */
function Headline({ report }: { report: AuditReport }) {
  const status = statusFor(report.score)
  const previous = report.history.at(-2)
  const change = previous ? report.score - previous : undefined
  const Trend = change && change < 0 ? TrendingDown : TrendingUp

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Overall health score
          </span>
          <StatusChip score={report.score} />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-5xl/none font-medium tabular-nums">
            {report.score}
          </span>
          <span className="text-lg text-muted-foreground">/ 100</span>

          {change ? (
            <span
              className={cn(
                "ml-auto flex items-center gap-1 text-xs font-medium",
                change > 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-destructive"
              )}
            >
              <Trend className="size-3.5 shrink-0" aria-hidden />
              {change > 0 ? "+" : ""}
              {change} since the last run
            </span>
          ) : null}
        </div>

        {/* The distance to a hundred, at the width of the card. */}
        <div
          className={cn(
            "h-2 w-full overflow-hidden rounded-full",
            status.level === "good" &&
              "bg-emerald-600/15 dark:bg-emerald-400/15",
            status.level === "warn" && "bg-amber-600/15 dark:bg-amber-400/15",
            status.level === "bad" && "bg-destructive/15"
          )}
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full",
              status.level === "good" && "bg-emerald-600 dark:bg-emerald-400",
              status.level === "warn" && "bg-amber-600 dark:bg-amber-400",
              status.level === "bad" && "bg-destructive"
            )}
            style={{ width: `${report.score}%` }}
          />
        </div>
      </div>

      <p className="max-w-prose min-w-0 border-t border-border px-(--card-spacing) pt-4 text-sm/relaxed text-muted-foreground">
        {report.verdict}
      </p>
    </Card>
  )
}

/**
 * The one thing that cannot wait, taken from the top of the job list rather
 * than from the findings — the list is already in the order the work should be
 * done, so its first entry is by definition the thing to say loudest.
 */
function Urgent({ report }: { report: AuditReport }) {
  const first = report.roadmap[0]
  const closed = report.findings.filter((finding) =>
    first?.fixes.includes(finding.id)
  )
  const worst = closed.find((finding) => finding.severity === "critical")
  if (!worst) {
    return null
  }

  return (
    <Card
      size="sm"
      className="gap-0 border border-destructive/25 bg-destructive/5 ring-0 dark:bg-destructive/10"
    >
      <div className="flex gap-3 px-(--card-spacing)">
        <OctagonAlert
          className="size-4 shrink-0 text-destructive"
          aria-hidden
        />
        <p className="min-w-0 text-sm/relaxed">
          <span className="font-medium">{worst.title}.</span>{" "}
          <span className="text-muted-foreground">{worst.detail}</span>
        </p>
      </div>
    </Card>
  )
}

/** The six categories as tiles: a mark, a question, a ring and a state. */
function Categories({ report }: { report: AuditReport }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {report.pillars.map((pillar) => {
        const Icon = ICON[pillar.id]

        return (
          <li key={pillar.id}>
            <Card size="sm" className="h-full gap-3">
              <div className="flex items-center gap-3 px-(--card-spacing)">
                <ScoreRing score={pillar.score} size={52} stroke={5} />

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{pillar.label}</span>
                  </span>
                  <StatusChip score={pillar.score} className="w-fit" />
                </div>
              </div>

              <div className="flex flex-col gap-1 px-(--card-spacing)">
                <span className="text-sm font-medium">{pillar.question}</span>
                <span className="text-xs/relaxed text-muted-foreground">
                  {pillar.summary}
                </span>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The jobs, as rows in one list rather than eight cards.
 *
 * Eight bordered boxes stacked made the section read as eight separate things
 * to consider; one container with rules between them reads as a single list to
 * work down, which is what it is. Each row is two lines: the job, then what it
 * closes and who owns it.
 */
/**
 * The problems a job closes, said once each.
 *
 * A job can close several findings that are the same problem on different
 * posts — four posts with no tags are four findings — and listing them
 * verbatim gives "No tags · No tags · No tags · No tags". The count says the
 * same thing in one reading.
 */
function summarise(findings: AuditFinding[]): string {
  const counts = new Map<string, number>()
  for (const finding of findings) {
    counts.set(finding.title, (counts.get(finding.title) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([title, count]) => (count > 1 ? `${title} (${count} posts)` : title))
    .join(" · ")
}

function Jobs({ report }: { report: AuditReport }) {
  return (
    <Card size="sm" className="gap-0 py-0">
      <ol className="flex flex-col divide-y divide-border">
        {report.roadmap.map((item) => {
          const closed = report.findings.filter((finding) =>
            item.fixes.includes(finding.id)
          )
          const urgent = closed.some(
            (finding) => finding.severity === "critical"
          )

          // The area this job belongs to, taken from what it fixes, so a row
          // carries the same mark and colour as its tile above.
          const pillar = report.pillars.find(
            (entry) => entry.id === closed[0]?.pillar
          )
          const AreaIcon = pillar ? ICON[pillar.id] : Layers
          const areaTone = pillar
            ? TONE[statusFor(pillar.score).level]
            : TONE.good
          const OwnerIcon = ownerIcon(item.owner)

          return (
            <li
              key={item.rank}
              className="flex min-w-0 items-start gap-3 px-(--card-spacing) py-3"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  areaTone.chip
                )}
              >
                <AreaIcon className="size-4" aria-hidden />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 text-sm font-medium">
                    {item.title}
                  </span>
                  {urgent ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                        TONE.bad.chip
                      )}
                    >
                      <OctagonAlert className="size-3 shrink-0" aria-hidden />
                      Urgent
                    </span>
                  ) : null}
                </div>

                {/* What it closes and whose it is, on one line — the row is a
                    line in a list, not an entry with its own sub-sections. */}
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs/relaxed text-muted-foreground">
                  <span className="min-w-0">{summarise(closed)}</span>
                  <span aria-hidden>—</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <OwnerIcon className="size-3.5 shrink-0" aria-hidden />
                    {item.owner}
                  </span>
                </span>
              </div>

              {/* Held right, where a column of them can be read on its own:
                  the four cheap jobs are visible without reading a word. */}
              {item.effort === "low" ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Zap className="size-3 shrink-0" aria-hidden />
                  Quick win
                </span>
              ) : (
                <span className="hidden shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline-flex">
                  {item.effort} effort
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

/**
 * The technical facts, as three labelled cells.
 *
 * These went through a heavy 2x2 of icon tiles, which gave trivia the same
 * weight as the work, and then a single run-on line, which was quiet but had
 * nothing to land on — three facts and two middots is a sentence, not a
 * summary. A label above each value is what makes it scannable: the eye finds
 * the heading it wants and reads one thing.
 */
function TechnicalDetail({ report }: { report: AuditReport }) {
  const missing = report.security.headers.filter((header) => !header.present)
  const present = report.security.headers.length - missing.length

  return (
    <Card size="sm">
      <dl className="grid gap-4 px-(--card-spacing) sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        <div className="flex min-w-0 flex-col gap-1 sm:pr-4">
          <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Built with
          </dt>
          <dd className="min-w-0 text-sm">
            {report.stack.items.map((item) => item.name).join(", ")}
          </dd>
        </div>

        <div className="flex min-w-0 flex-col gap-1 sm:px-4">
          <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            HTTPS
          </dt>
          <dd className="min-w-0 text-sm">
            {report.security.https ? "On" : "Off"}
          </dd>
        </div>

        <div className="flex min-w-0 flex-col gap-1 sm:pl-4">
          <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Security headers
          </dt>
          <dd className="flex min-w-0 flex-col gap-0.5 text-sm">
            <span>
              {present} of {report.security.headers.length}
            </span>
            {/* The one fact here that is not fine is the only part allowed to
                be loud, and it gets its own line rather than trailing off the
                end of a sentence. */}
            {missing.length ? (
              <span className="flex items-start gap-1 text-xs/relaxed text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                <span className="min-w-0">
                  {missing.map((header) => header.name).join(", ")} missing
                </span>
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

export function ReportView({ report }: { report: AuditReport }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Headline report={report} />
        <Urgent report={report} />
      </div>

      <Section title="How each area is doing">
        <Categories report={report} />
      </Section>

      <Section title="What to do, in order">
        <Jobs report={report} />
      </Section>

      {/* Above the conclusion rather than after it, so the last thing read is
          the point of the whole document. */}
      <Section title="Technical detail">
        <TechnicalDetail report={report} />
      </Section>

      <Section title={report.closing.title}>
        <Card size="sm">
          <p className="max-w-prose px-(--card-spacing) text-sm/relaxed text-muted-foreground">
            {report.closing.body}
          </p>
        </Card>
      </Section>
    </div>
  )
}

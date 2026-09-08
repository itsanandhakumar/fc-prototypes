"use client"

import Link from "next/link"
import { ArrowRight, PenLine, Share2 } from "lucide-react"

import { SeverityBadge } from "@/components/audit/severity-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  findPillar,
  type AuditFinding,
  type AuditRun,
  type AuditScope,
} from "@/lib/audit-data"

// The findings, split by whether this suite can act on them — which is the one
// division the page exists to draw. They were two cards once, stacked, each
// scrolling in half a screen; two short scroll boxes is less room than one tall
// one, and the reader paid for a comparison they were not making. Tabs give the
// whole card to whichever half is being worked, and the counts on the triggers
// keep the other half in view without keeping it on screen.
//
// Drawing both with one component is what keeps a critical finding looking
// equally critical whichever side of the split it lands on — the only thing
// that differs is the last column, and it differs because one side has
// somewhere to go and the other has someone to tell.

// The same marks the sidebar gives these two products, so a finding that says
// "Fix in Blogger" is wearing the thing it sends you to.
const PRODUCT_ICON = { blogger: PenLine, socials: Share2 }

/**
 * Where a fix actually happens.
 *
 * A post opens in the editor, and `fix` names the field to land on, so the
 * reader arrives at the thing the finding is about rather than at the front of
 * the blog with the finding to work out again.
 */
function fixHref(
  scope: Extract<AuditScope, { kind: "blogger" }>,
  findingId: string,
  at = 0
) {
  const postId = scope.targets?.[at]?.postId
  if (!postId) {
    return scope.href
  }
  const fix = scope.fix ? `&fix=${scope.fix}` : ""
  // The finding and the position travel with the link, so the editor can say
  // what to do, and say which of the affected posts this is.
  return `/editor?post=${encodeURIComponent(postId)}${fix}&from=${encodeURIComponent(findingId)}&at=${at}`
}

function FindingRow({
  finding,
  run,
}: {
  finding: AuditFinding
  run: AuditRun
}) {
  const { scope } = finding
  const Icon = scope.kind === "external" ? null : PRODUCT_ICON[scope.kind]
  const pillar = findPillar(run, finding.pillar)
  const targets = scope.kind === "blogger" ? (scope.targets ?? []) : []

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <span className="min-w-0 text-xs font-medium">{finding.title}</span>
        </div>
        <p className="text-xs text-muted-foreground">{finding.detail}</p>
        {/* The pillar it counts against, so a score of 58 up in the summary
            and the reasons for it down here are visibly the same subject. */}
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {pillar ? pillar.label : ""}
          {/* The subject unless the chips below are already naming the posts,
              which would be the row saying the same thing twice. */}
          {targets.length > 1 ? "" : `${pillar ? " · " : ""}${finding.subject}`}
        </span>

        {/* And the posts themselves, as separate things rather than more of
            the same sentence. Joined by middots they ran on from the category
            above them, and a reader could not tell where one title stopped and
            the next began. "Fix 3 posts" is one button for one job, but nobody
            should have to press it to find out which three. */}
        {targets.length > 1 ? (
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {/* "Affects" read as one change reaching three posts. It is the
                other way round: each of these needs its own, and the button
                walks through them one at a time. */}
            <span className="shrink-0 text-xs text-muted-foreground">
              Both need fixing together
            </span>
            {targets.map((target) => (
              <span
                key={target.postId}
                className="max-w-64 truncate rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs"
              >
                {target.title}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:pt-0.5">
        {scope.kind === "external" ? (
          // No button. There is nothing here to press: the fix is somewhere
          // this suite cannot reach, so the useful thing to say is who it
          // belongs to. A disabled button would imply it might light up.
          <span className="text-xs text-muted-foreground">{scope.owner}</span>
        ) : scope.kind === "blogger" && scope.targets?.length ? (
          // One button, however many posts it covers. Three buttons that all
          // led to the same field on different posts read as three copies of
          // the same control — the fix is one job, so it is one control, and
          // the posts are worked through inside the editor.
          <Button
            variant="outline"
            size="sm"
            // It navigates, so it is a link wearing a button — and Base UI has
            // to be told, or it holds the anchor to a native button's
            // semantics and warns that they are missing.
            nativeButton={false}
            render={<Link href={fixHref(scope, finding.id)} />}
          >
            {Icon ? <Icon /> : null}
            {scope.targets.length > 1
              ? `Fix ${scope.targets.length} posts`
              : scope.action}
            <ArrowRight />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={scope.href} />}
          >
            {Icon ? <Icon /> : null}
            {scope.action}
            <ArrowRight />
          </Button>
        )}
      </div>
    </li>
  )
}

/** One tab's worth of findings, or the reason there are none. */
function Findings({
  findings,
  run,
  empty,
}: {
  findings: AuditFinding[]
  run: AuditRun
  empty: string
}) {
  if (!findings.length) {
    return (
      <p className="rounded-md border border-dashed border-input px-2.5 py-3 text-xs text-muted-foreground">
        {empty}
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {findings.map((finding) => (
        <FindingRow key={finding.id} finding={finding} run={run} />
      ))}
    </ul>
  )
}

/** The label and its count, so the tab that is not open still says how much. */
function TabLabel({ children, count }: { children: string; count: number }) {
  return (
    <>
      {children}
      <span className="font-normal text-muted-foreground tabular-nums">
        {count}
      </span>
    </>
  )
}

export function FindingTabs({
  actionable,
  reported,
  run,
}: {
  /** What the suite can fix — the tab that opens first, because it is work. */
  actionable: AuditFinding[]
  /** What it can only report, for whoever owns that part of the site. */
  reported: AuditFinding[]
  /** The run these came from, for the pillar each one counts against. */
  run: AuditRun
}) {
  return (
    // The card takes all the slack the page has left and scrolls the open tab
    // inside it. min-h-0 on every link of that chain is what allows it — a flex
    // child will not shrink below its content without it, so the list would
    // push the card past the viewport instead of scrolling inside it.
    <Card className="min-h-0 flex-1 gap-0 py-0">
      <Tabs
        defaultValue="fix"
        className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        {/* The bar is the card's header: the triggers sit on the surface with
            a rule under them, so the tab that is open reads as the front of
            the box rather than as a control floating above a list. */}
        <div className="shrink-0 border-b border-border px-(--card-spacing) pt-3">
          {/* The rule under the bar is the baseline, and the indicator sits on
              it rather than floating between it and the label. Which means the
              trigger has to reach the rule: its own bottom padding makes the
              gap the wrapper's `pb` used to, and the offset lands the mark
              in the rule's own 1px band — the same weight as the rule, so the
              line does not thicken under the open tab, it only darkens. */}
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-5 p-0"
          >
            <TabsTrigger
              value="fix"
              className="h-auto flex-none rounded-none px-0 pt-0 pb-2.5 text-sm group-data-horizontal/tabs:after:bottom-px group-data-horizontal/tabs:after:h-px"
            >
              <TabLabel count={actionable.length}>Fix from here</TabLabel>
            </TabsTrigger>
            <TabsTrigger
              value="pass"
              className="h-auto flex-none rounded-none px-0 pt-0 pb-2.5 text-sm group-data-horizontal/tabs:after:bottom-px group-data-horizontal/tabs:after:h-px"
            >
              <TabLabel count={reported.length}>Pass on</TabLabel>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* No display utility on the panels: Base UI hides the closed one with
            the `hidden` attribute, and a `flex` class would outrank it. */}
        <TabsContent
          value="fix"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--card-spacing) py-(--card-spacing)"
        >
          <Findings
            findings={actionable}
            run={run}
            empty="Nothing the suite can act on. The run found no post to change."
          />
        </TabsContent>

        <TabsContent
          value="pass"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--card-spacing) py-(--card-spacing)"
        >
          <Findings
            findings={reported}
            run={run}
            empty="Nothing outside the suite to report."
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

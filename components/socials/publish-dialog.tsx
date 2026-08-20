"use client"

import * as React from "react"
import { Check, Loader2, Send } from "lucide-react"

import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import { ConnectStep } from "@/components/socials/connect-step"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Platform } from "@/lib/connectors"
import { formatCount } from "@/lib/social-insights"
import {
  permalinkFor,
  publishStepsFor,
  type PublishStep,
} from "@/lib/social-publish"
import { cn } from "@/lib/utils"

// Posting, one platform at a time.
//
// The dialog exists because publishing is the one thing here that cannot be
// taken back, so it has to be confirmed rather than clicked. It runs rather
// than spins because "Posting…" over a whole post hides the part that actually
// varies: each network is signed into separately, holds the copy to its own
// limit, and answers on its own. When something goes wrong it goes wrong for
// one of them, and a single spinner cannot say which.
//
// Nothing is sent. What is shown is read off the post — see lib/social-publish.ts.

type Phase = "review" | "running" | "done"

/** A platform's turn: its steps, and the link it will come back with. */
type Run = { platform: Platform; text: string; steps: PublishStep[] }

function StepLine({
  step,
  state,
}: {
  step: PublishStep
  state: "pending" | "running" | "done"
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex size-4 shrink-0 items-center justify-center pt-px">
        {state === "done" ? (
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : state === "running" ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span className="size-1.5 rounded-full bg-foreground/20" />
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "text-xs/relaxed",
            state === "pending" && "text-muted-foreground/60",
            state === "running" && "text-foreground",
            state === "done" && "text-muted-foreground"
          )}
        >
          {state === "done" ? step.done : step.running}
        </span>
        {/* The rule the copy was actually held to, kept on screen once the
            step that checked it is past. */}
        {state === "done" && step.detail ? (
          <span className="text-xs/relaxed text-muted-foreground/70">
            {step.detail}
          </span>
        ) : null}
      </span>
    </li>
  )
}

export function PublishDialog({
  open,
  onOpenChange,
  platforms,
  drafts,
  connectedIds,
  /** Commits the post to the store. Awaited, so the run only reports a post
      as out once it actually is. */
  onCommit,
  /** Where the writer goes once it is done. */
  onFinished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where the post is going, in registry order. */
  platforms: Platform[]
  /** The copy each platform is getting. */
  drafts: Record<string, string>
  connectedIds: string[]
  onCommit: () => Promise<void>
  onFinished: () => void
}) {
  const [phase, setPhase] = React.useState<Phase>("review")
  // Which platform is going out, and which of its steps is on screen.
  const [at, setAt] = React.useState({ platform: 0, step: 0 })

  const missing = platforms.filter(
    (platform) => !connectedIds.includes(platform.id)
  )
  const sending = platforms.filter((platform) =>
    connectedIds.includes(platform.id)
  )

  function runsFor(): Run[] {
    return sending.map((platform) => {
      const text = drafts[platform.id] ?? ""
      return { platform, text, steps: publishStepsFor(platform, text) }
    })
  }

  // What is going out, fixed at the moment Post was pressed. The review reads
  // the workspace live; a run in progress must not, or the post being described
  // stops being the post that was sent.
  const [sent, setSent] = React.useState<Run[]>([])
  const runs = phase === "review" ? runsFor() : sent

  // Held in a ref so that the timer below is not restarted by the workspace
  // re-rendering around it — a step that keeps being interrupted never finishes.
  const commit = React.useRef(onCommit)
  React.useEffect(() => {
    commit.current = onCommit
  })

  // The run itself. Each step holds the screen for as long as it says it does,
  // then hands over to the next — the next platform when a run ends, and the
  // store when the last one does.
  React.useEffect(() => {
    if (phase !== "running") {
      return
    }

    const run = sent[at.platform]
    const step = run?.steps[at.step]
    if (!step) {
      return
    }

    const timer = setTimeout(() => {
      if (at.step + 1 < run.steps.length) {
        setAt({ platform: at.platform, step: at.step + 1 })
      } else if (at.platform + 1 < sent.length) {
        setAt({ platform: at.platform + 1, step: 0 })
      } else {
        // Everything has been through. The post becomes published here rather
        // than at the first step, so a run that is still going has not yet
        // changed anything.
        void commit.current().then(() => setPhase("done"))
      }
    }, step.ms)

    return () => clearTimeout(timer)
  }, [phase, at, sent])

  function stateOf(platformIndex: number, stepIndex: number) {
    if (phase === "done" || platformIndex < at.platform) {
      return "done" as const
    }
    if (platformIndex > at.platform) {
      return "pending" as const
    }
    if (stepIndex < at.step) {
      return "done" as const
    }
    return stepIndex === at.step ? ("running" as const) : ("pending" as const)
  }

  // Nothing to post to, so there is nothing to confirm — the connection is the
  // only thing on the card until it is made.
  if (missing.length && phase === "review") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <ConnectStep
            missing={missing}
            connectedIds={connectedIds}
            action="post"
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      // A run cannot be interrupted: it is either something that happened or
      // something that did not, and closing halfway would leave the writer
      // unable to tell which. The close button goes with it.
      onOpenChange={(next) => {
        if (phase === "running") {
          return
        }
        if (phase === "done") {
          onFinished()
          return
        }
        onOpenChange(next)
      }}
    >
      <DialogContent
        showCloseButton={phase !== "running"}
        className="gap-4 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {phase === "done" ? "It is out" : "Post now"}
          </DialogTitle>
          <DialogDescription>
            {phase === "review"
              ? "Each network is posted to separately, and answers for itself. This cannot be undone."
              : phase === "running"
                ? "Going out now."
                : "Nothing was really sent — this is a prototype."}
          </DialogDescription>
        </DialogHeader>

        {runs.length ? (
          // `min-w-0` all the way down: a permalink is one long unbroken
          // string, and without it the card sizes itself to fit the link and
          // pushes out of the dialog rather than the link truncating.
          <ul className="flex min-w-0 flex-col gap-2">
            {runs.map((run, platformIndex) => {
              const limit = run.platform.characterLimit
              const done = phase === "done" || platformIndex < at.platform
              const current =
                phase === "running" && platformIndex === at.platform

              return (
                <li
                  key={run.platform.id}
                  className={cn(
                    "flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2.5 transition-colors",
                    current
                      ? "border-foreground/30 bg-muted/40"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <PlatformGlyph
                      platformId={run.platform.id}
                      style={platformTint(run.platform)}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs/relaxed font-medium">
                      {run.platform.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs/relaxed tabular-nums",
                        done
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {done
                        ? "Posted"
                        : phase === "review"
                          ? `${formatCount(run.text.length)} / ${formatCount(limit)}`
                          : current
                            ? "Posting…"
                            : "Waiting"}
                    </span>
                  </div>

                  {phase === "review" ? (
                    <div className="flex flex-col gap-0.5 text-xs/relaxed text-muted-foreground">
                      <span>As {run.platform.handle}</span>
                      <span className="line-clamp-2">{run.text}</span>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {run.steps.map((step, stepIndex) => (
                        <StepLine
                          key={step.id}
                          step={step}
                          state={stateOf(platformIndex, stepIndex)}
                        />
                      ))}
                    </ul>
                  )}

                  {/* Where it landed. Made up, but made up in the shape that
                      network's links take — see lib/social-publish.ts. */}
                  {done ? (
                    <span className="truncate text-xs/relaxed text-muted-foreground/80">
                      {permalinkFor(run.platform, run.text)}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}

        {phase === "review" ? (
          <p className="text-xs/relaxed text-muted-foreground">
            A mock-up. Nothing is sent.
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          {phase === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={!runs.length}
                onClick={() => {
                  setSent(runsFor())
                  setAt({ platform: 0, step: 0 })
                  setPhase("running")
                }}
              >
                <Send />
                Post to{" "}
                {runs.map((run) => run.platform.name).join(" and ") ||
                  "nowhere"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={phase === "running"}
              onClick={onFinished}
            >
              {phase === "running" ? "Posting…" : "Done"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

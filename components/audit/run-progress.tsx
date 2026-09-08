"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * What a run looks like while it happens.
 *
 * The same shape Blogger uses while a draft is written (see
 * components/editor/generation-log.tsx): one line per step, present tense
 * while it runs and past tense once it is done, paced so a reader can follow
 * it. A run that finishes in a blink with no account of itself leaves the
 * reader unsure anything happened at all.
 *
 * The steps are what a crawl would actually do, in the order it would do it,
 * and the pacing is the honest part of the fiction: nothing is being fetched
 * yet, so the timings are a stand-in for work rather than a measurement of it.
 */
export type RunStep = { id: string; running: string; done: string; ms: number }

export const RUN_STEPS: RunStep[] = [
  {
    id: "fetch",
    running: "Fetching the site",
    done: "Fetched the site",
    ms: 700,
  },
  {
    id: "pages",
    running: "Reading the pages",
    done: "Read the pages",
    ms: 900,
  },
  {
    id: "headers",
    running: "Checking certificates and headers",
    done: "Checked certificates and headers",
    ms: 700,
  },
  {
    id: "content",
    running: "Looking at what the writing says",
    done: "Looked at what the writing says",
    ms: 900,
  },
  {
    id: "score",
    running: "Scoring the six areas",
    done: "Scored the six areas",
    ms: 700,
  },
  {
    id: "report",
    running: "Writing the report",
    done: "Wrote the report",
    ms: 600,
  },
]

/** How long the whole run takes, so a caller can wait for it. */
export const RUN_DURATION = RUN_STEPS.reduce((total, s) => total + s.ms, 0)

export function RunProgress({ site }: { site: string }) {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (index >= RUN_STEPS.length) {
      return
    }
    const timer = setTimeout(() => setIndex((n) => n + 1), RUN_STEPS[index].ms)
    return () => clearTimeout(timer)
  }, [index])

  const done = Math.min(index, RUN_STEPS.length)
  const percent = Math.round((done / RUN_STEPS.length) * 100)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {site}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {percent}%
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Audit progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Steps arrive in order and stay, so the run reads as an account of
          what happened rather than a spinner that reveals nothing. */}
      <ul className="flex flex-col gap-1.5" aria-live="polite">
        {RUN_STEPS.map((step, position) => {
          if (position > index) {
            return null
          }
          const running = position === index

          return (
            <li key={step.id} className="flex items-start gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center pt-0.5">
                {running ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Check className="size-3.5 text-foreground" />
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 text-xs/relaxed",
                  running ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {running ? `${step.running}…` : step.done}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

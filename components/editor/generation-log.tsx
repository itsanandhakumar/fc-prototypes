"use client"

import * as React from "react"
import { Check, ChevronRight, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { GenerationStep } from "@/lib/generation-steps"
import { cn } from "@/lib/utils"

// The running commentary while a draft is being written: one line per step,
// each openable to show what that step actually looked at. Steps arrive in
// order and stay on screen afterwards, so the finished draft can always be
// traced back to what produced it.

function StepRow({
  step,
  state,
  open,
  onToggle,
}: {
  step: GenerationStep
  state: "pending" | "running" | "done"
  open: boolean
  onToggle: () => void
}) {
  if (state === "pending") {
    return null
  }

  const running = state === "running"

  return (
    <li className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="group/step flex w-full items-start gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span className="flex size-4 shrink-0 items-center justify-center pt-0.5">
          {running ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Check className="size-3.5 text-foreground" />
          )}
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 text-xs/relaxed",
            running ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {running ? `${step.running}…` : step.done}
        </span>

        <ChevronRight
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </button>

      {open ? (
        // Indented to the label, so the detail reads as belonging to the step.
        <div className="mt-1 mb-2 ml-[1.6rem] flex flex-col gap-2 border-l border-border pl-2.5">
          {step.lines.map((line, index) => (
            <p
              key={index}
              className="text-xs/relaxed break-words text-muted-foreground"
            >
              {line}
            </p>
          ))}

          {step.tags?.length ? (
            <div className="flex flex-col gap-1.5">
              {step.tagsLabel ? (
                <span className="text-xs/relaxed text-muted-foreground">
                  {step.tagsLabel}
                </span>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {step.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {step.gapTags?.length ? (
            <div className="flex flex-col gap-1.5">
              {step.gapTagsLabel ? (
                <span className="text-xs/relaxed text-muted-foreground">
                  {step.gapTagsLabel}
                </span>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {step.gapTags.map((tag) => (
                  <Badge key={tag} variant="destructive">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function GenerationLog({
  steps,
  onComplete,
  autoPlay = true,
}: {
  steps: GenerationStep[]
  onComplete?: () => void
  /** Off when the log is being read back after the fact. */
  autoPlay?: boolean
}) {
  const [index, setIndex] = React.useState(autoPlay ? 0 : steps.length)
  const [open, setOpen] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLOListElement>(null)
  const done = useLatest(onComplete)

  React.useEffect(() => {
    if (!autoPlay) {
      return
    }

    if (index >= steps.length) {
      done.current?.()
      return
    }

    const timer = setTimeout(
      () => setIndex((current) => current + 1),
      steps[index].ms
    )
    return () => clearTimeout(timer)
  }, [autoPlay, done, index, steps])

  // Keep the newest step in view without dragging the whole panel around.
  React.useEffect(() => {
    if (autoPlay && listRef.current) {
      listRef.current.lastElementChild?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      })
    }
  }, [autoPlay, index])

  return (
    <ol ref={listRef} className="flex flex-col">
      {steps.map((step, position) => (
        <StepRow
          key={step.id}
          step={step}
          state={
            position < index
              ? "done"
              : position === index
                ? "running"
                : "pending"
          }
          open={open === step.id}
          onToggle={() =>
            setOpen((current) => (current === step.id ? null : step.id))
          }
        />
      ))}
    </ol>
  )
}

// The callback changes identity on every parent render; the effect must not
// restart the timer because of that.
function useLatest<T>(value: T) {
  const ref = React.useRef(value)
  React.useEffect(() => {
    ref.current = value
  })
  return ref
}

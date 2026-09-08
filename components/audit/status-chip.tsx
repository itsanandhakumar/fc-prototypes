import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react"

import { TONE } from "@/components/audit/report-visuals"
import { statusFor } from "@/lib/audit-report"
import { cn } from "@/lib/utils"

const STATUS_ICON = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: OctagonAlert,
} as const

/**
 * The state as a chip: a colour, a shape and a word, never one alone.
 *
 * Shared by the report and the dashboard so a score means the same thing, and
 * looks the same, wherever it is read.
 */
export function StatusChip({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  const status = statusFor(score)
  const Icon = STATUS_ICON[status.level]

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE[status.level].chip,
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {status.label}
    </span>
  )
}

/** A meter in the state's own colour. Text never wears it; the bar does. */
export function StatusBar({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  const level = statusFor(score).level

  return (
    <span
      className={cn(
        "block h-1.5 overflow-hidden rounded-full",
        level === "good" && "bg-emerald-600/15 dark:bg-emerald-400/15",
        level === "warn" && "bg-amber-600/15 dark:bg-amber-400/15",
        level === "bad" && "bg-destructive/15",
        className
      )}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          level === "good" && "bg-emerald-600 dark:bg-emerald-400",
          level === "warn" && "bg-amber-600 dark:bg-amber-400",
          level === "bad" && "bg-destructive"
        )}
        style={{ width: `${score}%` }}
      />
    </span>
  )
}

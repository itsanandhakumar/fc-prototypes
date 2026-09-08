import { statusFor } from "@/lib/audit-report"
import { cn } from "@/lib/utils"

// The mark each category tile carries. A ring says "out of 100" without the
// words — the gap left in it is the distance still to go, which is the thing a
// number alone cannot show. The overall score gets a bar instead: it leads the
// page, and a figure that leads has to be readable at a glance from across a
// desk, which a number inside a ring never is.

/** Ring, fill and text for each state. Colour never travels without a word. */
export const TONE = {
  good: {
    ring: "text-emerald-600 dark:text-emerald-400",
    chip: "border-emerald-600/35 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  warn: {
    ring: "text-amber-600 dark:text-amber-400",
    chip: "border-amber-600/35 bg-amber-600/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
  },
  bad: {
    ring: "text-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
} as const

export function ScoreRing({
  score,
  size = 112,
  stroke = 9,
  showLabel = false,
  className,
}: {
  score: number
  size?: number
  stroke?: number
  /** Whether the state's word sits under the figure, inside the ring. */
  showLabel?: boolean
  className?: string
}) {
  const status = statusFor(score)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score ${score} out of 100 — ${status.label}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={cn("size-full -rotate-90", TONE[status.level].ring)}
        aria-hidden
      >
        {/* Track and fill are steps of one hue, so the ring reads as a
            proportion of the same thing rather than two colours meeting. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="opacity-15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>

      {/* Text wears text tokens, never the mark's colour. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-medium tabular-nums"
          style={{ fontSize: size / 3.2, lineHeight: 1 }}
        >
          {score}
        </span>
        {showLabel ? (
          <span className="text-xs text-muted-foreground">{status.label}</span>
        ) : null}
      </div>
    </div>
  )
}

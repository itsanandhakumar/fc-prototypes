import { cn } from "@/lib/utils"

// Posts per day, one bar per day. Bars rather than a line because the series is
// a count of discrete events — a line would interpolate between days, so a day
// with nothing on it reads as a fall rather than as a gap.
//
// Stretched with preserveAspectRatio="none", which is safe here only because
// everything drawn is an axis-aligned rectangle with no stroke and no corner
// radius: those survive a non-uniform scale, where a stroke or a circle would
// come out distorted. Height is rendered 1:1 with the viewBox, so only the
// widths stretch and every bar's height stays true to its value.

const VIEW_WIDTH = 100
// Shorter than the value beside it deserves to be — the bars are context for
// the streak, not the headline. They sit on the figure's line now rather than
// under it, so this is roughly cap height: any taller and the row grows to fit
// the chart instead of the number.
const VIEW_HEIGHT = 18
const GAP = 1.5
/** A day with nothing posted still gets a mark, so the gap is visibly a day. */
const EMPTY_HEIGHT = 2
const MIN_BAR = 3

export function ActivityBars({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  if (!values.length) {
    return null
  }

  const top = Math.max(...values, 1)
  const width = (VIEW_WIDTH - GAP * (values.length - 1)) / values.length

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      width="100%"
      height={VIEW_HEIGHT}
      // The figure it illustrates is stated beside it, so announcing this
      // again would only repeat the tile.
      aria-hidden
      className={cn("text-primary", className)}
    >
      {values.map((value, index) => {
        const height =
          value === 0
            ? EMPTY_HEIGHT
            : Math.max(MIN_BAR, (value / top) * VIEW_HEIGHT)

        return (
          <rect
            key={index}
            x={index * (width + GAP)}
            y={VIEW_HEIGHT - height}
            width={width}
            height={height}
            fill="currentColor"
            opacity={value === 0 ? 0.15 : 1}
          />
        )
      })}
    </svg>
  )
}

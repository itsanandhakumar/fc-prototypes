import * as React from "react"
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react"

import { ActivityBars } from "@/components/socials/activity-bars"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function TileBody({
  label,
  value,
  trend,
  change,
  interactive,
}: {
  label: string
  value: string
  trend?: number[]
  change?: { percent: number | null; caption: string }
  interactive: boolean
}) {
  const percent = change?.percent
  const rising = percent !== null && percent !== undefined && percent >= 0
  const Arrow = rising ? TrendingUp : TrendingDown

  return (
    <Card
      size="sm"
      className={
        interactive
          ? "h-full w-full gap-2 transition-colors hover:bg-muted/40"
          : "h-full w-full gap-2"
      }
    >
      <span className="flex items-center gap-1 px-(--card-spacing) text-xs/relaxed text-muted-foreground">
        {label}
        {interactive ? (
          <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        ) : null}
      </span>

      {/* Proportional figures, not tabular: at display size the tabular
          variant's even advances read as gaps. */}
      <span className="px-(--card-spacing) text-lg font-medium">{value}</span>

      {trend ? (
        <div className="px-(--card-spacing)">
          <ActivityBars values={trend} />
        </div>
      ) : null}

      {change ? (
        <div className="flex items-center gap-1.5 px-(--card-spacing) text-xs/relaxed text-muted-foreground">
          {percent === null || percent === undefined ? (
            // No baseline. Saying "+100%" against nothing would be a fiction.
            <span>{change.caption}</span>
          ) : (
            <>
              {/* The direction is carried by the icon and the sign, never by
                  colour alone — and there is no success token to reach for. */}
              <Arrow className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">
                {percent > 0 ? "+" : ""}
                {percent}%
              </span>
              <span>{change.caption}</span>
            </>
          )}
        </div>
      ) : null}
    </Card>
  )
}

export function StatTile({
  label,
  value,
  trend,
  change,
  detail,
}: {
  label: string
  /** Already formatted — the tile does not know whether it is counting posts
      or impressions. */
  value: string
  /** Twelve days of activity, when the figure has a shape worth showing. */
  trend?: number[]
  /** Null percent means there was no baseline to compare against. */
  change?: { percent: number | null; caption: string }
  /** What opens when the tile is clicked. A tile without one is not a button —
      every figure here is a sum, so there is always a breakdown worth having,
      but the tile should not pretend to be pressable if it has nothing behind
      it. */
  detail?: { title: string; description: string; content: React.ReactNode }
}) {
  const body = (
    <TileBody
      label={label}
      value={value}
      trend={trend}
      change={change}
      interactive={Boolean(detail)}
    />
  )

  if (!detail) {
    return <div className="min-w-52 flex-1">{body}</div>
  }

  return (
    <Dialog>
      {/* A real button rather than a clickable card, so it is reachable by
          keyboard and announced as a control. */}
      <DialogTrigger
        render={
          <button
            type="button"
            className="min-w-52 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        }
      >
        {body}
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{detail.title}</DialogTitle>
          <DialogDescription>{detail.description}</DialogDescription>
        </DialogHeader>

        {detail.content}
      </DialogContent>
    </Dialog>
  )
}

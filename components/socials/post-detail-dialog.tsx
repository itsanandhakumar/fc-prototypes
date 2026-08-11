"use client"

import * as React from "react"

import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { SocialPreview } from "@/components/editor/social-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { findPlatform, platformNames } from "@/lib/connectors"
import type { SocialPost, SocialVariant } from "@/lib/social-data"
import { formatCount } from "@/lib/social-insights"
import { formatLeadTime, formatRelativeTime } from "@/lib/time"

// What the post actually said, dressed in each platform's own chrome, with
// that platform's figures beside it. A row in the list can say how a post did;
// only this can say what went out.

const FIGURES = [
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "reposts", label: "Reposts" },
] as const

function timing(post: SocialPost): string {
  if (post.status === "Scheduled" && post.scheduledInMinutes !== undefined) {
    return `Goes out ${formatLeadTime(post.scheduledInMinutes)}`
  }
  if (post.status === "Published") {
    return `Published ${formatRelativeTime(post.updatedMinutesAgo)}`
  }
  return `Last edited ${formatRelativeTime(post.updatedMinutesAgo)}`
}

function Figures({ variant }: { variant: SocialVariant }) {
  const metrics = variant.metrics

  if (!metrics) {
    return (
      <p className="text-xs/relaxed text-muted-foreground">
        Nothing to report yet — this one has not gone out.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {FIGURES.map(({ key, label }) => (
        <div
          key={key}
          className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 text-xs/relaxed last:border-b-0 last:pb-0"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">
            {formatCount(metrics[key])}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PostDetailDialog({
  post,
  variants,
  open,
  onOpenChange,
}: {
  post: SocialPost
  /** Already in registry order, so the tabs match the row's glyphs. */
  variants: SocialVariant[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [platformId, setPlatformId] = React.useState(
    variants[0]?.platformId ?? ""
  )

  const active =
    variants.find((variant) => variant.platformId === platformId) ?? variants[0]
  const platform = active ? findPlatform(active.platformId) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{post.name}</DialogTitle>
          <DialogDescription>{timing(post)}</DialogDescription>
        </DialogHeader>

        {/* One tab per platform, the same hand-rolled strip the composer uses.
            A post that only went one place needs no choosing. */}
        {variants.length > 1 ? (
          <div
            role="group"
            aria-label="Platform"
            className="flex flex-wrap items-center gap-0.5 self-start rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
          >
            {variants.map((variant) => (
              <Button
                key={variant.platformId}
                type="button"
                variant={
                  variant.platformId === active?.platformId
                    ? "secondary"
                    : "ghost"
                }
                aria-pressed={variant.platformId === active?.platformId}
                onClick={() => setPlatformId(variant.platformId)}
              >
                <PlatformGlyph platformId={variant.platformId} />
                {platformNames([variant.platformId])[0]}
              </Button>
            ))}
          </div>
        ) : null}

        {active && platform ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <SocialPreview
                platform={platform}
                text={active.text}
                title={post.name}
                attachments={[]}
                // Present only once the post has been out; a draft or a
                // scheduled post renders with no engagement at all.
                metrics={active.metrics}
              />
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-52">
              {active.failure ? (
                <Badge variant="destructive" className="self-start">
                  {active.failure}
                </Badge>
              ) : null}
              <Figures variant={active} />
            </div>
          </div>
        ) : null}

        <p className="text-xs/relaxed text-muted-foreground">
          A mock-up of how the post appears on {platform?.name ?? "the platform"}.
          Nothing here is live.
        </p>
      </DialogContent>
    </Dialog>
  )
}

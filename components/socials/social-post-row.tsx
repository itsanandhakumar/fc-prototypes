"use client"

import * as React from "react"
import Link from "next/link"
import { RotateCw } from "lucide-react"

import { retryPost } from "@/app/socials-actions"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { PostDetailDialog } from "@/components/socials/post-detail-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { orderPlatformIds, platformNames } from "@/lib/connectors"
import type { SocialPost, SocialVariant } from "@/lib/social-data"
import { formatCount } from "@/lib/social-insights"
import { editorHrefFor, isEditable, STATUS_TONE } from "@/lib/social-status"
import { formatLeadTime, formatRelativeTime } from "@/lib/time"

// One row of the list. A post is one idea sent to several platforms, so the
// row leads with where it went and what it said, and the per-platform numbers
// unfold underneath rather than living somewhere else.

function orderedVariants(post: SocialPost): SocialVariant[] {
  const order = orderPlatformIds(post.variants.map((v) => v.platformId))
  return order.flatMap((id) => post.variants.filter((v) => v.platformId === id))
}

/** When a post is, in its own terms: out, due, or last touched. */
function timing(post: SocialPost): string {
  if (post.status === "Scheduled" && post.scheduledInMinutes !== undefined) {
    return formatLeadTime(post.scheduledInMinutes)
  }
  return formatRelativeTime(post.updatedMinutesAgo)
}

function totalsOf(post: SocialPost) {
  return post.variants.reduce(
    (sum, variant) => {
      const metrics = variant.metrics
      if (!metrics) {
        return sum
      }
      return {
        impressions: sum.impressions + metrics.impressions,
        likes: sum.likes + metrics.likes,
        comments: sum.comments + metrics.comments,
      }
    },
    { impressions: 0, likes: 0, comments: 0 }
  )
}

// The same colours the calendar gives these states, from the same place. The
// list and the month are two views of one set of posts; a status that reads
// green in one and grey in the other is two statuses to whoever is reading.
function StatusBadge({ status }: { status: SocialPost["status"] }) {
  return (
    <Badge variant="outline" className={STATUS_TONE[status]}>
      {status}
    </Badge>
  )
}

/** The row is a link or a button depending on where the post should open, and
    everything inside it is the same either way. */
function RowShell({
  post,
  onOpen,
  children,
}: {
  post: SocialPost
  onOpen: () => void
  children: React.ReactNode
}) {
  const shape =
    "flex w-full flex-col gap-1.5 px-(--card-spacing) py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"

  if (isEditable(post.status)) {
    return (
      <Link href={editorHrefFor(post.id)} className={shape}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onOpen} className={shape}>
      {children}
    </button>
  )
}

export function SocialPostRow({ post }: { post: SocialPost }) {
  const [open, setOpen] = React.useState(false)
  const [retrying, startRetry] = React.useTransition()

  const variants = orderedVariants(post)
  const totals = totalsOf(post)
  const failed = variants.find((variant) => variant.failure)
  // Whatever went out, whether or not all of it did. A post rejected by one
  // platform still ran on the others, and those figures are the row's to show —
  // the card behind it shows the same ones, and the two views of a post are
  // meant to agree.
  const reported = variants.some((variant) => variant.metrics)
  // Every variant carries the same idea, so one of them stands for the post.
  const excerpt = variants[0]?.text.split(/\n\s*\n/)[0] ?? ""

  return (
    <li>
      {/* The row itself opens the post — into the workspace while it is still
          unfinished, into the preview once it is done. Retry sits outside this
          control: a control inside a control is not a thing a browser will let
          you click. */}
      <RowShell post={post} onOpen={() => setOpen(true)}>
        {/* Fixed columns rather than a right-aligned group: with the status and
            the time free to size themselves, "in 3 hours" and "8h ago" push the
            badge to a different place on every row. */}
        <div className="flex w-full items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="flex shrink-0 items-center gap-1.5 text-muted-foreground"
              title={platformNames(variants.map((v) => v.platformId)).join(
                ", "
              )}
            >
              {variants.map((variant) => (
                <PlatformGlyph
                  key={variant.platformId}
                  platformId={variant.platformId}
                  className="size-3.5"
                />
              ))}
            </span>
            <span className="truncate text-xs/relaxed font-medium">
              {post.name}
            </span>
          </div>

          <span className="flex w-24 shrink-0 justify-center">
            <StatusBadge status={post.status} />
          </span>

          <span className="w-24 shrink-0 text-right text-xs/relaxed whitespace-nowrap text-muted-foreground tabular-nums">
            {timing(post)}
          </span>
        </div>

        <p className="line-clamp-1 w-full text-xs/relaxed text-muted-foreground">
          {excerpt}
        </p>

        {reported ? (
          <span className="text-xs/relaxed text-muted-foreground tabular-nums">
            {formatCount(totals.impressions)} impressions ·{" "}
            {formatCount(totals.likes)} likes · {formatCount(totals.comments)}{" "}
            comments
          </span>
        ) : null}
      </RowShell>

      {failed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing) pb-3">
          <span className="text-xs/relaxed text-destructive">
            {failed.failure}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retrying}
            onClick={() => startRetry(async () => retryPost(post.id))}
          >
            <RotateCw />
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : null}

      <PostDetailDialog
        post={post}
        variants={variants}
        open={open}
        onOpenChange={setOpen}
      />
    </li>
  )
}

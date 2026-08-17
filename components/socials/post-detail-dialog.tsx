"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, RotateCw } from "lucide-react"

import { retryPost } from "@/app/socials-actions"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { SocialPreview } from "@/components/editor/social-preview"
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
import { editorHrefFor } from "@/lib/social-status"
import { formatLeadTime, formatRelativeTime } from "@/lib/time"
import { cn } from "@/lib/utils"

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
        {/* Two different reasons for an empty column, and they are not the
            same news. One has not gone out yet; the other was turned away,
            which the block above this one has just said in red — "nothing to
            report yet" under a rejection reads as though it might still be
            coming. */}
        {variant.failure
          ? "Not posted, so there is nothing to measure."
          : "Nothing to report yet — this one has not gone out."}
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
  // The platform that turned it down opens first. A rejection is the reason
  // this post is worth looking at, and landing on a sibling that has nothing to
  // report leaves the reader to find it by clicking around the tabs.
  const [platformId, setPlatformId] = React.useState(
    () =>
      (variants.find((variant) => variant.failure) ?? variants[0])
        ?.platformId ?? ""
  )
  const [retrying, startRetry] = React.useTransition()

  const active =
    variants.find((variant) => variant.platformId === platformId) ?? variants[0]
  const platform = active ? findPlatform(active.platformId) : undefined
  const failed = post.status === "Failed"
  // Which platforms turned it down, and whether that was all of them. On a post
  // where one went out and one did not, "send it again" would read as sending
  // the whole thing a second time — and the half that worked does not want
  // posting twice. Naming the platform says what will actually be sent.
  const rejectedBy = platformNames(
    variants.flatMap((variant) => (variant.failure ? [variant.platformId] : []))
  )
  const partly = rejectedBy.length > 0 && rejectedBy.length < variants.length

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
                {/* Which tab the trouble is on, so a post that failed says so
                    from whichever tab you happen to be reading. */}
                {variant.failure ? (
                  <span
                    aria-label="rejected"
                    className="size-1.5 shrink-0 rounded-full bg-destructive"
                  />
                ) : null}
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

            <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 sm:w-52">
              {/* A block, not a badge. A badge is a pill — one line, sized to
                  its content and never wrapping — and a rejection is a
                  sentence: "LinkedIn rejected the post — duplicate content"
                  ran straight out of this column and off the card. The wash
                  is the same destructive tint the badge wore; it is only the
                  shape that was wrong. */}
              {active.failure ? (
                <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs/relaxed text-destructive dark:bg-destructive/20">
                  {active.failure}
                </p>
              ) : null}
              <Figures variant={active} />
            </div>
          </div>
        ) : null}

        <p className="text-xs/relaxed text-muted-foreground">
          A mock-up of how the post appears on{" "}
          {platform?.name ?? "the platform"}. Nothing here is live.
        </p>

        {/* A rejection is a thing that happened, not a thing to read about. Two
            ways on from it, because there are two kinds of rejection: a rate
            limit clears on its own and wants sending again, while a duplicate
            or a disallowed link is about the copy and wants changing first.
            Nothing here can tell which is which — the person reading the reason
            can, so both are offered rather than one guessed at. */}
        {failed ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <p className="mr-auto text-xs/relaxed text-muted-foreground">
              {partly
                ? `Only ${rejectedBy.join(" and ")} needs sending — the rest went out.`
                : "Send it again, or change what was rejected first."}
            </p>

            <Button
              variant="outline"
              size="lg"
              // It navigates, so it is a link wearing a button — and Base UI
              // has to be told, or it holds the anchor to a native button's
              // semantics and warns that they are missing.
              nativeButton={false}
              render={<Link href={editorHrefFor(post.id)} />}
            >
              <Pencil />
              Edit the post
            </Button>

            <Button
              type="button"
              size="lg"
              disabled={retrying}
              onClick={() =>
                startRetry(async () => {
                  await retryPost(post.id)
                  // It is not a failed post any more, so this is not the card
                  // for it any more.
                  onOpenChange(false)
                })
              }
            >
              <RotateCw className={cn(retrying && "animate-spin")} />
              {retrying
                ? "Sending…"
                : partly
                  ? `Send to ${rejectedBy.join(" and ")} again`
                  : "Send it again"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

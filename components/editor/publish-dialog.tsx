"use client"

import * as React from "react"
import { Send } from "lucide-react"

import { publishToHubSpot } from "@/app/connector-actions"
import { ConnectorList } from "@/components/connector-list"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HUBSPOT } from "@/lib/connectors"
import type { DraftBrief } from "@/lib/draft-generator"
import { slugify } from "@/lib/slug"

// Publishing a blog post is a confirmation, not a composition: there is one
// destination, and the text going to it is the post already on screen. So this
// shows what is about to happen and gets out of the way. Writing a post *about*
// the post — shorter, per network — is Social Studio's job, not this one's.

// The value wraps rather than truncates. An address is a long unbroken token
// whose tail — the slug — is the part worth reading, so an ellipsis would hide
// exactly what the writer is checking. `wrap-anywhere` also drops the value's
// min-content width to a single character, which is what keeps the box inside
// the dialog: DialogContent is a grid, and a grid item's `min-width: auto`
// resolves to its min-content width, so one unbreakable string is enough to
// push the whole track past the dialog's max width.
function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium wrap-anywhere">
        {children}
      </span>
    </div>
  )
}

export function PublishDialog({
  postId,
  title,
  body,
  brief,
  connected,
  disabled,
}: {
  postId: string
  title: string
  body: string
  /** Stored with the post on publish, so the run survives publishing. */
  brief: DraftBrief
  /** Whether the HubSpot blog is connected. */
  connected: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [publishing, startPublishing] = React.useTransition()

  // Roughly what the reader is in for. The store counts nothing, so this is
  // the only place either figure is worked out.
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / 220))

  return (
    <>
      {/* Wearing HubSpot's own colour and mark: the post leaves Forward here,
          and the button that hands it over says where it is going. */}
      <Button
        type="button"
        size="lg"
        className={HUBSPOT.button}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PlatformGlyph platformId={HUBSPOT.id} />
        Publish to {HUBSPOT.name}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {connected ? (
            <div className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Publish to {HUBSPOT.name}</DialogTitle>
                <DialogDescription>
                  The post goes live on your {HUBSPOT.name} blog. You can keep
                  editing it afterwards.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <PlatformGlyph
                    platformId={HUBSPOT.id}
                    className="size-4 text-muted-foreground"
                  />
                  <span className="min-w-0 truncate text-xs font-medium">
                    {HUBSPOT.account}
                  </span>
                </div>

                <Detail label="Title">{title || "Untitled post"}</Detail>
                <Detail label="Address">
                  {HUBSPOT.domain}/{slugify(title || "Untitled post")}
                </Detail>
                <Detail label="Length">
                  {words.toLocaleString()} words · {minutes} min read
                </Detail>
              </div>

              <p className="text-xs text-muted-foreground">
                A mock-up. Nothing is sent.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={HUBSPOT.button}
                  disabled={publishing}
                  onClick={() =>
                    startPublishing(async () =>
                      publishToHubSpot({ postId, title, body, brief })
                    )
                  }
                >
                  <Send />
                  {publishing ? "Publishing…" : `Publish to ${HUBSPOT.name}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Connect {HUBSPOT.name} to publish</DialogTitle>
                <DialogDescription>
                  Publishing needs a connected blog. Connections also live in
                  Settings.
                </DialogDescription>
              </DialogHeader>

              <ConnectorList connectedIds={[]} only="blog" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

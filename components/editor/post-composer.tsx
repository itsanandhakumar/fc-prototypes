"use client"

import * as React from "react"
import { Check, Send } from "lucide-react"

import { postToPlatforms } from "@/app/connector-actions"
import { ConnectorList } from "@/components/connector-list"
import {
  AttachmentDropzone,
  type Attachment,
} from "@/components/editor/attachment-dropzone"
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
import type { Platform } from "@/lib/connectors"
import type { DraftBrief } from "@/lib/draft-generator"
import { composeSocialPost } from "@/lib/social-draft"
import { cn } from "@/lib/utils"

type Attachments = Record<string, Attachment[]>

export function PostComposer({
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
  /** Stored with the post on publish, so the run survives posting. */
  brief: DraftBrief
  connected: Platform[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  // Where it goes, and which of those copies is on screen. Cross-posting is
  // the common case, so everything connected starts selected.
  const [selectedIds, setSelectedIds] = React.useState(
    connected.map((item) => item.id)
  )
  const [platformId, setPlatformId] = React.useState(connected[0]?.id ?? "")
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [attachments, setAttachments] = React.useState<Attachments>({})
  const [posting, startPosting] = React.useTransition()

  const selected = connected.filter((item) => selectedIds.includes(item.id))
  const platform =
    selected.find((item) => item.id === platformId) ?? selected[0]

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]

      // Keep the editor on something that is still going out.
      if (next.length && !next.includes(platformId)) {
        setPlatformId(next[0])
      }
      return next
    })
  }

  function copyFor(target: Platform) {
    return drafts[target.id] ?? composeSocialPost(target, { title, body })
  }

  // Every selected platform has to fit its own limit before anything sends.
  const tooLong = selected.filter(
    (item) => copyFor(item).length > item.characterLimit
  )

  // Each platform gets its own copy, written to its own limit, the first time
  // it is opened.
  const text = platform ? copyFor(platform) : ""
  const remaining = platform ? platform.characterLimit - text.length : 0
  const overLimit = remaining < 0

  const destinations =
    selected.length === 0
      ? ""
      : selected.length === 1
        ? selected[0].name
        : selected.length === 2
          ? `${selected[0].name} & ${selected[1].name}`
          : `${selected.length} platforms`

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Post
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
            connected.length === 0 ? "sm:max-w-md" : "sm:max-w-4xl"
          )}
        >
          {connected.length === 0 ? (
            <div className="flex flex-col gap-4 p-4">
              <DialogHeader>
                <DialogTitle>Connect somewhere to post</DialogTitle>
                <DialogDescription>
                  Posting needs at least one connected platform. Connections
                  also live in Settings.
                </DialogDescription>
              </DialogHeader>

              <ConnectorList connectedIds={[]} />
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-col gap-0 border-b px-4 py-3 pr-12">
                <DialogHeader>
                  <DialogTitle>Create post</DialogTitle>
                  <DialogDescription>
                    Step 1 — tick where this goes. Step 2 — edit each
                    platform&rsquo;s copy on its own tab.
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Step 1. Checkboxes, not pills: ticking one is choosing a
                  destination, which is a different act from the tabs below. */}
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30 px-4 py-2.5">
                <span className="text-xs font-medium">Post to</span>

                <div
                  role="group"
                  aria-label="Post to"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {connected.map((item) => {
                    const included = selectedIds.includes(item.id)
                    return (
                      <Button
                        key={item.id}
                        type="button"
                        size="sm"
                        variant={included ? "secondary" : "outline"}
                        aria-pressed={included}
                        onClick={() => toggle(item.id)}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-[1.1em] items-center justify-center rounded-[0.25em] border transition-colors",
                            included
                              ? "border-foreground bg-foreground text-background"
                              : "border-input"
                          )}
                        >
                          {included ? <Check className="size-[0.9em]" /> : null}
                        </span>
                        {item.name}
                      </Button>
                    )
                  })}
                </div>

                <span className="ml-auto text-xs text-muted-foreground">
                  {selected.length} of {connected.length} selected
                </span>
              </div>

              {platform ? (
                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                  {/* Left: what is being posted. */}
                  <div className="flex min-h-0 flex-1 flex-col">
                    {/* Step 2. A tab strip, so switching copy never reads as
                        selecting a destination. */}
                    {selected.length > 1 ? (
                      <div className="flex shrink-0 items-center border-b px-4">
                        {/* Scrolls rather than wraps: with every platform
                            connected the strip is wider than the column. */}
                        <div
                          role="tablist"
                          aria-label="Platform copy"
                          className="flex min-w-0 items-center gap-4 overflow-x-auto"
                        >
                          {selected.map((item) => {
                            const active = item.id === platform.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                role="tab"
                                id={`copy-tab-${item.id}`}
                                aria-selected={active}
                                onClick={() => setPlatformId(item.id)}
                                className={cn(
                                  "-mb-px border-b-2 py-2 text-xs whitespace-nowrap transition-colors outline-none focus-visible:text-foreground",
                                  active
                                    ? "border-foreground font-medium text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {item.name} copy
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div
                      role={selected.length > 1 ? "tabpanel" : undefined}
                      aria-labelledby={
                        selected.length > 1
                          ? `copy-tab-${platform.id}`
                          : undefined
                      }
                      /* The column itself never scrolls: the counter and the
                         dropzone have to stay in view. Only the text does. */
                      className="flex min-h-0 flex-1 flex-col gap-3 p-4"
                    >
                      <span className="text-xs text-muted-foreground">
                        Posting as{" "}
                        <span className="font-medium text-foreground">
                          {platform.handle}
                        </span>
                      </span>

                      <textarea
                        value={text}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [platform.id]: event.target.value,
                          }))
                        }
                        rows={8}
                        aria-label={`${platform.name} post text`}
                        className="min-h-32 w-full flex-1 resize-none overflow-y-auto rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {platform.linkNote}
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            overLimit
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {remaining.toLocaleString()}
                        </span>
                      </div>

                      <AttachmentDropzone
                        platform={platform}
                        attachments={attachments[platform.id] ?? []}
                        onChange={(next) =>
                          setAttachments((current) => ({
                            ...current,
                            [platform.id]: next,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Right: how it would land. */}
                  <div className="flex min-h-0 w-full shrink-0 flex-col gap-2 overflow-y-auto border-t bg-muted/30 p-4 md:w-[360px] md:border-t-0 md:border-l">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <PlatformGlyph
                        platformId={platform.id}
                        style={
                          platform.preview.chrome.glyphTint === "accent"
                            ? { color: platform.preview.chrome.accent }
                            : undefined
                        }
                      />
                      {platform.name} preview
                    </span>
                    <SocialPreview
                      platform={platform}
                      text={text}
                      title={title}
                      attachments={attachments[platform.id] ?? []}
                    />
                    <p className="text-xs text-muted-foreground">
                      A mock-up. Nothing is sent.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-10 text-xs text-muted-foreground">
                  Tick a destination above to start writing.
                </div>
              )}

              <div className="flex shrink-0 items-center justify-end gap-3 border-t px-4 py-3">
                {tooLong.length ? (
                  <span className="mr-auto text-xs text-destructive">
                    {tooLong.map((item) => item.name).join(" and ")} over the
                    limit.
                  </span>
                ) : null}
                {!selected.length ? (
                  <span className="mr-auto text-xs text-muted-foreground">
                    Choose at least one destination.
                  </span>
                ) : null}
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
                  disabled={!selected.length || tooLong.length > 0 || posting}
                  onClick={() =>
                    startPosting(async () =>
                      postToPlatforms({
                        postId,
                        title,
                        body,
                        platformIds: selectedIds,
                        brief,
                      })
                    )
                  }
                >
                  <Send />
                  {posting
                    ? "Posting…"
                    : destinations
                      ? `Post to ${destinations}`
                      : "Post"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

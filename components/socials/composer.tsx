"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, Send } from "lucide-react"

import {
  publishSocialPost,
  saveSocialDraft,
  scheduleSocialPost,
} from "@/app/socials-actions"
import {
  AttachmentDropzone,
  type Attachment,
} from "@/components/editor/attachment-dropzone"
import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import { SocialPreview } from "@/components/editor/social-preview"
import { PlatformMenu } from "@/components/socials/platform-menu"
import { PublishDialog } from "@/components/socials/publish-dialog"
import { ScheduleDialog } from "@/components/socials/schedule-dialog"
import { Button } from "@/components/ui/button"
import {
  findPlatform,
  orderPlatformIds,
  platformNames,
  sharedAttachmentRules,
  type Platform,
} from "@/lib/connectors"
import type { SocialPost, SocialVariant } from "@/lib/social-data"
import { formatCount } from "@/lib/social-insights"
import { nameFrom } from "@/lib/social-generator"
import { formatLeadTime } from "@/lib/time"
import { cn } from "@/lib/utils"

// The workspace: what you are writing on the left, how it will look on the
// right, updating as you type. Platforms have different limits, so each keeps
// its own copy — the tabs switch which one you are editing, and the preview
// follows.

const FIELD_CLASSNAME =
  "w-full flex-1 resize-none rounded-md border border-input bg-input/20 px-3 py-2.5 text-xs/relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

export function Composer({
  platforms,
  post,
  initialSelectedIds,
  initialDrafts,
  sourceName,
  connectedIds,
  nowMs,
  queuedDays,
}: {
  /** Everything Socials can post to. */
  platforms: Platform[]
  /** Editing an existing post, or undefined for a new one. */
  post?: SocialPost
  /** Where this post is going, settled before it got here. */
  initialSelectedIds: string[]
  /** The version chosen for each platform, already cut to its limit. */
  initialDrafts: Record<string, string>
  /** What the post was written from, kept so saving can name it after what was
      asked for rather than after however the copy happens to open. */
  sourceName?: string
  /** The networks this account is signed in to. A post cannot be sent or
      queued anywhere else, and both of the dialogs below say so. */
  connectedIds: string[]
  /** The one `now` the page settled on, for turning a chosen day and time into
      the offset the store keeps. See lib/social-schedule.ts. */
  nowMs: number
  /** How many posts are already due on each day, so a time is chosen against
      the queue rather than against a blank grid. */
  queuedDays: Record<string, number>
}) {
  const router = useRouter()
  const [saving, startSaving] = React.useTransition()
  const [scheduling, setScheduling] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)

  const [selectedIds, setSelectedIds] =
    React.useState<string[]>(initialSelectedIds)
  const [drafts, setDrafts] =
    React.useState<Record<string, string>>(initialDrafts)
  const [activeId, setActiveId] = React.useState(
    selectedIds[0] ?? platforms[0]?.id ?? ""
  )

  // Media, kept two ways round: one set for the whole post, or one per
  // platform. Both are held at once so that switching between them is a change
  // of mind rather than a loss — the files you picked are still there when you
  // switch back.
  const [oneSet, setOneSet] = React.useState(true)
  const [sharedMedia, setSharedMedia] = React.useState<Attachment[]>([])
  const [platformMedia, setPlatformMedia] = React.useState<
    Record<string, Attachment[]>
  >({})

  // A tab can be closed while it is the one on screen.
  const active =
    findPlatform(selectedIds.includes(activeId) ? activeId : selectedIds[0]) ??
    platforms[0]

  const text = active ? (drafts[active.id] ?? "") : ""
  const remaining = active ? active.characterLimit - text.length : 0
  const overLimit = selectedIds.some((id) => {
    const platform = findPlatform(id)
    return platform
      ? (drafts[id] ?? "").length > platform.characterLimit
      : false
  })
  const empty = selectedIds.every((id) => !(drafts[id] ?? "").trim())
  // Nothing to save, nothing that would be refused: the same bar for all three
  // ways out, because none of them can do anything useful with an empty post.
  const blocked = saving || empty || overLimit

  // Where this post goes, as platforms rather than ids, in registry order —
  // both dialogs list them, and they have to list them the same way round.
  const destinations = orderPlatformIds(selectedIds).flatMap((id) => {
    const platform = findPlatform(id)
    return platform ? [platform] : []
  })

  /** When this post is already due, if it is. A scheduled post opened here is
      being changed rather than made, and the footer says so. */
  const queued =
    post?.status === "Scheduled" ? post.scheduledInMinutes : undefined

  /** What a given platform is carrying — the shared set, or its own. */
  function mediaFor(platformId: string): Attachment[] {
    return oneSet ? sharedMedia : (platformMedia[platformId] ?? [])
  }

  function setMedia(next: Attachment[]) {
    if (oneSet) {
      setSharedMedia(next)
    } else if (active) {
      setPlatformMedia((current) => ({ ...current, [active.id]: next }))
    }
  }

  /**
   * Switching between one set and one each carries the files over rather than
   * leaving them behind a checkbox. Safe in both directions: the shared rules
   * are the tightest of every platform's, so a set that was allowed everywhere
   * is allowed on each of them on its own.
   */
  function chooseOneSet(next: boolean) {
    if (next) {
      if (!sharedMedia.length) {
        const carried = selectedIds
          .map((id) => platformMedia[id] ?? [])
          .find((list) => list.length)
        if (carried) {
          setSharedMedia(carried)
        }
      }
    } else if (sharedMedia.length) {
      setPlatformMedia((current) => {
        const seeded = { ...current }
        for (const id of selectedIds) {
          if (!seeded[id]?.length) {
            seeded[id] = sharedMedia
          }
        }
        return seeded
      })
    }

    setOneSet(next)
  }

  // What the dropzone is holding media to. One set for the post has to satisfy
  // every platform at once; one set per platform answers only to that platform.
  const mediaDestination =
    oneSet && destinations.length > 1
      ? {
          name: platformNames(selectedIds).join(" and "),
          attachments: sharedAttachmentRules(destinations),
        }
      : (active ?? destinations[0])

  function togglePlatform(id: string) {
    setSelectedIds((current) => {
      if (!current.includes(id)) {
        return [...current, id]
      }
      // A post with nowhere to go is not a post, so the last destination does
      // not come off. Enforced here rather than in each control, because both
      // the dialog and the menu can reach for it — they only show it as
      // unavailable, which is a different job from making it so.
      return current.length === 1
        ? current
        : current.filter((item) => item !== id)
    })
  }

  function setText(value: string) {
    if (!active) {
      return
    }
    setDrafts((current) => ({ ...current, [active.id]: value }))
  }

  /** The post as the store wants it, or nothing if there is no post yet. Every
      way out of the workspace writes the same thing and differs only in the
      state it leaves it in. */
  function payload():
    | {
        id?: string
        name: string
        variants: Array<Pick<SocialVariant, "platformId" | "text">>
      }
    | undefined {
    const variants = selectedIds.flatMap((id) => {
      const value = (drafts[id] ?? "").trim()
      return value ? [{ platformId: id, text: value }] : []
    })

    if (!variants.length) {
      return undefined
    }

    return {
      id: post?.id,
      // The brief is the better label when there is one — it is what the
      // post is about, rather than however the copy happens to open.
      name: post?.name ?? nameFrom(sourceName || variants[0].text),
      variants,
    }
  }

  function save() {
    const body = payload()
    if (!body) {
      return
    }

    startSaving(async () => {
      await saveSocialDraft(body)
      router.push("/socials")
    })
  }

  function schedule(minutesAhead: number) {
    const body = payload()
    if (!body) {
      return
    }

    startSaving(async () => {
      await scheduleSocialPost({ ...body, minutesAhead })
      router.push("/socials")
    })
  }

  /** Publishing is the run in the dialog, so the write happens when the run
      reaches the end of it rather than when the button is pressed. */
  async function publish() {
    const body = payload()
    if (!body) {
      return
    }
    await publishSocialPost(body)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Where it is going — settled in the dialog on the way in, and changed
          here for as long as the post is being written. */}
      <div className="flex flex-wrap items-center gap-3">
        <PlatformMenu
          platforms={platforms}
          selectedIds={selectedIds}
          onToggle={togglePlatform}
        />
      </div>

      {/* No empty state for "nowhere to post": there is always somewhere. The
          workspace used to have one, and the way to reach it was to turn every
          destination off — which is now the one thing the controls will not
          let you do. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {/* One tab per selected platform. A single destination needs no
                choosing, so the strip only appears once there are two. */}
          {selectedIds.length > 1 ? (
            <div
              role="group"
              aria-label="Editing copy for"
              className="flex flex-wrap items-center gap-0.5 self-start rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
            >
              {selectedIds.map((id) => {
                const platform = findPlatform(id)
                if (!platform) {
                  return null
                }
                return (
                  <Button
                    key={id}
                    type="button"
                    variant={id === active?.id ? "secondary" : "ghost"}
                    aria-pressed={id === active?.id}
                    onClick={() => setActiveId(id)}
                  >
                    <PlatformGlyph
                      platformId={id}
                      style={platformTint(platform)}
                    />
                    {platform.name}
                  </Button>
                )
              })}
            </div>
          ) : null}

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs/relaxed font-medium">Create post</span>
            {active ? (
              <span className="text-xs/relaxed text-muted-foreground">
                Posting as {active.handle}
              </span>
            ) : null}
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write your post, or generate one to start from…"
            aria-label={`Post copy for ${active?.name ?? "platform"}`}
            className={FIELD_CLASSNAME}
          />

          {/* Media, under the words it goes with. Whatever lands here is in the
              preview beside it immediately — that is the whole point of having
              a preview, and an image is the part of a post least worth
              imagining. */}
          {mediaDestination ? (
            <div className="flex shrink-0 flex-col gap-2">
              {/* Only a post going to more than one place has the question. */}
              {destinations.length > 1 ? (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs/relaxed">
                  <input
                    type="checkbox"
                    checked={oneSet}
                    onChange={(event) => chooseOneSet(event.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border transition-colors",
                      oneSet
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-background"
                    )}
                  >
                    {oneSet ? <Check className="size-3" /> : null}
                  </span>
                  Same media on {platformNames(selectedIds).join(" and ")}
                </label>
              ) : null}

              <AttachmentDropzone
                destination={mediaDestination}
                attachments={active ? mediaFor(active.id) : []}
                onChange={setMedia}
              />
            </div>
          ) : null}

          <div className="flex items-baseline justify-between gap-3 text-xs/relaxed">
            <span className="text-muted-foreground">{active?.linkNote}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                remaining < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {remaining < 0 ? "−" : ""}
              {formatCount(Math.abs(remaining))} left
            </span>
          </div>
        </div>

        {/* Not a separate step — this is the same text, dressed. */}
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-96">
          <span className="text-xs/relaxed font-medium">Preview</span>
          <div className="min-h-0 flex-1 overflow-y-auto p-0.5">
            {active ? (
              // What the post is about, which is the headline a link card
              // would carry. Empty until something has been generated, and a
              // card with no headline shows as one.
              <SocialPreview
                platform={active}
                text={text}
                title={sourceName ?? ""}
                attachments={mediaFor(active.id)}
              />
            ) : null}
          </div>
          <p className="text-xs/relaxed text-muted-foreground">
            A mock-up. Nothing is sent.
          </p>
        </div>
      </div>

      {/* Three ways out, in the order they get less reversible: put it down,
          queue it, send it. Only the last one is the primary — it is what the
          workspace is for, and the other two are what you do instead. */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t pt-4">
        {overLimit ? (
          <span className="mr-auto text-xs/relaxed text-destructive">
            One of these is over its limit.
          </span>
        ) : queued !== undefined ? (
          <span className="mr-auto text-xs/relaxed text-muted-foreground">
            Queued — goes out {formatLeadTime(queued).toLowerCase()}.
          </span>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={blocked}
          // A scheduled post saved as a draft comes out of the queue. That is
          // the only thing "save" can mean for something with a departure time
          // on it, and it is also how a queued post is called off.
          title={
            queued !== undefined ? "Takes the post out of the queue" : undefined
          }
          onClick={save}
        >
          {saving ? "Saving…" : "Save as draft"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={blocked}
          onClick={() => setScheduling(true)}
        >
          <CalendarClock />
          {queued !== undefined ? "Reschedule" : "Schedule"}
        </Button>

        <Button
          type="button"
          size="lg"
          disabled={blocked}
          onClick={() => setPublishing(true)}
        >
          <Send />
          Post now
        </Button>
      </div>

      <ScheduleDialog
        open={scheduling}
        onOpenChange={setScheduling}
        nowMs={nowMs}
        platforms={destinations}
        connectedIds={connectedIds}
        queuedDays={queuedDays}
        scheduledInMinutes={queued}
        pending={saving}
        onConfirm={schedule}
      />

      <PublishDialog
        open={publishing}
        onOpenChange={setPublishing}
        platforms={destinations}
        drafts={drafts}
        connectedIds={connectedIds}
        onCommit={publish}
        onFinished={() => router.push("/socials")}
      />
    </div>
  )
}

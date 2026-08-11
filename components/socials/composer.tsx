"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

import { saveSocialDraft } from "@/app/socials-actions"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { SocialPreview } from "@/components/editor/social-preview"
import { GenerateDialog } from "@/components/socials/generate-dialog"
import { Button } from "@/components/ui/button"
import { findPlatform, type Platform } from "@/lib/connectors"
import type { SocialPost } from "@/lib/social-data"
import { formatCount } from "@/lib/social-insights"
import { generateSocialPost, nameFrom } from "@/lib/social-generator"
import { trimTo } from "@/lib/social-draft"
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
}: {
  /** Everything Socials can post to. */
  platforms: Platform[]
  /** Editing an existing post, or undefined for a new one. */
  post?: SocialPost
}) {
  const router = useRouter()
  const [saving, startSaving] = React.useTransition()

  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    post?.variants.map((variant) => variant.platformId) ??
      platforms.slice(0, 2).map((platform) => platform.id)
  )
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      (post?.variants ?? []).map((variant) => [variant.platformId, variant.text])
    )
  )
  const [activeId, setActiveId] = React.useState(
    selectedIds[0] ?? platforms[0]?.id ?? ""
  )
  // Kept so the post can be named after what was asked for rather than after
  // the opening words of what came back.
  const [brief, setBrief] = React.useState("")

  // A tab can be closed while it is the one on screen.
  const active =
    findPlatform(selectedIds.includes(activeId) ? activeId : selectedIds[0]) ??
    platforms[0]

  const text = active ? (drafts[active.id] ?? "") : ""
  const remaining = active ? active.characterLimit - text.length : 0
  const overLimit = selectedIds.some((id) => {
    const platform = findPlatform(id)
    return platform ? (drafts[id] ?? "").length > platform.characterLimit : false
  })
  const empty = selectedIds.every((id) => !(drafts[id] ?? "").trim())

  function togglePlatform(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  function setText(value: string) {
    if (!active) {
      return
    }
    setDrafts((current) => ({ ...current, [active.id]: value }))
  }

  /** One brief, shaped to every selected platform's limit. */
  function generate(nextBrief: string) {
    const master = generateSocialPost(nextBrief)
    setBrief(nextBrief)

    setDrafts((current) => {
      const next = { ...current }
      for (const id of selectedIds) {
        const platform = findPlatform(id)
        if (!platform) {
          continue
        }
        // Short platforms take the opening thought; long ones carry it all.
        const paragraphs = master.split(/\n\s*\n/).filter(Boolean)
        const source =
          platform.characterLimit < 600 ? (paragraphs[0] ?? master) : master
        next[id] = trimTo(source, platform.characterLimit)
      }
      return next
    })
  }

  function save() {
    const variants = selectedIds.flatMap((id) => {
      const value = (drafts[id] ?? "").trim()
      return value ? [{ platformId: id, text: value }] : []
    })

    if (!variants.length) {
      return
    }

    startSaving(async () => {
      await saveSocialDraft({
        id: post?.id,
        // The brief is the better label when there is one — it is what the
        // post is about, rather than however the copy happens to open.
        name: post?.name ?? nameFrom(brief || variants[0].text),
        variants,
      })
      router.push("/socials")
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Where it is going, and the way in to a first draft. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Post to"
          className="flex flex-wrap items-center gap-2"
        >
          {platforms.map((platform) => {
            const on = selectedIds.includes(platform.id)
            return (
              <Button
                key={platform.id}
                type="button"
                variant={on ? "secondary" : "outline"}
                aria-pressed={on}
                onClick={() => togglePlatform(platform.id)}
              >
                {on ? <Check /> : <PlatformGlyph platformId={platform.id} />}
                {platform.name}
              </Button>
            )
          })}
        </div>

        <GenerateDialog onGenerate={generate} />
      </div>

      {selectedIds.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="px-6 text-center text-xs/relaxed text-muted-foreground">
            Pick a platform to write for.
          </p>
        </div>
      ) : (
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
                      <PlatformGlyph platformId={id} />
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
                <SocialPreview
                  platform={active}
                  text={text}
                  title=""
                  attachments={[]}
                />
              ) : null}
            </div>
            <p className="text-xs/relaxed text-muted-foreground">
              A mock-up. Nothing is sent.
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-4">
        {overLimit ? (
          <span className="mr-auto text-xs/relaxed text-destructive">
            One of these is over its limit.
          </span>
        ) : null}
        <Button
          type="button"
          size="lg"
          disabled={saving || empty || overLimit}
          onClick={save}
        >
          {saving ? "Saving…" : "Save as draft"}
        </Button>
      </div>
    </div>
  )
}

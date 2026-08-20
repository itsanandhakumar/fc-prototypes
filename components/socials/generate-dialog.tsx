"use client"

import * as React from "react"
import { Check, Sparkles, X } from "lucide-react"

import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import {
  BlogPickerDialog,
  type BlogSource,
} from "@/components/socials/blog-picker-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Platform } from "@/lib/connectors"
import type { SourceRef } from "@/lib/social-flow"
import { cn } from "@/lib/utils"

const FIELD_CLASSNAME =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

// Where a post comes from: something you want said, or something already on the
// blog worth saying again. It opens over the Socials list, so everything it
// asks for is settled before the post has a screen of its own — which is what
// lets the screens that follow be pages rather than states.
export function GenerateDialog({
  blogs,
  platforms,
  selectedIds,
  onTogglePlatform,
  open,
  onOpenChange,
  onGenerate,
  onWriteOwn,
}: {
  /** The blog posts on offer as a starting point. */
  blogs: BlogSource[]
  /** Everywhere the post could go, and which of those it is going to. Settled
      here because a draft is shaped to a platform's limit as it is written —
      the answer is needed before there is anything to write. */
  platforms: Platform[]
  selectedIds: string[]
  onTogglePlatform: (id: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hands back where the post comes from; the caller takes it from there. */
  onGenerate: (ref: SourceRef) => void
  /** No brief, no blog, no drafts — straight to an empty workspace. */
  onWriteOwn: () => void
}) {
  const [brief, setBrief] = React.useState("")
  const [blog, setBlog] = React.useState<BlogSource>()

  // Two ways in, one post. Whichever you touch first puts the other out of
  // reach until you let go of it — a brief and a blog post would each want to
  // be the whole draft, so generating from both would mean picking one anyway.
  const typing = Boolean(brief.trim())
  // Somewhere to post is the other half of the question: a draft is cut to a
  // platform's limit, so with none chosen there is nothing to cut it to.
  const ready = (typing || Boolean(blog)) && selectedIds.length > 0

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (blog) {
      onGenerate({ kind: "blog", blogId: blog.id })
    } else if (typing) {
      onGenerate({ kind: "brief", brief: brief.trim() })
    } else {
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-1.5 overflow-y-auto sm:max-w-lg">
        {/* Above the brief, because it is the first thing settled: what is
            written depends on where it is going. */}
        <fieldset className="mb-2 flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs/relaxed font-medium">
            Post to{" "}
            <span className="font-normal text-muted-foreground">
              — pick one or more
            </span>
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            {platforms.map((platform) => {
              const on = selectedIds.includes(platform.id)
              // The one remaining destination cannot be turned off — there is
              // no version of this post that goes nowhere.
              const locked = on && selectedIds.length === 1
              return (
                // A bare checkbox beside a logo reads as decoration on it. Each
                // platform gets a frame of its own instead, so the row reads as
                // a set of things to choose between, and the frame carries the
                // answer as well as the box does.
                <label
                  key={platform.id}
                  title={locked ? "The post has to go somewhere" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs/relaxed transition-colors",
                    "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
                    locked ? "cursor-default" : "cursor-pointer",
                    on
                      ? "border-foreground/40 bg-input/40"
                      : "border-input bg-input/20 hover:bg-input/40 dark:bg-input/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={locked}
                    onChange={() => onTogglePlatform(platform.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      // The app's own ink rather than its accent: the accent is
                      // for the thing you press, and half this row is a logo
                      // already carrying a colour of its own.
                      "flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-background"
                    )}
                  >
                    {on ? <Check className="size-3" /> : null}
                  </span>
                  <PlatformGlyph
                    platformId={platform.id}
                    style={platformTint(platform)}
                  />
                  {platform.name}
                </label>
              )
            })}
          </div>
        </fieldset>

        <DialogHeader>
          {/* The title is the field's label, the way the brief dialog in
              Blogger does it. */}
          <DialogTitle>
            What should this post be about?{" "}
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">(required)</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Describe the post, or choose one from your blog to write up. Either
            way it is drafted for every platform you have selected.
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-w-0 flex-col gap-3" onSubmit={submit}>
          <textarea
            autoFocus
            rows={4}
            value={brief}
            disabled={Boolean(blog)}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="e.g. why most content calendars fail, aimed at solo founders"
            aria-label="What should this post be about?"
            className={`resize-none ${FIELD_CLASSNAME}`}
          />

          {/* Not a heading over the second option: the two are alternatives at
              the same level, and a rule that says so takes less room than a
              label that implies it. */}
          <div
            aria-hidden
            className="flex items-center gap-3 text-muted-foreground"
          >
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <BlogPickerDialog
              blogs={blogs}
              selected={blog}
              onSelect={setBlog}
              disabled={typing}
            />
            {/* Only once there is something to take back. */}
            {blog ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setBlog(undefined)}
              >
                <X />
                <span className="sr-only">Clear the chosen blog post</span>
              </Button>
            ) : null}
          </div>

          <p className="text-xs/relaxed text-muted-foreground">
            {!selectedIds.length
              ? "Pick somewhere to post first."
              : blog
                ? "Writes a post about it for every platform you have selected."
                : typing
                  ? "Drafts every platform you have selected. You can edit each one after."
                  : "Add a brief, or choose a blog post to write up."}
          </p>

          <div className="flex items-center justify-between gap-3">
            {/* The third way out, and the quietest: no brief, no blog, just the
                empty workspace. A link rather than a button because it is not
                an alternative to generating so much as declining to. */}
            <Button type="button" variant="link" onClick={onWriteOwn}>
              Write on my own
            </Button>

            <Button type="submit" size="lg" disabled={!ready}>
              <Sparkles />
              Generate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

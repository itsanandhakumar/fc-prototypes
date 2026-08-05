"use client"

import * as React from "react"
import { Copy, Trash2, type LucideIcon } from "lucide-react"

import { createPostFromTitle } from "@/app/editor-actions"
import { Button } from "@/components/ui/button"
import type { PostStatus } from "@/lib/blog-data"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// One line per option, matching the button that takes it, so the choice can be
// taken in at a glance instead of read.
function Outcome({
  icon: Icon,
  label,
  detail,
  danger,
}: {
  icon: LucideIcon
  /** What happens, in one or two words. */
  label: string
  /** Which post it happens to. */
  detail: string
  danger?: boolean
}) {
  return (
    <li className="flex items-start gap-2 text-xs/relaxed">
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          danger ? "text-destructive" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground"> — {detail}</span>
      </span>
    </li>
  )
}

// Picking one of these starts a separate post on that subject — the draft in
// the editor is not retitled. What happens to it depends on whether it is in
// Your posts yet: a saved one is left alone, an unsaved draft is dropped. The
// dialog says which before the writer commits to it.
export function PostIdeas({
  titles,
  savedPost,
  disabled,
}: {
  titles: string[]
  /** The stored version of the post being edited, if it has one. */
  savedPost?: { id: string; title: string; status: PostStatus }
  disabled?: boolean
}) {
  const [chosen, setChosen] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState<"keep" | "replace" | null>(
    null
  )
  const [isCreating, startCreating] = React.useTransition()

  // Replacing is only ever offered for a draft: a published post is not the
  // writer's to lose behind a title suggestion.
  const replaceable = savedPost?.status === "Draft" ? savedPost : null

  // `replaceDraftId` set means the draft being edited makes way for the new
  // post; absent, both are kept.
  function create(replaceDraftId?: string) {
    const title = chosen
    if (!title) {
      return
    }

    setCreating(replaceDraftId ? "replace" : "keep")
    startCreating(async () => {
      await createPostFromTitle(title, replaceDraftId)
    })
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {titles.map((title) => (
          <li key={title}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setChosen(title)}
              className="w-full rounded-md bg-muted/60 px-2 py-1.5 text-left text-xs/relaxed transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              {title}
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={chosen !== null}
        onOpenChange={(open) => {
          if (!open) {
            setChosen(null)
          }
        }}
      >
        {/* Wider than the default so each outcome keeps to a line or two, but
            still a centred dialog — the decision is small enough to answer
            where the eye already is. */}
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>
              {replaceable
                ? "Keep this draft, or replace it?"
                : savedPost
                  ? "Create a new post?"
                  : "Replace this draft?"}
            </DialogTitle>
            {/* Nothing to choose between here, so it stays a sentence. Only
                the draft case gets the list, which keeps a row of icon and
                label meaning one thing: a button below. */}
            <DialogDescription>
              {replaceable ? (
                "Both write the new draft. The difference:"
              ) : savedPost ? (
                <>
                  A new draft is written and opened. This post stays published,
                  untouched.
                </>
              ) : (
                <>
                  A new draft is written and opened. The draft on screen was
                  never saved, so it is lost.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* One row per button below it. */}
          {replaceable ? (
            <ul className="flex flex-col gap-2">
              <Outcome
                icon={Copy}
                label="Keep both"
                detail="this draft stays in Your posts"
              />
              <Outcome
                icon={Trash2}
                danger
                label="Replace"
                detail="this draft is deleted"
              />
            </ul>
          ) : null}

          {savedPost ? (
            <p className="text-xs/relaxed text-muted-foreground">
              Unsaved edits are not carried over.
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>

            {/* Deleting is the one that cannot be undone, so it never takes
                the default action. */}
            {replaceable ? (
              <Button
                type="button"
                variant="outline"
                disabled={isCreating}
                onClick={() => create(replaceable.id)}
              >
                {creating === "replace" ? "Replacing…" : "Replace the draft"}
              </Button>
            ) : null}

            <Button
              type="button"
              disabled={isCreating}
              onClick={() => create()}
            >
              {creating === "keep"
                ? "Creating…"
                : replaceable
                  ? "Keep both"
                  : "Create new post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

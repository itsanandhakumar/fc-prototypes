"use client"

import * as React from "react"
import { ChevronRight, Newspaper } from "lucide-react"

import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { BlogPost } from "@/lib/blog-data"
import { HUBSPOT } from "@/lib/connectors"
import { formatRelativeTime } from "@/lib/time"

/** A blog post as the picker needs it: enough to recognise, not the article. */
export type BlogSource = Pick<
  BlogPost,
  "id" | "title" | "status" | "updatedMinutesAgo"
>

// Everything on the blog, drafts included — a post does not have to be live
// before it is worth writing about, and a writer scheduling both together is
// the ordinary case rather than the odd one.
export function BlogPickerDialog({
  blogs,
  selected,
  onSelect,
  disabled,
}: {
  blogs: BlogSource[]
  /** Shown in the trigger, so the choice reads where it was made. */
  selected?: BlogSource
  onSelect: (blog: BlogSource) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  function choose(blog: BlogSource) {
    onSelect(blog)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Before a choice it is a plain button; after one it is the choice
          itself, still pressable, so changing your mind is the same gesture as
          making it. */}
      <DialogTrigger
        render={
          // A button does not shrink by default and never wraps, so a long
          // title would push the dialog open from the inside. This one has to
          // give, and the title inside it truncates instead.
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-auto min-w-0 flex-1 shrink justify-start px-2 py-1.5 text-left"
          />
        }
      >
        {selected ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">
              {selected.title}
            </span>
            <StatusBadge status={selected.status} />
          </>
        ) : (
          <>
            <Newspaper />
            <span className="flex-1">Choose a blog</span>
            <ChevronRight className="text-muted-foreground" />
          </>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100svh-4rem)] gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a blog post</DialogTitle>
          <DialogDescription>
            Everything on your blog. A post about it gets drafted for each
            platform you have selected.
          </DialogDescription>
        </DialogHeader>

        {blogs.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            Nothing on the blog yet. Write one in Blogger first.
          </p>
        ) : (
          // A long blog scrolls inside the dialog rather than pushing it past
          // the viewport.
          <ul className="-mx-1 max-h-80 divide-y divide-border overflow-y-auto px-1">
            {blogs.map((blog) => (
              <li key={blog.id}>
                <button
                  type="button"
                  onClick={() => choose(blog)}
                  aria-current={blog.id === selected?.id ? "true" : undefined}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none aria-[current]:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {blog.title}
                  </span>
                  <StatusBadge status={blog.status} />
                  <span className="w-20 shrink-0 text-right text-muted-foreground tabular-nums">
                    {formatRelativeTime(blog.updatedMinutesAgo)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

// The same pill the blog list uses, so a post is recognisable by the same
// marks in both products.
function StatusBadge({ status }: { status: BlogPost["status"] }) {
  if (status !== "Published") {
    return <Badge variant="outline">Draft</Badge>
  }

  return (
    <Badge
      variant="secondary"
      className={HUBSPOT.badge}
      title={`Published to ${HUBSPOT.name}`}
    >
      <PlatformGlyph platformId={HUBSPOT.id} />
      Published
      <span className="sr-only"> to {HUBSPOT.name}</span>
    </Badge>
  )
}

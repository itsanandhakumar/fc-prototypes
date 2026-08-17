"use client"

import * as React from "react"
import { CalendarDays, List, Search } from "lucide-react"

import { SocialCalendar } from "@/components/socials/social-calendar"
import { SocialPostRow } from "@/components/socials/social-post-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { SocialPost, SocialStatus } from "@/lib/social-data"
import { cn } from "@/lib/utils"

// Same filter row as Blogger's list, at the same height, so the two products
// are worked the same way. Filtering stays local: it is a way of looking at
// the list, not a place in the app.
const CONTROL_HEIGHT = "h-9"

type StatusFilter = "all" | SocialStatus

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "Draft", label: "Drafts" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Published", label: "Published" },
  { value: "Failed", label: "Failed" },
]

type View = "calendar" | "list"

const VIEWS = [
  { value: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { value: "list" as const, label: "List", icon: List },
]

export function SocialPostList({
  posts,
  nowMs,
}: {
  posts: SocialPost[]
  /** The one `now` the page settled on, for the calendar to measure from. */
  nowMs: number
}) {
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [query, setQuery] = React.useState("")
  // The calendar leads. A social plan is mostly a question about when — what is
  // going out this week, where the gaps are — and a list can only answer that
  // by being read in order.
  const [view, setView] = React.useState<View>("calendar")

  const search = query.trim().toLowerCase()

  const visible = posts
    .filter((post) => {
      if (status !== "all" && post.status !== status) {
        return false
      }
      if (search && !post.name.toLowerCase().includes(search)) {
        return false
      }
      return true
    })
    // Scheduled posts are the ones still to come, so they lead; the rest read
    // newest first.
    .sort((a, b) => {
      const aNext = a.status === "Scheduled"
      const bNext = b.status === "Scheduled"
      if (aNext !== bNext) {
        return aNext ? -1 : 1
      }
      if (aNext && bNext) {
        return (a.scheduledInMinutes ?? 0) - (b.scheduledInMinutes ?? 0)
      }
      return a.updatedMinutesAgo - b.updatedMinutesAgo
    })

  const emptyNote =
    status !== "all" || search
      ? "No posts match these filters."
      : "Nothing here yet."

  // Counted off the whole list, not the filtered one, so the numbers hold
  // still as the filters move.
  const countOf = (value: StatusFilter) =>
    value === "all"
      ? posts.length
      : posts.filter((post) => post.status === value).length

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 className="text-sm font-medium">Your posts</h2>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex items-center gap-0.5 rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              className={CONTROL_HEIGHT}
              variant={status === value ? "secondary" : "ghost"}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label}
              <span className="tabular-nums opacity-60">{countOf(value)}</span>
            </Button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts"
            aria-label="Search posts by name"
            className={cn(CONTROL_HEIGHT, "w-52 pl-7")}
          />
        </div>

        {/* Which way of looking, not which posts — so it sits apart from the
            filters, on the far side of the row. Both views are fed the same
            filtered list: a filter is a filter whichever shape it lands in. */}
        <div
          role="group"
          aria-label="View"
          className="flex items-center gap-0.5 rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
        >
          {VIEWS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              className={CONTROL_HEIGHT}
              variant={view === value ? "secondary" : "ghost"}
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {view === "calendar" ? (
        <SocialCalendar posts={visible} nowMs={nowMs} emptyNote={emptyNote} />
      ) : (
        /* One surface with divided rows, the same shape as Blogger's list. The
           page does not scroll — the card takes the slack and scrolls inside
           itself. `relative` is load-bearing for the same reason it is over
           there: absolutely positioned labels inside would otherwise resolve
           against the viewport and escape the clip. */
        <Card className="min-h-0 w-full gap-0 py-0">
          <CardContent className="relative min-h-0 overflow-y-auto overscroll-contain px-0">
            {visible.length ? (
              <ul className="divide-y divide-foreground/10">
                {visible.map((post) => (
                  <SocialPostRow key={post.id} post={post} />
                ))}
              </ul>
            ) : (
              <p className="px-(--card-spacing) py-6 text-xs/relaxed text-muted-foreground">
                {emptyNote}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}

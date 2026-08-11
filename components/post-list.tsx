"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { type BlogPost } from "@/lib/blog-data"
import { formatRelativeTime } from "@/lib/time"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { HUBSPOT } from "@/lib/connectors"
import { cn } from "@/lib/utils"

// Every control on the filter row is set to one height, so the row reads as a
// single band rather than as buttons of assorted sizes. The boxed status
// control ends up taller by its own padding and border, as it did before.
const CONTROL_HEIGHT = "h-9"

type StatusFilter = "all" | "Draft" | "Published"
type Recency = "any" | "week" | "month" | "quarter"
type Sort = "recent" | "oldest" | "title"

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "Draft", label: "Drafts" },
  { value: "Published", label: "Published" },
]

const RECENCY: Array<{ value: Recency; label: string; minutes: number }> = [
  { value: "any", label: "Any time", minutes: Infinity },
  { value: "week", label: "Last 7 days", minutes: 60 * 24 * 7 },
  { value: "month", label: "Last 30 days", minutes: 60 * 24 * 30 },
  { value: "quarter", label: "Last 3 months", minutes: 60 * 24 * 90 },
]

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
]

function FilterTrigger({
  label,
  active,
}: {
  label: string
  /** A filter that is doing something reads as set rather than as available. */
  active: boolean
}) {
  return (
    <DropdownMenuTrigger
      render={
        <Button
          type="button"
          className={CONTROL_HEIGHT}
          variant={active ? "secondary" : "outline"}
        />
      }
    >
      {label}
      <ChevronDown />
    </DropdownMenuTrigger>
  )
}

// The workspace list. Filtering happens here rather than on the URL because
// nothing else needs to know about it — it is a way of looking at the list, not
// a place in the app.
export function PostList({
  posts,
  /** The post just saved or posted, called out until the writer moves on. */
  highlightedId,
}: {
  posts: BlogPost[]
  highlightedId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  // The callout belongs to the moment of arriving here from a save or a post.
  // The first click anywhere is the writer moving on, so it goes then. Which
  // id was dismissed is the state — deriving the rest of it means a later save
  // lights up again without anything having to reset.
  const [dismissed, setDismissed] = React.useState<string>()
  const highlighted = highlightedId === dismissed ? undefined : highlightedId

  React.useEffect(() => {
    if (!highlighted) {
      return
    }

    const dismiss = () => {
      setDismissed(highlighted)
      // The parameter goes with it, so a reload does not bring it back.
      router.replace(pathname, { scroll: false })
    }

    document.addEventListener("pointerdown", dismiss, { once: true })
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [highlighted, pathname, router])

  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [query, setQuery] = React.useState("")
  const [recency, setRecency] = React.useState<Recency>("any")
  const [sort, setSort] = React.useState<Sort>("recent")

  const search = query.trim().toLowerCase()
  const within =
    RECENCY.find((option) => option.value === recency)?.minutes ?? Infinity

  const visible = posts
    .filter((post) => {
      if (status !== "all" && post.status !== status) {
        return false
      }
      if (search && !post.title.toLowerCase().includes(search)) {
        return false
      }
      if (post.updatedMinutesAgo > within) {
        return false
      }
      return true
    })
    // `updatedMinutesAgo` counts backwards, so the smallest is the newest.
    .sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title)
      }
      return sort === "oldest"
        ? b.updatedMinutesAgo - a.updatedMinutesAgo
        : a.updatedMinutesAgo - b.updatedMinutesAgo
    })

  // Counted off the whole list, not the filtered one, so the numbers hold
  // still as the filters move.
  const countOf = (value: StatusFilter) =>
    value === "all"
      ? posts.length
      : posts.filter((post) => post.status === value).length

  // Status is a segmented control with its counts on it — switching back to
  // All is the way to undo it, so Clear does not speak for it. It speaks for
  // the ones whose state is otherwise only visible in a trigger label.
  const clearable = Boolean(search) || recency !== "any"
  const narrowed = clearable || status !== "all"

  function clearFilters() {
    setQuery("")
    setRecency("any")
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 className="text-sm font-medium">Your posts</h2>

      {/* Search sits with the filters, not with the heading: it narrows the
          list the same way they do. */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Boxed as one control: the three are exclusive. */}
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

        <DropdownMenu>
          <FilterTrigger
            label={
              RECENCY.find((option) => option.value === recency)?.label ??
              "Any time"
            }
            active={recency !== "any"}
          />
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup
              value={recency}
              onValueChange={(value) => setRecency(value as Recency)}
            >
              <DropdownMenuLabel>Updated</DropdownMenuLabel>
              {RECENCY.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Not a filter — nothing is hidden by it — so it never reads as set. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                className={CONTROL_HEIGHT}
                variant="outline"
              />
            }
          >
            {SORTS.find((option) => option.value === sort)?.label}
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => setSort(value as Sort)}
            >
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {SORTS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {clearable ? (
          <>
            <Button
              type="button"
              className={CONTROL_HEIGHT}
              variant="ghost"
              onClick={clearFilters}
            >
              <X />
              Clear
            </Button>
            <span className="text-xs/relaxed text-muted-foreground tabular-nums">
              {visible.length} of {posts.length}
            </span>
          </>
        ) : null}

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles"
            aria-label="Search posts by title"
            className={cn(CONTROL_HEIGHT, "w-52 pl-7")}
          />
        </div>
      </div>

      <Card className="min-h-0 w-full gap-0 py-0">
        <div className="flex shrink-0 items-center gap-4 border-b px-(--card-spacing) py-2 text-xs/relaxed text-muted-foreground">
          <span className="min-w-0 flex-1">Title</span>
          {/* Wide enough for the longer of the two pills, so the column holds
              still as rows switch between them. */}
          <span className="w-32 shrink-0 text-center">Status</span>
          <span className="w-20 shrink-0 text-right">Updated</span>
        </div>

        {/* `relative` is load-bearing: the rows carry `sr-only` labels, which
            are absolutely positioned. Without a positioned ancestor they
            resolve against the viewport instead, and an absolute box is only
            clipped by ancestors in its containing-block chain — so they escape
            the overflow-hidden wrappers, sit at their static offsets far down
            the list, and stretch the document itself rather than this box.
            overscroll-contain then keeps a scroll past the last row from
            chaining outward. */}
        <CardContent className="relative min-h-0 overflow-y-auto overscroll-contain px-0">
          {visible.length ? (
            <ul className="divide-y divide-foreground/10">
              {visible.map((post) => (
                <li key={post.id}>
                  {/* Same editor route, carrying the post id so it pre-fills. */}
                  <Link
                    href={`/editor?post=${encodeURIComponent(post.id)}`}
                    aria-current={post.id === highlighted ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-4 px-(--card-spacing) py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                      post.id === highlighted &&
                        "bg-muted ring-1 ring-foreground/15 ring-inset"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs/relaxed font-medium">
                      {post.title}
                    </span>
                    {/* Where a published post went used to be its own column.
                        With HubSpot the only destination it never varied, so
                        the mark moved into the pill and the column went: a
                        column that reads the same on every row is width spent
                        on nothing. The full phrase is still said once, for
                        anyone hovering or listening. */}
                    <span className="flex w-32 shrink-0 justify-center">
                      <Badge
                        variant={
                          post.status === "Published" ? "secondary" : "outline"
                        }
                        title={
                          post.status === "Published"
                            ? `Published to ${HUBSPOT.name}`
                            : undefined
                        }
                      >
                        {post.status === "Published" ? (
                          <>
                            {/* The badge sizes its own icons, so the glyph
                                takes no class of its own here. */}
                            <PlatformGlyph platformId={HUBSPOT.id} />
                            Published
                            <span className="sr-only"> to {HUBSPOT.name}</span>
                          </>
                        ) : (
                          "Draft"
                        )}
                      </Badge>
                    </span>

                    <span className="w-20 shrink-0 text-right text-xs/relaxed text-muted-foreground tabular-nums">
                      {formatRelativeTime(post.updatedMinutesAgo)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-(--card-spacing) py-6 text-xs/relaxed text-muted-foreground">
              {narrowed ? "No posts match these filters." : "Nothing here yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

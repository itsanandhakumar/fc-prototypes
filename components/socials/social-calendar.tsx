"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { PostDetailDialog } from "@/components/socials/post-detail-dialog"
import { Button } from "@/components/ui/button"
import { orderPlatformIds } from "@/lib/connectors"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  dateOf,
  dayKey,
  groupByDay,
  monthGrid,
  monthLabel,
  monthOf,
  MONTHS,
  shiftMonth,
  timeLabel,
  WEEKDAYS,
} from "@/lib/social-calendar"
import type { SocialPost } from "@/lib/social-data"
import {
  editorHrefFor,
  isEditable,
  STATUS_DOT,
  STATUS_HOVER,
  STATUS_TONE,
} from "@/lib/social-status"
import { cn } from "@/lib/utils"

// The month, the way a calendar shows one: a fixed grid of days with what falls
// on each. It answers a question the list cannot — how the week ahead is spread,
// and where the gaps are — which is the whole reason a content team keeps a
// calendar at all.

// How many chips a cell can hold. The grid always fits the page now, so a
// cell's height follows the window rather than any number chosen here — what
// fits has to be measured.
//
// Both halves are measured rather than assumed: the room a cell leaves for
// chips, and how tall a chip actually is. Estimating either one is how you end
// up rendering a chip the cell can only show half of, which is the one outcome
// worse than counting it — a half-height chip looks like a rendering fault, and
// it still hides the post.
//
// `gap-0.5` between chips, in pixels.
const CHIP_GAP = 2

/** Before the first measurement. Two is the conservative guess: too low only
    costs a "+1 more" for a frame, while too high shows a clipped chip. */
const ASSUMED_CAPACITY = 2

/** Dots on the overflow line, before it turns into a row of dots. */
const MAX_DOTS = 4

function capacityOf(available?: number, chip?: number): number {
  if (!available || !chip) {
    return ASSUMED_CAPACITY
  }
  // The last chip in a stack has no gap after it, so the room is one gap more
  // than the chips alone would need.
  return Math.max(0, Math.floor((available + CHIP_GAP) / (chip + CHIP_GAP)))
}

/**
 * A post as it appears in a day cell — a mark, a name, a time. Not a control:
 * at this size the whole cell is barely a target, and three stacked chips make
 * three of them where the reader sees one square. The day is what gets clicked,
 * and the card it opens is where posts become clickable.
 */
function Chip({
  post,
  nowMs,
  ref,
}: {
  post: SocialPost
  nowMs: number
  ref?: React.Ref<HTMLSpanElement>
}) {
  const platformIds = orderPlatformIds(
    post.variants.map((variant) => variant.platformId)
  )

  return (
    <span
      ref={ref}
      className={cn(
        "flex w-full items-center gap-1 rounded-sm border px-1 py-0.5 text-left text-[0.7rem]/tight",
        STATUS_TONE[post.status],
        STATUS_HOVER[post.status]
      )}
    >
      {/* The mark in the chip's own ink, not the platform's: at this size a
          brand colour on a coloured chip is a smudge, and the chip's colour is
          already saying something — which state the post is in. */}
      {platformIds.slice(0, 2).map((id) => (
        <PlatformGlyph key={id} platformId={id} className="size-2.5" />
      ))}
      <span className="min-w-0 flex-1 truncate">{post.name}</span>
      <span className="shrink-0 tabular-nums opacity-60">
        {timeLabel(dateOf(post, nowMs))}
      </span>
    </span>
  )
}

/** A day's posts in full, in the card the day opens. Every one of them, however
    many: this is the answer to a cell that could only show two. */
function DayCard({
  date,
  posts,
  nowMs,
  onOpenPost,
}: {
  date: Date
  posts: SocialPost[]
  nowMs: number
  onOpenPost: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <PopoverTitle className="flex flex-col gap-0.5">
        <span className="text-[0.7rem] text-muted-foreground uppercase">
          {WEEKDAYS[date.getDay()]}
        </span>
        <span className="font-heading text-lg/none font-medium tabular-nums">
          {date.getDate()} {MONTHS[date.getMonth()]}
        </span>
      </PopoverTitle>

      {posts.length ? (
        // Scrolls rather than growing: a day with a dozen posts should not make
        // a card taller than the calendar behind it.
        <ul className="-mx-1 flex max-h-72 flex-col gap-1 overflow-y-auto px-1">
          {posts.map((post) => {
            const body = (
              <>
                <Chip post={post} nowMs={nowMs} />
                <span className="line-clamp-2 px-1 text-[0.7rem]/relaxed text-muted-foreground">
                  {post.variants[0]?.text}
                </span>
              </>
            )
            const shape =
              "flex w-full flex-col gap-1 rounded-md border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-muted/60 focus-visible:border-border focus-visible:bg-muted/60 focus-visible:outline-none"

            return (
              <li key={post.id}>
                {/* An unfinished post opens where it can be worked on; a
                    finished one opens to be read. A link rather than a click
                    handler for the first, so it behaves like the navigation it
                    is — middle-click, open in a new tab, the lot. */}
                {isEditable(post.status) ? (
                  <Link href={editorHrefFor(post.id)} className={shape}>
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPost(post.id)}
                    className={shape}
                  >
                    {body}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-2 text-muted-foreground">Nothing on this day.</p>
      )}
    </div>
  )
}

export function SocialCalendar({
  posts,
  nowMs,
  emptyNote,
}: {
  /** Already filtered — the calendar shows whatever the filters left. */
  posts: SocialPost[]
  /** The one `now` the page settled on. */
  nowMs: number
  emptyNote: string
}) {
  const today = React.useMemo(() => new Date(nowMs), [nowMs])
  const [month, setMonth] = React.useState(() => monthOf(today))
  const [openId, setOpenId] = React.useState<string>()
  // Today is not marked by default. The chips carry the colour in this grid,
  // and a filled disc on one date competes with them for the same glance —
  // it is answering a question nobody asked while looking at the month. The
  // Today button asks it, so the Today button is what marks the day.
  const [markToday, setMarkToday] = React.useState(false)

  const days = React.useMemo(() => monthGrid(month), [month])
  const byDay = React.useMemo(() => groupByDay(posts, nowMs), [posts, nowMs])
  const todayKey = dayKey(today)

  // One cell stands for all of them — every row is the same height by
  // construction — so measuring the first cell's chip area measures the grid.
  const [available, setAvailable] = React.useState<number>()
  const listRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      setAvailable(entry.contentRect.height)
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  // A chip's height, taken from the first one on screen. They are all built the
  // same, so one is the measurement — and it comes from the DOM rather than
  // from a number here, which would go stale the moment the type scale moved.
  const [chipHeight, setChipHeight] = React.useState<number>()
  const measureChip = React.useCallback((node: HTMLSpanElement | null) => {
    if (node) {
      setChipHeight(node.getBoundingClientRect().height)
    }
  }, [])

  const capacity = capacityOf(available, chipHeight)

  const open = posts.find((post) => post.id === openId)
  const openVariants = open
    ? orderPlatformIds(open.variants.map((v) => v.platformId)).flatMap((id) =>
        open.variants.filter((v) => v.platformId === id)
      )
    : []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs/relaxed font-medium">{monthLabel(month)}</h3>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={markToday ? "secondary" : "outline"}
            size="sm"
            aria-pressed={markToday}
            onClick={() => {
              setMonth(monthOf(today))
              setMarkToday(true)
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => {
              setMonth((current) => shiftMonth(current, -1))
              // The mark was an answer to "where is today"; stepping to another
              // month is a different question.
              setMarkToday(false)
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => {
              setMonth((current) => shiftMonth(current, 1))
              setMarkToday(false)
            }}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* A calendar, not a table. The difference is mostly what is drawn: rules
          between the days rather than a box around each one, no fill behind any
          cell, and no frame around the whole thing. An earlier pass had every
          cell outlined and the days outside the month shaded — which is how a
          spreadsheet marks a disabled cell, and it read as one.

          The six week rows share whatever height is left over — `minmax(0,1fr)`
          rather than a minimum height per cell, so the month always ends where
          the page does. A calendar you have to scroll to see the end of the
          month is not showing you the month. */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] overflow-hidden">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 pb-2 text-center text-[0.65rem] font-medium tracking-[0.08em] text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const key = dayKey(day)
          const inMonth = day.getMonth() === month.month
          const isToday = key === todayKey && markToday
          const posted = byDay.get(key) ?? []
          // Every slot the cell has goes to a post. What did not fit is counted
          // Everything fits, or one slot goes to saying how much does not —
          // unless there is only the one slot, which goes to a post instead.
          // The count was taking it on a short row, and a cell reading "3
          // posts" with none of them shown says less than a cell showing one.
          const chipSlots = capacity > 1 ? capacity - 1 : capacity
          const shown =
            posted.length <= capacity ? posted : posted.slice(0, chipSlots)
          const hiddenPosts = posted.slice(shown.length)
          const hidden = hiddenPosts.length
          // The line only goes in a slot of its own. Squeezed in beside a full
          // stack of chips it would be the clipped row the measuring is there
          // to prevent.
          const roomForCount = capacity > shown.length

          return (
            // The day is the target, not the posts inside it. One control per
            // cell rather than one per post, and what it opens can show the
            // day in full — which is the only place a cell two chips tall can
            // honestly send you.
            <Popover key={key}>
              <PopoverTrigger
                aria-label={`${day.getDate()} ${MONTHS[day.getMonth()]} — ${
                  posted.length
                    ? `${posted.length} post${posted.length === 1 ? "" : "s"}`
                    : "no posts"
                }`}
                className={cn(
                  "flex min-h-0 flex-col gap-0.5 overflow-hidden px-1 pt-1 pb-0.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset data-popup-open:bg-muted/60",
                  // Rules between days, drawn on the day itself: a line above
                  // every cell and down the left of every one but the first in
                  // its week, which leaves the outer edges open.
                  "border-t border-border/70",
                  index % 7 === 0 ? undefined : "border-l border-border/70"
                )}
              >
                {/* Centred at the top of the day, where a calendar puts it. A
                    day from the neighbouring month is greyed rather than
                    shaded: the number alone says which month it belongs to,
                    and the cell keeps the same ground as every other. */}
                <span
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center self-center rounded-full text-[0.7rem] tabular-nums",
                    isToday && "bg-foreground font-medium text-background",
                    !isToday && inMonth && "text-foreground",
                    !isToday && !inMonth && "text-muted-foreground/50"
                  )}
                >
                  {day.getDate()}
                </span>

                <span
                  ref={index === 0 ? listRef : undefined}
                  className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden"
                >
                  {shown.map((post, chipIndex) => (
                    <Chip
                      key={post.id}
                      post={post}
                      nowMs={nowMs}
                      ref={chipIndex === 0 ? measureChip : undefined}
                    />
                  ))}

                  {hidden && roomForCount ? (
                    <span className="flex shrink-0 items-center gap-1 px-1 text-[0.7rem] text-muted-foreground">
                      {/* A dot each for the posts there was no room for, in
                          their own colours. The count says how many are down
                          there; the dots say what kind, which is most of what
                          the chips would have said anyway. */}
                      <span aria-hidden className="flex items-center gap-0.5">
                        {hiddenPosts.slice(0, MAX_DOTS).map((post) => (
                          <span
                            key={post.id}
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              STATUS_DOT[post.status]
                            )}
                          />
                        ))}
                      </span>
                      +{hidden} more
                    </span>
                  ) : null}
                </span>
              </PopoverTrigger>

              <PopoverContent align="center" side="bottom">
                <DayCard
                  date={day}
                  posts={posted}
                  nowMs={nowMs}
                  onOpenPost={setOpenId}
                />
              </PopoverContent>
            </Popover>
          )
        })}
      </div>

      {posts.length ? null : (
        <p className="shrink-0 text-xs/relaxed text-muted-foreground">
          {emptyNote}
        </p>
      )}

      {open ? (
        <PostDetailDialog
          post={open}
          variants={openVariants}
          open
          onOpenChange={(next) => setOpenId(next ? openId : undefined)}
        />
      ) : null}
    </div>
  )
}

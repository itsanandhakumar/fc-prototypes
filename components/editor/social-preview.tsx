"use client"

import * as React from "react"
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  ThumbsUp,
} from "lucide-react"

import {
  AttachmentTile,
  type Attachment,
} from "@/components/editor/attachment-dropzone"
import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import type { Platform } from "@/lib/connectors"
import { cn } from "@/lib/utils"

// A mock of how the post would appear once published. Nothing here talks to
// any platform — it is a rendering of the text and attachments already in the
// composer, dressed in that platform's own colours and shapes so the preview
// is recognisable at a glance.

const ACTION_ICONS = {
  like: ThumbsUp,
  comment: MessageCircle,
  repost: Repeat2,
  send: Send,
  heart: Heart,
  views: Eye,
  bookmark: Bookmark,
} as const

const URL_PATTERN = /\b[\w-]+(?:\.[\w-]+)+\/[^\s]*/

function Media({
  attachments,
  rounded,
}: {
  attachments: Attachment[]
  rounded: string
}) {
  if (!attachments.length) {
    return null
  }

  const single = attachments.length === 1

  // Every one of these networks tiles multiple images; one runs full width.
  return (
    <div
      className={cn(
        "grid gap-0.5 overflow-hidden border border-black/10 dark:border-white/10",
        rounded,
        single ? "grid-cols-1" : "grid-cols-2"
      )}
    >
      {attachments.slice(0, 4).map((attachment, index) => (
        <div
          key={attachment.id}
          className={cn(
            "overflow-hidden bg-black/5 dark:bg-white/10",
            single ? "max-h-64" : "aspect-square",
            attachments.length === 3 && index === 0 ? "col-span-2" : undefined
          )}
        >
          <AttachmentTile attachment={attachment} />
        </div>
      ))}
    </div>
  )
}

// The image half of the card is what a share image generated for this post
// would look like: the brand gradient with the headline set over it. With no
// headline there is nothing to set, and a blank rectangle claims an image that
// is not there — so the card comes through as the strip these networks show
// for a page with nothing to picture.
function LinkCard({
  platform,
  url,
  title,
}: {
  platform: Platform
  url: string
  title: string
}) {
  const { chrome } = platform.preview
  const domain = url.split("/")[0]
  const readingLine = `${domain} · 4 min read`

  const heading = title ? (
    <span className="line-clamp-2 text-xs font-semibold">{title}</span>
  ) : null
  const meta = <span className={cn("text-xs", chrome.meta)}>{readingLine}</span>

  return (
    <div
      className={cn("overflow-hidden border", chrome.linkRadius, chrome.card)}
    >
      {title ? (
        <div
          className="flex aspect-[1.91/1] flex-col justify-between p-3"
          style={{
            backgroundImage: `linear-gradient(135deg, ${chrome.accent} 0%, ${chrome.accentTo} 100%)`,
          }}
        >
          <span className="text-[0.65em] font-semibold tracking-[0.2em] text-white/70 uppercase">
            forward.tools
          </span>
          <span className="line-clamp-3 text-sm/snug font-semibold text-white">
            {title}
          </span>
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-0.5 px-3 py-2", chrome.linkFooter)}>
        {chrome.linkOrder === "title-first" ? (
          <>
            {heading}
            {meta}
          </>
        ) : (
          <>
            {meta}
            {heading}
          </>
        )}
      </div>
    </div>
  )
}

/** What a published post actually did. Absent while it is being written, or
    for a draft or a scheduled post — none of which have been seen by anyone. */
export type PreviewMetrics = {
  impressions: number
  likes: number
  comments: number
  reposts: number
}

/** Thousands separators without `toLocaleString`, whose grouping depends on the
    runtime's locale — server and browser need not agree, and a mismatch here
    would be a hydration error. */
function compact(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// LinkedIn is the only one of these that shows reaction chips above the
// actions; everywhere else the counts sit on the actions themselves. Either
// way the figures come from the post, so an unpublished one shows none.
function Reactions({
  platform,
  metrics,
}: {
  platform: Platform
  metrics?: PreviewMetrics
}) {
  const { chrome } = platform.preview

  if (!chrome.reactions || !metrics) {
    return null
  }

  const reacted = metrics.likes + metrics.reposts
  if (reacted === 0 && metrics.comments === 0) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", chrome.meta)}>
      {reacted > 0 ? (
        <>
          <span className="flex items-center -space-x-1">
            <span
              className="flex size-4 items-center justify-center rounded-full text-white ring-1 ring-white dark:ring-black"
              style={{ backgroundColor: chrome.accent }}
            >
              <ThumbsUp className="size-2.5" />
            </span>
            <span className="flex size-4 items-center justify-center rounded-full bg-[#DF704D] text-white ring-1 ring-white dark:ring-black">
              <Heart className="size-2.5" />
            </span>
          </span>
          <span>{compact(reacted)}</span>
        </>
      ) : null}
      {/* Wrapped rather than bare text: two adjacent text nodes collapse into
          one anonymous flex item, and the row's gap would not fall between
          them. */}
      {metrics.comments > 0 ? (
        <span>
          {reacted > 0 ? "· " : ""}
          {compact(metrics.comments)} comment
          {metrics.comments === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  )
}

function ActionRow({
  platform,
  metrics,
}: {
  platform: Platform
  metrics?: PreviewMetrics
}) {
  const { actions, chrome } = platform.preview
  // Networks that put counts on their actions carry a metric per action;
  // the ones that put words there do not.
  const labelled = actions.every((action) => !action.metric)

  return (
    <div
      className={cn(
        "flex items-center text-xs",
        chrome.meta,
        labelled ? "justify-between gap-2" : "gap-5"
      )}
    >
      {actions.map((action, index) => {
        const Icon = ACTION_ICONS[action.icon]
        // A count slot stays empty until the post has been out and earned one.
        const count =
          action.metric && metrics ? compact(metrics[action.metric]) : ""

        return (
          <span key={index} className="flex items-center gap-1.5">
            <Icon className="size-3.5" />
            {action.metric ? count : action.label}
          </span>
        )
      })}
    </div>
  )
}

export function SocialPreview({
  platform,
  text,
  title,
  attachments,
  metrics,
}: {
  platform: Platform
  text: string
  title: string
  attachments: Attachment[]
  /** Only a published post has these. Without them the card shows no
      engagement at all, which is the truth for anything still being written. */
  metrics?: PreviewMetrics
}) {
  const { truncateAt, chrome } = platform.preview
  const url = URL_PATTERN.exec(text)?.[0]

  // A link only renders as a card when nothing else is attached.
  const showLinkCard = Boolean(url) && attachments.length === 0

  // The fold is real on LinkedIn, and so is getting past it. Opening it here
  // does what tapping "see more" does there: the rest of the post, in place.
  const [expanded, setExpanded] = React.useState(false)
  const folds = truncateAt !== null && text.length > truncateAt
  const collapsed = folds && !expanded
  const shown = collapsed ? text.slice(0, truncateAt ?? 0) : text

  const inline = chrome.header === "inline"
  const [name, ...rest] = platform.profile.subtitle.split(" · ")
  const handle = inline ? name : platform.profile.subtitle
  const timestamp = inline ? rest.join(" · ") : ""

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border p-3",
        chrome.radius,
        chrome.card
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: chrome.accent }}
        >
          {platform.profile.initials}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          {inline ? (
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
              <span className="font-semibold">{platform.profile.name}</span>
              <span className={chrome.meta}>{handle}</span>
              {timestamp ? (
                <span className={chrome.meta}>· {timestamp}</span>
              ) : null}
            </span>
          ) : (
            <>
              <span className="text-xs font-semibold">
                {platform.profile.name}
              </span>
              <span className={cn("truncate text-xs", chrome.meta)}>
                {handle}
              </span>
            </>
          )}
        </div>

        {/* The network's own mark, in its own colour. */}
        <PlatformGlyph
          platformId={platform.id}
          className="mt-0.5 text-base"
          style={platformTint(platform)}
        />
      </div>

      <p className="text-xs/relaxed whitespace-pre-line">
        {shown}
        {collapsed ? (
          <>
            …{" "}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={cn("hover:underline", chrome.meta)}
            >
              see more
            </button>
          </>
        ) : null}
      </p>

      <Media attachments={attachments} rounded={chrome.linkRadius} />

      {showLinkCard && url ? (
        <LinkCard platform={platform} url={url} title={title} />
      ) : null}

      <Reactions platform={platform} metrics={metrics} />

      <div className={cn("h-px w-full", chrome.divider)} />

      <ActionRow platform={platform} metrics={metrics} />
    </div>
  )
}

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
import { PlatformGlyph } from "@/components/editor/platform-glyph"
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
// would look like: the brand gradient with the headline set over it.
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

  const heading = (
    <span className="line-clamp-2 text-xs font-semibold">{title}</span>
  )
  const meta = <span className={cn("text-xs", chrome.meta)}>{readingLine}</span>

  return (
    <div
      className={cn("overflow-hidden border", chrome.linkRadius, chrome.card)}
    >
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

// LinkedIn is the only one of these that shows reaction chips above the
// actions; everywhere else the counts sit on the actions themselves.
function Reactions({ platform }: { platform: Platform }) {
  const { chrome } = platform.preview
  if (!chrome.reactions) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", chrome.meta)}>
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
      {chrome.reactions}
    </div>
  )
}

function ActionRow({ platform }: { platform: Platform }) {
  const { actions, chrome } = platform.preview
  // Labelled actions read as a row of buttons; bare counts sit closer together.
  const labelled = actions.every((action) => action.label.length > 2)

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
        return (
          <span key={index} className="flex items-center gap-1.5">
            <Icon className="size-3.5" />
            {action.label}
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
}: {
  platform: Platform
  text: string
  title: string
  attachments: Attachment[]
}) {
  const { truncateAt, chrome } = platform.preview
  const url = URL_PATTERN.exec(text)?.[0]

  // A link only renders as a card when nothing else is attached.
  const showLinkCard = Boolean(url) && attachments.length === 0

  const collapsed = truncateAt !== null && text.length > truncateAt
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
          style={
            chrome.glyphTint === "accent" ? { color: chrome.accent } : undefined
          }
        />
      </div>

      <p className="text-xs/relaxed whitespace-pre-line">
        {shown}
        {collapsed ? <span className={chrome.meta}>… see more</span> : null}
      </p>

      <Media attachments={attachments} rounded={chrome.linkRadius} />

      {showLinkCard && url ? (
        <LinkCard platform={platform} url={url} title={title} />
      ) : null}

      <Reactions platform={platform} />

      <div className={cn("h-px w-full", chrome.divider)} />

      <ActionRow platform={platform} />
    </div>
  )
}

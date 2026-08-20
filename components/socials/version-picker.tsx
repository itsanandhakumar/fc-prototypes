"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import { SocialPreview } from "@/components/editor/social-preview"
import { Button } from "@/components/ui/button"
import type { Platform } from "@/lib/connectors"
import { cn } from "@/lib/utils"

// A generated draft is one answer to a brief, and reading it alone gives you
// nothing to judge it against. Three of them, offered as a deck, turn the first
// question from "is this good?" into "which of these?" — a far easier one.
//
// The deck is the shape rather than a row of three columns: a row asks you to
// read everything before choosing anything, while a deck puts one post in front
// of you with the others visibly waiting behind it. Each platform keeps its own
// deck, because the same argument at 280 characters and at 3,000 is two
// different posts and they are not chosen together.

// A fan, the way a handful of photographs ends up when they are put down
// without being squared off: each card swung further round than the one in
// front of it and pushed out to the same side, so the pile opens leftward and
// every card shows its own corner.
//
// The angles do the work and the cards stay near full size — shrinking them is
// what a tidy deck does, and it buries them. The scatter is fixed rather than
// random: a pile that fell differently on every render would be noise, and it
// would move under the reader every time they chose a card.
const SCATTER = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: -24, y: 5, rotate: -8, scale: 0.985 },
  { x: -46, y: 10, rotate: -16, scale: 0.97 },
]

/**
 * The card is the post as it will appear, so it is shaped like the post as it
 * will appear: the width of a feed column, and tall enough for the platform's
 * own copy. A long-form post fills a card an X post would leave two thirds
 * empty, so they are not given the same one.
 */
const CARD_WIDTH = "w-96"
/** In rem, so the decks can be measured against each other. */
function cardHeightOf(platform: Platform): number {
  return platform.copy === "long" ? 22 : 15
}

/**
 * Room for the corners the fan swings out. A card turned about its own centre
 * throws two corners up and two down, so the clearance is the same above and
 * below — without it the raised corners climb into the heading.
 */
const SCATTER_MARGIN = 60

function Deck({
  platform,
  versions,
  active,
  sourceTitle,
  boxHeight,
  onSelect,
}: {
  platform: Platform
  versions: string[]
  active: number
  /** Headline for a link card, on the rare draft that carries a link. */
  sourceTitle: string
  /** The tallest card on the screen, in rem. Every deck is given the same box
      so their bars come out on one line, and each pile centres in its own. */
  boxHeight: number
  onSelect: (index: number) => void
}) {
  const count = versions.length
  const cardHeight = cardHeightOf(platform)

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs/relaxed font-medium">
          <PlatformGlyph
            platformId={platform.id}
            style={platformTint(platform)}
          />
          {platform.name}
        </span>
        <span className="text-xs/relaxed text-muted-foreground tabular-nums">
          {active + 1} of {count}
        </span>
      </div>

      {/* The stack needs a size of its own: the cards are taken out of flow so
          they can sit on top of each other. The clearance around them is held
          by the cards' own insets rather than by padding here — an absolutely
          positioned child measures inset-0 against the padding box, so padding
          on this box would not move it at all. */}
      <div
        className="relative w-[30rem]"
        style={{ height: `calc(${boxHeight}rem + ${SCATTER_MARGIN * 2}px)` }}
      >
        {versions.map((text, index) => {
          // Cards are ordered by how far behind the front one they are, so
          // choosing a buried card deals it to the top rather than reordering
          // the deck under the reader.
          const depth = (index - active + count) % count
          const front = depth === 0
          const lie = SCATTER[Math.min(depth, SCATTER.length - 1)]

          return (
            // A div rather than a button, and only the buried ones take a
            // click: the front card is already chosen, so pressing it does
            // nothing, and leaving it a button would swallow the "see more"
            // inside its own preview — a button inside a button is not markup
            // a browser will honour. The bars below stay the keyboard path.
            <div
              key={index}
              role={front ? undefined : "button"}
              onClick={front ? undefined : () => onSelect(index)}
              aria-label={
                front
                  ? undefined
                  : `Version ${index + 1} of ${count} for ${platform.name}`
              }
              style={{
                height: `${cardHeight}rem`,
                // Centred in the box rather than hung from its top, so a short
                // deck sits in the middle of the space a tall one fills.
                top: `calc(50% - ${cardHeight / 2}rem)`,
                transform: `translate(${lie.x}px, ${lie.y}px) rotate(${lie.rotate}deg) scale(${lie.scale})`,
                zIndex: count - depth,
              }}
              className={cn(
                // Inset left, because that is the side the fan opens towards.
                `absolute left-20 ${CARD_WIDTH}`,
                "flex flex-col gap-2 rounded-lg border p-3 text-left shadow-sm transition-all duration-150 focus-visible:outline-none",
                // The card being read is the white one. The ones behind take
                // the page's own grey — two white cards edge to edge on a white
                // page read as one card with a thick border — and the shadow
                // the front one casts over them is what sets them back.
                front
                  ? "border-ring bg-card shadow-lg"
                  : "cursor-pointer border-border bg-muted hover:border-foreground/25"
              )}
            >
              {/* The post as it will appear, not the words it is made of —
                  what is being chosen between is three posts, and a feed card
                  is what a post looks like.

                  Only the front one carries a preview at all. The cards behind
                  show a corner each, where a preview would be noise, and one
                  rendered invisibly there would still put its "see more" in
                  the tab order. */}
              {front ? (
                <>
                  {/* An opened post is longer than the card it is in, so the
                      card scrolls rather than growing — the pile has to keep
                      its shape while one of its cards is being read. */}
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SocialPreview
                      platform={platform}
                      text={text}
                      title={sourceTitle}
                      attachments={[]}
                    />
                  </div>
                  <span className="shrink-0 text-xs/relaxed text-muted-foreground tabular-nums">
                    {text.length} / {platform.characterLimit}
                  </span>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* A card behind is only half a target, so the deck gets a row of them
          too — and they say how many there are without being counted.

          Lined up under the card rather than stretched across the box it
          floats in: `ml-20 w-96` is the card's own `left-20 w-96`. The bars
          are a fixed short length now — at full width they read as a loading
          bar rather than as three things to choose between. */}
      {count > 1 ? (
        <div className="ml-20 flex w-96 items-center justify-center gap-2">
          {/* The deck is a loop — the fan wraps, and so do these. With three
              cards an arrow that greys out at either end is disabled half the
              time it is looked at, and the count above says where you are. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Previous version for ${platform.name}`}
            onClick={() => onSelect((active - 1 + count) % count)}
          >
            <ChevronLeft />
          </Button>

          <div className="flex items-center gap-1.5">
            {versions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`Show version ${index + 1} for ${platform.name}`}
                aria-pressed={index === active}
                className={cn(
                  "h-1.5 w-8 rounded-full transition-colors",
                  index === active
                    ? "bg-foreground"
                    : "bg-border hover:bg-foreground/30"
                )}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Next version for ${platform.name}`}
            onClick={() => onSelect((active + 1) % count)}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function VersionPicker({
  platforms,
  versions,
  sourceTitle,
  onUse,
  saving,
}: {
  /** The platforms this post is going to, in registry order. */
  platforms: Platform[]
  /** The drafts on offer, per platform. */
  versions: Record<string, string[]>
  /** What the post is about, for a preview that renders a link card. */
  sourceTitle: string
  /** Called with the chosen draft per platform. The words themselves travel
      now rather than a version number: a model does not rebuild the same post
      from the same brief, so the deck's output has to be carried rather than
      regenerated. */
  onUse: (chosen: Record<string, string>) => void
  /** Set while the selection is being saved, so the button cannot fire twice. */
  saving?: boolean
}) {
  const [active, setActive] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(platforms.map((platform) => [platform.id, 0]))
  )

  // Every deck is given the tallest deck's box. Cards keep their own platform's
  // height inside it, so the piles stay their real shapes and their bars still
  // come out on one line.
  const boxHeight = platforms.length
    ? Math.max(...platforms.map(cardHeightOf))
    : 0

  function use() {
    onUse(
      Object.fromEntries(
        platforms.flatMap((platform) => {
          const text = versions[platform.id]?.[active[platform.id] ?? 0]
          return text ? [[platform.id, text]] : []
        })
      )
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs/relaxed font-medium">Pick a version</span>
        <span className="text-xs/relaxed text-muted-foreground">
          Three drafts of each. Choose one to carry into the editor — you can
          rewrite it there.
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto p-0.5 lg:flex-row lg:justify-center">
        {platforms.map((platform) => (
          <Deck
            key={platform.id}
            platform={platform}
            versions={versions[platform.id] ?? []}
            active={active[platform.id] ?? 0}
            sourceTitle={sourceTitle}
            boxHeight={boxHeight}
            onSelect={(index) =>
              setActive((current) => ({ ...current, [platform.id]: index }))
            }
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-4">
        <Button type="button" size="lg" disabled={saving} onClick={use}>
          {saving
            ? "Opening…"
            : `Use ${platforms.length > 1 ? "these" : "this"}`}
        </Button>
      </div>
    </div>
  )
}

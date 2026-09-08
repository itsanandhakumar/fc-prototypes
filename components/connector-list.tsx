"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import {
  connectBlogDestination,
  connectPlatform,
  disconnectPlatform,
} from "@/app/connector-actions"
import { BlogLanguageDialog } from "@/components/blog-language-dialog"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { blogLanguageName } from "@/lib/blog-language"
import {
  BLOG_DESTINATIONS,
  findBlogDestination,
  PLATFORMS,
  SOCIAL_PLATFORM_IDS,
  type BlogDestination,
} from "@/lib/connectors"

// The two kinds of connection are kept apart because they belong to different
// products: the blog publishes to a CMS, Social Studio posts to networks. A
// flat list made it look like any of them could receive any of the work.

type Kind = "blog" | "social"

/** Both kinds flattened to what the list actually draws. */
type Connection = { id: string; name: string; subtitle: string; note?: string }

const GROUPS: Array<{ kind: Kind; heading: string; hint: string }> = [
  {
    kind: "blog",
    heading: "Blog",
    hint: "Where a published post goes.",
  },
  {
    kind: "social",
    heading: "Social",
    hint: "Where Social Studio posts.",
  },
]

function connectionsOf(kind: Kind, blogLanguage?: string): Connection[] {
  if (kind === "blog") {
    return BLOG_DESTINATIONS.map((destination) => ({
      id: destination.id,
      name: destination.name,
      subtitle: destination.account,
      // Answered once when the blog was connected, and shown here because
      // otherwise the answer would vanish the moment it was given.
      note: blogLanguageName(blogLanguage),
    }))
  }

  // Only what Social Studio actually offers. Connecting one of the others
  // would leave an account attached to nothing that can post to it.
  return PLATFORMS.filter((platform) =>
    SOCIAL_PLATFORM_IDS.includes(platform.id)
  ).map((platform) => ({
    id: platform.id,
    name: platform.name,
    subtitle: platform.handle,
  }))
}

function ConnectorGroup({
  heading,
  hint,
  connections,
  connectedIds,
  pending,
  onConnect,
  onDisconnect,
}: {
  heading: string
  hint: string
  connections: Connection[]
  connectedIds: string[]
  pending: boolean
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
}) {
  const connected = connections.filter((item) => connectedIds.includes(item.id))
  const available = connections.filter(
    (item) => !connectedIds.includes(item.id)
  )

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-medium">{heading}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      {/* Only what is actually connected is listed; anything else is behind
          the add button, so the group reads as this account's connections
          rather than a catalogue. */}
      {connected.length ? (
        <ul className="flex flex-col gap-2">
          {connected.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <PlatformGlyph
                  platformId={item.id}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.note
                      ? `${item.subtitle} · ${item.note}`
                      : item.subtitle}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => onDisconnect(item.id)}
              >
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-input px-2.5 py-3 text-xs text-muted-foreground">
          Nothing connected yet.
        </p>
      )}

      {available.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                disabled={pending}
              >
                <Plus />
                Add connection
              </Button>
            }
          />

          <DropdownMenuContent align="start" className="w-56 min-w-56">
            {available.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onConnect(item.id)}
              >
                <PlatformGlyph platformId={item.id} />
                {item.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </section>
  )
}

export function ConnectorList({
  connectedIds,
  /** Narrows the panel to one group, for a dialog that is only about that
      one — the editor asking for a blog has no business offering X. */
  only,
  /** The blog's language, or undefined if it has never been chosen — which is
      what makes connecting a blog stop to ask for it. */
  blogLanguage,
}: {
  connectedIds: string[]
  only?: Kind
  blogLanguage?: string
}) {
  const [pending, startPending] = React.useTransition()
  // The blog waiting on a language before it is connected. Null the rest of
  // the time, which is every connection after the first.
  const [asking, setAsking] = React.useState<BlogDestination | null>(null)

  const groups = only ? GROUPS.filter((group) => group.kind === only) : GROUPS

  function connect(id: string) {
    const destination = findBlogDestination(id)

    // A blog whose language nobody has chosen yet is the one case connecting
    // is not a single click: the answer has to come with the connection, so
    // the dialog is asked first and does the connecting itself.
    if (destination && !blogLanguage) {
      setAsking(destination)
      return
    }

    startPending(async () => connectPlatform(id))
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <ConnectorGroup
          key={group.kind}
          heading={group.heading}
          hint={group.hint}
          connections={connectionsOf(group.kind, blogLanguage)}
          connectedIds={connectedIds}
          pending={pending}
          onConnect={connect}
          onDisconnect={(id) =>
            startPending(async () => disconnectPlatform(id))
          }
        />
      ))}

      <BlogLanguageDialog
        destination={asking}
        open={Boolean(asking)}
        onOpenChange={(open) => {
          if (!open) {
            setAsking(null)
          }
        }}
        pending={pending}
        onConfirm={(languageCode) => {
          const destination = asking
          if (!destination) {
            return
          }
          startPending(async () => {
            await connectBlogDestination(destination.id, languageCode)
            setAsking(null)
          })
        }}
      />
    </div>
  )
}

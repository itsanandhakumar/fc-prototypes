"use client"

import { ConnectorList } from "@/components/connector-list"
import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Platform } from "@/lib/connectors"

// A post cannot go somewhere the account is not signed in to. Both of the ways
// out of the workspace hit that wall, so both show the same thing — and both
// show it *instead of* what they were going to ask, the way the blog's publish
// dialog does. Stacked under the picker it made a card taller than the window;
// it is also not a footnote. There is one thing to do here, and this is it.

export function ConnectStep({
  missing,
  connectedIds,
  /** What is blocked, as the verb the title ends on. */
  action,
}: {
  missing: Platform[]
  connectedIds: string[]
  action: "post" | "schedule"
}) {
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pr-8">
          Connect
          {missing.map((platform, index) => (
            <span key={platform.id} className="flex items-center gap-1.5">
              <PlatformGlyph
                platformId={platform.id}
                style={platformTint(platform)}
              />
              {platform.name}
              {index < missing.length - 1 ? " and" : ""}
            </span>
          ))}
          to {action}
        </DialogTitle>
        <DialogDescription>
          {action === "post"
            ? "A post only goes to a network this account is signed in to."
            : "A queued post needs somewhere to go when it fires."}{" "}
          Connect it, or take it off the post to carry on without it.
          Connections also live in Settings.
        </DialogDescription>
      </DialogHeader>

      <ConnectorList connectedIds={connectedIds} only="social" />
    </div>
  )
}

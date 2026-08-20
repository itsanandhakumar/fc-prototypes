"use client"

import * as React from "react"
import { Settings } from "lucide-react"

import { SettingsDialog } from "@/components/settings-dialog"
import type { BodyView } from "@/lib/preferences"

// The foot of the sidebar. Styled as a nav item rather than a button so it
// reads as the last thing in the list rather than a control bolted underneath
// it — the account itself lives inside Settings for now.
export function SettingsButton({
  defaultBodyView,
  connectedIds,
  name,
  email,
  image,
}: {
  defaultBodyView: BodyView
  connectedIds: string[]
  name: string
  email: string
  image: string | null
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs/relaxed font-medium text-sidebar-foreground/80 transition-colors outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4 [&_svg]:shrink-0"
      >
        <Settings />
        Settings
      </button>

      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        defaultBodyView={defaultBodyView}
        connectedIds={connectedIds}
        name={name}
        email={email}
        image={image}
      />
    </>
  )
}

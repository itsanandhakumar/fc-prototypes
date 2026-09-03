"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Settings } from "lucide-react"

import { SettingsDialog } from "@/components/settings-dialog"
import type { BodyView } from "@/lib/preferences"

// The foot of the sidebar. Styled as a nav item rather than a button so it
// reads as the last thing in the list rather than a control bolted underneath
// it — the account itself lives inside Settings for now.
export function SettingsButton({
  defaultBodyView,
  connectedIds,
  hubspotLabel,
  hubspotNeedsSetup,
  name,
  email,
  image,
}: {
  defaultBodyView: BodyView
  connectedIds: string[]
  /** Which portal and blog, once connected. */
  hubspotLabel?: string | null
  /** Approved in HubSpot, but not yet pointed at a blog. */
  hubspotNeedsSetup?: boolean
  name: string
  email: string
  image: string | null
}) {
  // Coming back from HubSpot's consent screen lands on /blogger, because a
  // dialog has no address of its own to return to. The callback says where the
  // customer was going, and this puts them back there — open, on Connectors,
  // rather than on a page that looks like nothing happened.
  const params = useSearchParams()
  const requested = params.get("settings")
  const hubspotError = params.get("hubspotError")

  // Open is derived rather than synchronised: the URL decides until someone
  // opens or closes the dialog by hand, and from then on they do. An effect
  // that pushed the URL into state would fight the customer for the close
  // button, since the parameter is still there after they press it.
  const [override, setOverride] = React.useState<boolean | null>(null)
  const open = override ?? Boolean(requested)
  const setOpen = setOverride

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
        hubspotLabel={hubspotLabel}
        hubspotNeedsSetup={hubspotNeedsSetup}
        hubspotError={hubspotError}
        initialSection={requested === "connectors" ? "connectors" : undefined}
        name={name}
        email={email}
        image={image}
      />
    </>
  )
}

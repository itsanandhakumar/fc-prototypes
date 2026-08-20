"use client"

import { Plug } from "lucide-react"

import { PLATFORMS } from "@/lib/connectors"

// Connectors are on the roadmap, not in this release. The panel shows what is
// coming and stays inert: nothing here is a button, so there is no affordance
// suggesting an account can be linked yet.
export function ConnectorList() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-md border border-dashed border-border px-3 py-2.5">
        <Plug className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-xs/relaxed text-muted-foreground">
          Nothing connected yet. Publishing straight to social is coming with
          Forward Studio — for now, use{" "}
          <span className="font-medium text-foreground">Copy</span> in the
          editor to take a post wherever you need it.
        </p>
      </div>

      <ul
        aria-label="Planned connectors"
        className="flex flex-col divide-y divide-border rounded-md border border-border opacity-60"
      >
        {PLATFORMS.map((platform) => (
          <li
            key={platform.id}
            className="flex items-center justify-between gap-4 px-3 py-2.5"
          >
            <span className="text-xs font-medium">{platform.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {platform.characterLimit.toLocaleString()} characters
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

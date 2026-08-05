"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { connectPlatform, disconnectPlatform } from "@/app/connector-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PLATFORMS } from "@/lib/connectors"

// Only what is actually connected is listed; anything else is behind the add
// button, so the list reads as this account's connections rather than a
// catalogue.
export function ConnectorList({ connectedIds }: { connectedIds: string[] }) {
  const [pending, startPending] = React.useTransition()

  const connected = PLATFORMS.filter((platform) =>
    connectedIds.includes(platform.id)
  )
  const available = PLATFORMS.filter(
    (platform) => !connectedIds.includes(platform.id)
  )

  return (
    <div className="flex flex-col gap-2">
      {connected.length ? (
        <ul className="flex flex-col gap-2">
          {connected.map((platform) => (
            <li
              key={platform.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-medium">{platform.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {platform.handle}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startPending(async () => disconnectPlatform(platform.id))
                }
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
            {available.map((platform) => (
              <DropdownMenuItem
                key={platform.id}
                onClick={() =>
                  startPending(async () => connectPlatform(platform.id))
                }
              >
                {platform.name}
                <span className="ml-auto text-muted-foreground">
                  {platform.characterLimit.toLocaleString()} characters
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

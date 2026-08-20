"use client"

import { ChevronDown } from "lucide-react"

import { PlatformGlyph, platformTint } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Platform } from "@/lib/connectors"

// Where the post is going, as one control rather than a row of them. A strip of
// toggles says everything at once and grows with every platform added; a menu
// says the answer and keeps the question behind it. The trigger carries the
// marks of what is selected, so the answer is readable without opening it.
export function PlatformMenu({
  platforms,
  selectedIds,
  onToggle,
}: {
  platforms: Platform[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const chosen = platforms.filter((platform) =>
    selectedIds.includes(platform.id)
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" className="h-9" />}
      >
        {chosen.length ? (
          <>
            {chosen.map((platform) => (
              <PlatformGlyph
                key={platform.id}
                platformId={platform.id}
                style={platformTint(platform)}
              />
            ))}
            {chosen.map((platform) => platform.name).join(", ")}
          </>
        ) : (
          "Pick a platform"
        )}
        <ChevronDown />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        {/* The label names the group it labels, and Base UI means that
            literally — a GroupLabel outside a Group throws. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Post to</DropdownMenuLabel>
          {platforms.map((platform) => (
            <DropdownMenuCheckboxItem
              key={platform.id}
              checked={selectedIds.includes(platform.id)}
              // The last one standing stays on: a post has to go somewhere.
              disabled={
                selectedIds.length === 1 && selectedIds[0] === platform.id
              }
              onCheckedChange={() => onToggle(platform.id)}
            >
              <PlatformGlyph
                platformId={platform.id}
                style={platformTint(platform)}
              />
              {platform.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

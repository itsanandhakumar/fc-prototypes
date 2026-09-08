"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * Which company's history is on screen.
 *
 * The history is one company at a time for the same reason the dashboard is:
 * runs from two companies interleaved by date read as one company's results
 * getting worse and better at random. Yours is the default and stays at the
 * top of the list; the others are here because comparing them is why they were
 * audited at all.
 *
 * The choice lives in the address bar rather than in state, so a particular
 * company's history is a page that can be linked to and come back to.
 */
export function HistorySitePicker({
  selected,
  sites,
  company,
}: {
  selected: string
  /** Every company with a run against it, the account's own first. */
  sites: string[]
  /** The account's own company, if it has been named. */
  company?: string
}) {
  const router = useRouter()
  const [pending, startPending] = React.useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn("max-w-72", pending && "opacity-60")}
            disabled={pending}
          />
        }
      >
        <span className="min-w-0 truncate">{selected}</span>
        <ChevronDown className="shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Audited companies</DropdownMenuLabel>
          {sites.map((site) => (
            <DropdownMenuItem
              key={site}
              onClick={() => {
                if (site === selected) {
                  return
                }
                startPending(() =>
                  router.push(`/audit/history?site=${encodeURIComponent(site)}`)
                )
              }}
            >
              {/* The tick keeps its column whether or not it is showing, so
                  the addresses stay aligned down the list. */}
              <Check
                className={cn("shrink-0", site !== selected && "invisible")}
                aria-hidden
              />
              <span className="min-w-0 truncate">{site}</span>
              {site === company ? (
                <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                  Yours
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

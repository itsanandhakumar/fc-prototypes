"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PenLine, Share2 } from "lucide-react"

import { COMING_SOON, SOCIALS_ENABLED } from "@/lib/release"
import { cn } from "@/lib/utils"

// The products in the suite. `owns` decides which one is lit: the editor is
// part of Blogger even though its route does not say so, so matching on the
// href alone would leave the sidebar looking unselected mid-edit.
const SECTIONS = [
  {
    href: "/blogger",
    label: "Blogger",
    icon: PenLine,
    owns: (path: string) =>
      path.startsWith("/blogger") || path.startsWith("/editor"),
    enabled: true,
  },
  {
    href: "/socials",
    label: "Socials",
    icon: Share2,
    owns: (path: string) => path.startsWith("/socials"),
    enabled: SOCIALS_ENABLED,
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Products"
      className="flex min-h-0 flex-1 flex-col gap-0.5 p-2"
    >
      {SECTIONS.map(({ href, label, icon: Icon, owns, enabled }) => {
        const current = owns(pathname)

        // Shown rather than hidden. A suite with one product in the sidebar
        // reads as finished; one with a second marked coming soon says what it
        // is going to be.
        if (!enabled) {
          return (
            <span
              key={href}
              aria-disabled="true"
              title={COMING_SOON}
              className="flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-xs/relaxed font-medium text-sidebar-foreground/40 [&_svg]:size-4 [&_svg]:shrink-0"
            >
              <Icon />
              {label}
              <span className="ml-auto rounded-full bg-sidebar-accent/60 px-1.5 py-0.5 text-[0.625rem] font-normal text-sidebar-foreground/60">
                Soon
              </span>
            </span>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-2 text-xs/relaxed font-medium transition-colors",
              "[&_svg]:size-4 [&_svg]:shrink-0",
              current
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

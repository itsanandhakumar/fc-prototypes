"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardCheck, PenLine, Share2 } from "lucide-react"

import { cn } from "@/lib/utils"

// The products in the suite. `owns` decides which one is lit: the editor is
// part of Blogger even though its route does not say so, so matching on the
// href alone would leave the sidebar looking unselected mid-edit.
const SECTIONS = [
  {
    href: "/audit",
    label: "Audit",
    icon: ClipboardCheck,
    owns: (path: string) => path.startsWith("/audit"),
  },
  {
    href: "/blogger",
    label: "Blogger",
    icon: PenLine,
    owns: (path: string) =>
      path.startsWith("/blogger") || path.startsWith("/editor"),
  },
  {
    href: "/socials",
    label: "Socials",
    icon: Share2,
    owns: (path: string) => path.startsWith("/socials"),
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Products"
      className="flex min-h-0 flex-1 flex-col gap-0.5 p-2"
    >
      {SECTIONS.map(({ href, label, icon: Icon, owns }) => {
        const current = owns(pathname)

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

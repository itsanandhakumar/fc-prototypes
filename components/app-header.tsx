import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type Crumb = { label: string; href?: string }

// The trail, and nothing else. The brand sits in the sidebar now and the
// account controls sit at its foot, so on a page with nowhere to point back to
// there is no bar at all rather than an empty strip above the content.
export function AppHeader({ breadcrumbs = [] }: { breadcrumbs?: Crumb[] }) {
  if (!breadcrumbs.length) {
    return null
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b bg-background px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 text-xs/relaxed"
      >
        {breadcrumbs.map((crumb, index) => (
          <span
            key={`${crumb.label}-${index}`}
            className="flex min-w-0 items-center gap-1.5"
          >
            {/* Separators sit between crumbs, so the first goes without. */}
            {index ? (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}

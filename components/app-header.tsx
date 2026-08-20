import Link from "next/link"
import { cookies } from "next/headers"
import { ChevronRight } from "lucide-react"

import { BrandLockup } from "@/components/brand-lockup"
import { SettingsDialog } from "@/components/settings-dialog"
import { displayNameOf } from "@/lib/auth"
import { BODY_VIEW_COOKIE, parseBodyView } from "@/lib/preferences"
import { requireUser } from "@/lib/session"

export type Crumb = { label: string; href?: string }

// One bar for every signed-in page. Opaque and sticky so content scrolling
// underneath never shows through it.
export async function AppHeader({
  breadcrumbs = [],
}: {
  breadcrumbs?: Crumb[]
}) {
  const user = await requireUser()
  const cookieStore = await cookies()
  const defaultBodyView = parseBodyView(
    cookieStore.get(BODY_VIEW_COOKIE)?.value
  )

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* flex, not the default inline: an inline-flex lockup would otherwise
            hang off this anchor's text baseline instead of being centred. */}
        <Link
          href="/dashboard"
          aria-label="Forward Blogger"
          className="flex items-center"
        >
          {/* Mark only up here. The name is set a step up from the crumbs
              beside it; the mark's height is em-based, so it is pinned back to
              the size it was rather than growing with the word. */}
          <BrandLockup
            variant="mark"
            className="text-[0.875rem] font-medium [&_svg]:h-[1.37em]"
          />
        </Link>

        {breadcrumbs.length ? (
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-xs/relaxed"
          >
            {breadcrumbs.map((crumb, index) => (
              <span
                key={`${crumb.label}-${index}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                {/* Separators sit between crumbs. The first one follows the
                    brand, which is a mark rather than a crumb, so it does not
                    get one. */}
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
        ) : null}
      </div>

      {/* Account lives inside Settings, so the bar carries one control. */}
      <div className="flex shrink-0 items-center">
        <SettingsDialog
          defaultBodyView={defaultBodyView}
          name={displayNameOf(user.name, user.email)}
          email={user.email}
          image={user.image}
        />
      </div>
    </header>
  )
}

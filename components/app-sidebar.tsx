import Link from "next/link"
import { cookies } from "next/headers"

import { BrandLockup } from "@/components/brand-lockup"
import { SettingsButton } from "@/components/settings-button"
import { SidebarNav } from "@/components/sidebar-nav"
import { displayNameOf } from "@/lib/auth"
import { connectedProviders, connectionSummaries } from "@/lib/connections"
import { BODY_VIEW_COOKIE, parseBodyView } from "@/lib/preferences"
import { requireUser } from "@/lib/session"

// The frame the whole suite hangs off: the company at the top, its products in
// the middle, the account at the foot. Blogger is one of the products rather
// than the whole application, which is what the mark up here now says.
export async function AppSidebar() {
  const user = await requireUser()
  const cookieStore = await cookies()
  const defaultBodyView = parseBodyView(
    cookieStore.get(BODY_VIEW_COOKIE)?.value
  )
  const connectedIds = await connectedProviders(user.id)
  const hubspot = (await connectionSummaries(user.id)).find(
    (summary) => summary.provider === "hubspot"
  )

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Same height as the breadcrumb bar beside it, so the two top edges
          read as one line across the window. */}
      <div className="flex h-12 shrink-0 items-center px-3">
        <Link
          href="/blogger"
          aria-label="Forward"
          className="flex items-center rounded-md px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandLockup
            variant="mark"
            name="Forward"
            className="text-sm font-medium [&_svg]:h-[1.37em]"
          />
        </Link>
      </div>

      <SidebarNav />

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <SettingsButton
          defaultBodyView={defaultBodyView}
          connectedIds={connectedIds}
          hubspotLabel={hubspot?.accountLabel ?? null}
          name={displayNameOf(user.name, user.email)}
          email={user.email}
          image={user.image}
        />
      </div>
    </aside>
  )
}

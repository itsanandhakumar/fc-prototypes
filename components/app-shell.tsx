import { AppHeader, type Crumb } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"

// Every signed-in page sits in this frame: sidebar down the left, the page's
// own trail and content to the right of it. The login screen is the one route
// that does not use it, which is why it is a component the pages opt into
// rather than a layout they all inherit.
export function AppShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs?: Crumb[]
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar />

      {/* min-w-0 so a wide page — the editor's columns, the post table —
          shrinks here instead of pushing the sidebar off-screen. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader breadcrumbs={breadcrumbs} />
        {children}
      </div>
    </div>
  )
}

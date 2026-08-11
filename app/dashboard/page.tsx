import { cookies } from "next/headers"

import { AppShell } from "@/components/app-shell"
import { NewPostDialog } from "@/components/editor/new-post-dialog"
import { PostList } from "@/components/post-list"
import { findAccount, greetingNameOf, SESSION_COOKIE } from "@/lib/auth"
import { getPosts } from "@/lib/post-store"

export default async function MainPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; posted?: string }>
}) {
  // Set by Save and by Post in the editor, both of which land back here.
  const { saved, posted } = await searchParams
  const highlightedId = saved ?? posted

  const posts = getPosts()

  // Whoever the session points at. A cookie naming an account that no longer
  // exists still gets a greeting, just not a personal one.
  const cookieStore = await cookies()
  const account = findAccount(cookieStore.get(SESSION_COOKIE)?.value)
  const greeting = account ? `Hi, ${greetingNameOf(account.name)}` : "Hi there"

  return (
    // Home is where the sidebar's mark already leads, so this page carries no
    // trail — the pages beyond it start theirs with Home.
    <AppShell>
      {/* The page itself does not scroll — the posts card takes the slack and
          scrolls internally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          {/* The product names itself here the way Socials does, so moving
              between the two reads as the same page changing its contents. */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-lg font-medium">Blogger</h1>
            <p className="text-lg text-muted-foreground">{greeting}</p>
          </div>
          {/* The brief opens over the workspace, so a new post never leaves
              this page until there is a draft to edit. */}
          <NewPostDialog />
        </div>

        <PostList posts={posts} highlightedId={highlightedId} />
      </main>
    </AppShell>
  )
}

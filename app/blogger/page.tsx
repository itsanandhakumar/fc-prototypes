import { AppShell } from "@/components/app-shell"
import { NewPostDialog } from "@/components/editor/new-post-dialog"
import { PostList } from "@/components/post-list"
import { displayNameOf, greetingNameOf } from "@/lib/auth"
import { getPosts } from "@/lib/post-store"
import { requireUser } from "@/lib/session"

export default async function MainPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; posted?: string }>
}) {
  const user = await requireUser()

  // Set by Save and by Publish in the editor, both of which land back here.
  const { saved, posted } = await searchParams
  const highlightedId = saved ?? posted

  // Only this account's posts. The store filters on `userId`, so there is no
  // path here that could return someone else's.
  const posts = await getPosts(user.id)

  const greeting = `Hi, ${greetingNameOf(displayNameOf(user.name, user.email))}`

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

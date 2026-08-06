import { AppHeader } from "@/components/app-header"
import { NewPostDialog } from "@/components/editor/new-post-dialog"
import { PostList } from "@/components/post-list"
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

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {/* Home is where the brand mark already leads, so the bar carries no
          trail here — the pages beyond it start theirs with Home. */}
      <AppHeader />

      {/* The page itself does not scroll — the posts card takes the slack and
          scrolls internally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-medium">
            Welcome, this is your blog workspace.
          </h1>
          {/* The brief opens over the workspace, so a new post never leaves
              this page until there is a draft to edit. */}
          <NewPostDialog />
        </div>

        <PostList posts={posts} highlightedId={highlightedId} />
      </main>
    </div>
  )
}

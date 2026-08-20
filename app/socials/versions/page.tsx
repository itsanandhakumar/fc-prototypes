import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { VersionDeck } from "@/components/socials/version-deck"
import { PLATFORMS } from "@/lib/connectors"
import { getPost } from "@/lib/post-store"
import { requireUser } from "@/lib/session"
import { nameOf, parsePlatformIds, type PostSource } from "@/lib/social-flow"

// The deck, as a page. It was a state inside the editor before, which meant it
// had no address: nothing to link to, nothing to come back to when the version
// you took turns out to be the wrong one.
//
// What it shows is no longer rebuilt from the URL — the model does not write
// the same post twice — so coming back here deals a fresh three rather than the
// same three. The URL still carries what to write about, which is what makes it
// a page you can land on.
export default async function SocialsVersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string; blog?: string; platforms?: string }>
}) {
  const { brief, blog, platforms: platformParam } = await searchParams

  const platformIds = parsePlatformIds(platformParam)
  const user = await requireUser()
  const blogPost = blog ? await getPost(user.id, blog) : undefined

  // A brief with no words, a blog id that matches nothing, or nowhere to post:
  // there is no deck to show and nothing to fix here, so it goes back rather
  // than showing an empty page that explains itself.
  const source: PostSource | undefined = blogPost
    ? { kind: "blog", text: blogPost.title }
    : brief?.trim()
      ? { kind: "brief", text: brief.trim() }
      : undefined

  if (!source || !platformIds.length) {
    redirect("/socials")
  }

  return (
    <AppShell
      // The section, and the step. The post's name sat between them and was
      // pulling its weight nowhere: a breadcrumb is a route, and the name is
      // not a place on it — there is no page for the post itself, so the crumb
      // could never be a link, and an unlinked crumb in the middle of a trail
      // is a step you are told you cannot take.
      //
      // "Home" would be the wrong first word — Blogger has a home of its own,
      // and one label pointing at two destinations names neither.
      breadcrumbs={[
        { label: "Socials", href: "/socials" },
        { label: "Pick a version" },
      ]}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        {/* The drafts are written when the page mounts rather than here: a
            model call takes half a minute, and blocking the server render on it
            would show a blank page for all of it. */}
        <VersionDeck
          platforms={PLATFORMS.filter((platform) =>
            platformIds.includes(platform.id)
          )}
          sourceTitle={nameOf(source)}
          brief={blogPost ? undefined : source.text}
          blogId={blogPost?.id}
          platformIds={platformIds}
        />
      </main>
    </AppShell>
  )
}

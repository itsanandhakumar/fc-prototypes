import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { VersionPicker } from "@/components/socials/version-picker"
import { PLATFORMS } from "@/lib/connectors"
import { getPost } from "@/lib/post-store"
import {
  nameOf,
  parsePlatformIds,
  versionsOf,
  type PostSource,
  type SourceRef,
} from "@/lib/social-flow"

// The deck, as a page. It was a state inside the editor before, which meant it
// had no address: nothing to link to, nothing to come back to when the version
// you took turns out to be the wrong one. Everything it shows is rebuilt from
// the URL, so coming back to it lands on the same three drafts.
export default async function SocialsVersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string; blog?: string; platforms?: string }>
}) {
  const { brief, blog, platforms: platformParam } = await searchParams

  const platformIds = parsePlatformIds(platformParam)
  const blogPost = blog ? getPost(blog) : undefined

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

  const ref: SourceRef = blogPost
    ? { kind: "blog", blogId: blogPost.id }
    : { kind: "brief", brief: source.text }

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
        <VersionPicker
          platforms={PLATFORMS.filter((platform) =>
            platformIds.includes(platform.id)
          )}
          versions={versionsOf(source, platformIds)}
          sourceTitle={nameOf(source)}
          sourceRef={ref}
          platformIds={platformIds}
        />
      </main>
    </AppShell>
  )
}

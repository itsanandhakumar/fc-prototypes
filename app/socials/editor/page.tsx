import type { Crumb } from "@/components/app-header"
import { AppShell } from "@/components/app-shell"
import { Composer } from "@/components/socials/composer"
import {
  PLATFORMS,
  SOCIAL_PLATFORM_IDS,
} from "@/lib/connectors"
import { currentTime } from "@/lib/now"
import { connectedProviders } from "@/lib/connections"
import { getPost } from "@/lib/post-store"
import { requireUser } from "@/lib/session"
import { groupByDay } from "@/lib/social-calendar"
import { nameOf, parsePlatformIds, type PostSource } from "@/lib/social-flow"
import { getSocialPost, getSocialPosts } from "@/lib/social-store"

// The workspace. It arrives at its drafts three ways: a saved post brings its
// own, a post that came through the deck rebuilds the versions it chose from
// the same brief, and one written from scratch starts empty.
export default async function SocialsEditorPage({
  searchParams,
}: {
  searchParams: Promise<{
    post?: string
    brief?: string
    blog?: string
    platforms?: string
  }>
}) {
  const user = await requireUser()
  const connectedIds = await connectedProviders(user.id)
  const params = await searchParams
  const post = await getSocialPost(user.id, params.post)

  // One `now`, read once per request and handed down — the same single reading
  // the calendar takes, and for the same reason: turning "Tuesday at 9" into
  // the offset the store keeps needs a moment to measure from, and the server
  // and the browser have to be measuring from the same one.
  const nowMs = await currentTime()

  // What the queue already holds on each day, so a time is chosen against the
  // calendar rather than against a blank grid. Only what is actually due: a
  // draft sits on the day it was last edited, which says nothing about whether
  // that day is spoken for. A count per day is all the picker draws, so a count
  // per day is all that crosses.
  const queuedDays = Object.fromEntries(
    Array.from(
      groupByDay(
        (await getSocialPosts(user.id)).filter(
          (entry) => entry.status === "Scheduled"
        ),
        nowMs
      ),
      ([day, queued]) => [day, queued.length]
    )
  )

  const platforms = PLATFORMS.filter((platform) =>
    SOCIAL_PLATFORM_IDS.includes(platform.id)
  )

  const blogPost = params.blog ? await getPost(user.id, params.blog) : undefined
  const source: PostSource | undefined = blogPost
    ? { kind: "blog", text: blogPost.title }
    : params.brief?.trim()
      ? { kind: "brief", text: params.brief.trim() }
      : undefined

  // A saved post says where it goes; a new one was told on the way here.
  const selectedIds = post
    ? post.variants.map((variant) => variant.platformId)
    : parsePlatformIds(params.platforms)

  // The words themselves, from the post the deck saved. They are no longer
  // rebuilt from a version number in the URL: the model does not write the same
  // post twice, so what the deck dealt has to be carried rather than recreated.
  const drafts = post
    ? Object.fromEntries(
        post.variants.map((variant) => [variant.platformId, variant.text])
      )
    : {}

  const name = post?.name ?? (source ? nameOf(source) : undefined)

  // The section, then the steps taken to get here — the deck's trail with one
  // more on the end, so the two pages read as one route rather than as two
  // places that happen to share a name.
  //
  // The post's name is not among them. It is not a place: there is no page for
  // the post itself, so the crumb could never be a link, and it was the one
  // carrying the way back to the deck — a crumb pointing at something it does
  // not name. The deck is what the link returns to, so "Pick a version" is
  // what it says.
  //
  // The last crumb is always the page you are on: a trail whose only entry is a
  // link points away from where you are and never says where that is.
  const trail: Crumb[] = [{ label: "Socials", href: "/socials" }]
  // "The post" once there is one to speak of; "a post" when the page opened
  // with nothing in it.
  trail.push({ label: name ? "Write the post" : "Write a post" })

  return (
    <AppShell breadcrumbs={trail}>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <Composer
          platforms={platforms}
          post={post}
          initialSelectedIds={
            selectedIds.length
              ? selectedIds
              : platforms.slice(0, 2).map((platform) => platform.id)
          }
          initialDrafts={drafts}
          sourceName={name}
          connectedIds={connectedIds}
          nowMs={nowMs}
          queuedDays={queuedDays}
        />
      </main>
    </AppShell>
  )
}

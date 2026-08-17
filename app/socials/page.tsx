import { cookies } from "next/headers"

import { AppShell } from "@/components/app-shell"
import { NewPostButton } from "@/components/socials/new-post-button"
import { SocialPostList } from "@/components/socials/social-post-list"
import { SummaryStrip } from "@/components/socials/summary-strip"
import { findAccount, greetingNameOf, SESSION_COOKIE } from "@/lib/auth"
import { PLATFORMS, SOCIAL_PLATFORM_IDS } from "@/lib/connectors"
import { getPosts } from "@/lib/post-store"
import { summarize } from "@/lib/social-insights"
import { currentTime } from "@/lib/now"
import { getSocialPosts } from "@/lib/social-store"

export default async function SocialsPage() {
  // Same greeting as Blogger's home — the two products name themselves the
  // same way, so switching between them reads as one app.
  const cookieStore = await cookies()
  const account = findAccount(cookieStore.get(SESSION_COOKIE)?.value)
  const greeting = account ? `Hi, ${greetingNameOf(account.name)}` : "Hi there"

  const posts = getSocialPosts()
  const summary = summarize(posts)

  // One `now`, read once per request and handed down. Everything else in the
  // app is an offset in minutes precisely so that no clock is ever needed —
  // but a calendar has to name actual days, and this is the single reading that
  // lets it. Server and browser then do the same arithmetic on the same number,
  // so they cannot disagree about which day is which.
  const nowMs = await currentTime()

  // Everything the brief dialog needs, gathered here so it can open over this
  // list. Blog posts come as titles only — the article itself is never needed.
  const socialPlatforms = PLATFORMS.filter((platform) =>
    SOCIAL_PLATFORM_IDS.includes(platform.id)
  )
  const blogs = getPosts().map(({ id, title, status, updatedMinutesAgo }) => ({
    id,
    title,
    status,
    updatedMinutesAgo,
  }))

  return (
    <AppShell>
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-lg font-medium">Socials</h1>
            <p className="text-lg text-muted-foreground">{greeting}</p>
          </div>

          {/* The brief opens over this list rather than on a route of its own,
              so starting a post and changing your mind costs nothing — and so
              every screen after it can be a page with a trail of its own. */}
          <NewPostButton platforms={socialPlatforms} blogs={blogs} />
        </div>

        <SummaryStrip summary={summary} />

        <SocialPostList posts={posts} nowMs={nowMs} />
      </main>
    </AppShell>
  )
}

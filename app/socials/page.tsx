import Link from "next/link"
import { cookies } from "next/headers"
import { Plus } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { SocialPostList } from "@/components/socials/social-post-list"
import { SummaryStrip } from "@/components/socials/summary-strip"
import { findAccount, greetingNameOf, SESSION_COOKIE } from "@/lib/auth"
import { summarize } from "@/lib/social-insights"
import { getSocialPosts } from "@/lib/social-store"

export default async function SocialsPage() {
  // Same greeting as Blogger's home — the two products name themselves the
  // same way, so switching between them reads as one app.
  const cookieStore = await cookies()
  const account = findAccount(cookieStore.get(SESSION_COOKIE)?.value)
  const greeting = account ? `Hi, ${greetingNameOf(account.name)}` : "Hi there"

  const posts = getSocialPosts()
  const summary = summarize(posts)

  return (
    <AppShell>
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-lg font-medium">Socials</h1>
            <p className="text-lg text-muted-foreground">{greeting}</p>
          </div>

          {/* Straight into the editor — the brief is a button in there, not a
              step in front of it. */}
          <Button size="lg" nativeButton={false} render={<Link href="/socials/editor" />}>
            <Plus />
            New Post
          </Button>
        </div>

        <SummaryStrip summary={summary} />

        <SocialPostList posts={posts} />
      </main>
    </AppShell>
  )
}

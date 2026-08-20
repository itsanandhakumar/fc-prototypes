import { cookies } from "next/headers"

import { AppShell } from "@/components/app-shell"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { CONNECTORS_COOKIE, isConnected } from "@/lib/connectors"
import {
  parseKeywords,
  parseTargetCharacters,
  type DraftBrief,
} from "@/lib/draft-generator"
import { getPost } from "@/lib/post-store"
import { BODY_VIEW_COOKIE, parseBodyView } from "@/lib/preferences"
import { requireUser } from "@/lib/session"

// One editor route, two arrival paths: `?post=<id>` opens a stored post, and a
// `?prompt=`/`?title=` pair opens an empty editor that generates on mount. The
// generation itself happens client-side against `/api/generate` so the writer
// watches it stream rather than waiting on a blank server render.
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{
    post?: string
    prompt?: string
    title?: string
    keywords?: string
    chars?: string
  }>
}) {
  const user = await requireUser()
  const params = await searchParams

  const post = await getPost(user.id, params.post)

  // The brief the draft was generated from, so Regenerate can honour the same
  // instructions. A stored post keeps its own; one saved before briefs were
  // kept falls back to its title.
  const brief: DraftBrief = post
    ? (post.brief ?? {
        brief: post.title,
        keywords: [],
        targetCharacters: post.body.length,
      })
    : {
        brief: params.prompt ?? "",
        keywords: parseKeywords(params.keywords ?? ""),
        targetCharacters: parseTargetCharacters(params.chars),
      }

  // A title with no post behind it is a suggested idea being turned into a
  // draft: the generator is told to keep the headline and write to it.
  const requestedTitle = post ? undefined : params.title?.trim() || undefined

  // Nothing to generate from means an empty editor, which is a valid state —
  // the writer can still type a post by hand.
  const shouldGenerate = !post && Boolean(brief.brief || requestedTitle)

  const cookieStore = await cookies()
  const defaultBodyView = parseBodyView(
    cookieStore.get(BODY_VIEW_COOKIE)?.value
  )
  const hubspotConnected = isConnected(
    cookieStore.get(CONNECTORS_COOKIE)?.value,
    "hubspot"
  )

  return (
    <AppShell
      // Named for the section rather than for "Home": there are two products
      // in this sidebar and each has a home, so one label pointing at both
      // would say nothing about which one it goes to.
      breadcrumbs={[
        { label: "Blogger", href: "/blogger" },
        { label: post?.title ?? requestedTitle ?? "New draft" },
      ]}
    >
      {/* Keyed per draft so switching posts resets the workspace state rather
          than carrying the previous post's title and body across. */}
      <EditorWorkspace
        key={`${post?.id ?? ""}|${params.prompt ?? ""}|${requestedTitle ?? ""}|${params.chars ?? ""}`}
        postId={post?.id ?? ""}
        initialTitle={post?.title ?? requestedTitle ?? ""}
        initialBody={post?.body ?? ""}
        initialInsights={post?.insights}
        initialView={defaultBodyView}
        brief={brief}
        savedPost={
          post && { id: post.id, title: post.title, status: post.status }
        }
        hubspotConnected={hubspotConnected}
        generateOnMount={shouldGenerate}
        requestedTitle={requestedTitle}
      />
    </AppShell>
  )
}

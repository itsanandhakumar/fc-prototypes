import { cookies } from "next/headers"

import { savePostAsDraft } from "@/app/editor-actions"
import { AppHeader } from "@/components/app-header"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import {
  generateDraft,
  parseKeywords,
  parseTargetCharacters,
  type DraftBrief,
} from "@/lib/draft-generator"
import { CONNECTORS_COOKIE, connectedPlatforms } from "@/lib/connectors"
import { getInsights } from "@/lib/post-insights"
import { subjectOf, topicFromTitle } from "@/lib/draft-generator"
import { buildGenerationSteps } from "@/lib/generation-steps"
import { getPost, getPosts } from "@/lib/post-store"
import { BODY_VIEW_COOKIE, parseBodyView } from "@/lib/preferences"

// One editor route, two arrival paths: `?post=<id>` opens an existing post,
// `?prompt=<text>` opens a freshly generated draft that is not stored until
// the writer saves it.
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
  const params = await searchParams
  const { post: postId, prompt } = params

  const post = getPost(postId)

  // The brief the draft was generated from, so Regenerate can honour the same
  // instructions. A stored post keeps its own brief; one saved before briefs
  // were kept falls back to its title.
  const brief: DraftBrief = post
    ? (post.brief ?? {
        brief: post.title,
        title: post.title,
        keywords: [],
        targetCharacters: post.body.length,
        target: "both",
      })
    : {
        brief: prompt ?? "",
        title: params.title,
        keywords: parseKeywords(params.keywords ?? ""),
        targetCharacters: parseTargetCharacters(params.chars),
        target: "both",
      }

  // A brief, a title, or both — any of them is enough to generate from.
  const generated =
    !post && (prompt || params.title) ? generateDraft(brief) : undefined

  const title = post?.title ?? generated?.title ?? ""
  const body = post?.body ?? generated?.body ?? ""

  // Everything in the panel describes the draft, so an empty editor has
  // nothing to show.
  const insights = title || body ? getInsights(title, body) : undefined

  // Every post carries its run, not just the one being written: a fresh draft
  // plays it, a saved one keeps it available to read back.
  const relatedPosts = relatedTitles(title || brief.brief, post?.id)
  const steps =
    insights && (title || body)
      ? buildGenerationSteps({
          brief,
          title,
          body,
          insights,
          relatedPosts,
        })
      : []

  const cookieStore = await cookies()
  const defaultBodyView = parseBodyView(
    cookieStore.get(BODY_VIEW_COOKIE)?.value
  )
  const connected = connectedPlatforms(
    cookieStore.get(CONNECTORS_COOKIE)?.value
  )

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: title || "New draft" },
        ]}
      />

      <form
        action={savePostAsDraft}
        className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6"
      >
        <input type="hidden" name="postId" value={post?.id ?? ""} />

        {/* The brief rides along with the save so the stored post keeps the
            instructions it was written from. */}
        <input type="hidden" name="brief" value={brief.brief} />
        <input type="hidden" name="keywords" value={brief.keywords.join(", ")} />
        <input
          type="hidden"
          name="chars"
          value={String(brief.targetCharacters)}
        />

        {/* Keyed per draft so switching posts resets the workspace state. */}
        <EditorWorkspace
          key={`${post?.id ?? ""}|${prompt ?? ""}|${params.title ?? ""}|${params.chars ?? ""}`}
          initialTitle={title}
          initialBody={body}
          initialInsights={insights}
          initialView={defaultBodyView}
          brief={{ ...brief, title }}
          postId={post?.id ?? ""}
          savedPost={
            post && { id: post.id, title: post.title, status: post.status }
          }
          connectedPlatforms={connected}
          steps={steps}
          relatedPosts={relatedPosts}
          generating={Boolean(generated)}
        />
      </form>
    </div>
  )
}

// Posts already in the workspace that share the subject of the draft. Real
// rows, so the step that claims to have read them is telling the truth. The
// post being edited is never one of its own neighbours.
function relatedTitles(source: string, selfId?: string): string[] {
  const subject = subjectOf(topicFromTitle(source)).toLowerCase()
  const terms = subject.split(/\s+/).filter((word) => word.length > 3)
  if (!terms.length) {
    return []
  }

  return getPosts()
    .filter((post) => {
      if (post.id === selfId) {
        return false
      }
      const haystack = post.title.toLowerCase()
      return terms.some((term) => haystack.includes(term))
    })
    .slice(0, 3)
    .map((post) => post.title)
}

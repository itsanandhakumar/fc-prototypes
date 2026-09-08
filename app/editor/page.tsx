import { cookies } from "next/headers"

import { savePostAsDraft } from "@/app/editor-actions"
import { AppShell } from "@/components/app-shell"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import {
  generateDraft,
  parseKeywords,
  parseTargetCharacters,
  type DraftBrief,
} from "@/lib/draft-generator"
import { ACCOUNTS, findAccount, SESSION_COOKIE } from "@/lib/auth"
import { FINDINGS } from "@/lib/audit-data"
import { jobForFinding } from "@/lib/audit-report"
import { BLOG_LANGUAGE_COOKIE, parseBlogLanguage } from "@/lib/blog-language"
import { CONNECTORS_COOKIE, isConnected } from "@/lib/connectors"
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
    /** Which field of the post to land on, sent by an audit finding. */
    fix?: string
    /** The finding that sent the writer here, so the editor can say why. */
    from?: string
    /** Which of that finding's posts this is, so the editor can offer the next. */
    at?: string
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
  const hubspotConnected = isConnected(
    cookieStore.get(CONNECTORS_COOKIE)?.value
  )
  // Chosen once, when the blog was first connected. Undefined here is what
  // makes connecting from the publish dialog stop to ask for it.
  const blogLanguage = parseBlogLanguage(
    cookieStore.get(BLOG_LANGUAGE_COOKIE)?.value
  )
  // A post is signed by a person, so the publish dialog opens on whoever is
  // holding the session and offers the rest of the workspace beside them.
  const account = findAccount(cookieStore.get(SESSION_COOKIE)?.value)

  return (
    <AppShell
      // Named for the section rather than for "Home": there are two products
      // in this sidebar and each has a home, so one label pointing at both
      // would say nothing about which one it goes to.
      breadcrumbs={[
        { label: "Blogger", href: "/blogger" },
        { label: title || "New draft" },
      ]}
    >
      <form
        action={savePostAsDraft}
        className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6"
      >
        <input type="hidden" name="postId" value={post?.id ?? ""} />

        {/* The brief rides along with the save so the stored post keeps the
            instructions it was written from. */}
        <input type="hidden" name="brief" value={brief.brief} />
        <input
          type="hidden"
          name="keywords"
          value={brief.keywords.join(", ")}
        />
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
          hubspotConnected={hubspotConnected}
          blogLanguage={blogLanguage}
          authors={ACCOUNTS.map((item) => item.name)}
          defaultAuthor={account?.name ?? ACCOUNTS[0].name}
          publishedWith={post?.publish}
          // An audit finding links here naming the thing that is wrong, so the
          // editor opens on it rather than leaving the writer to find it.
          fixField={parseFixField(params.fix)}
          fixNote={auditNote(params.from, params.at, params.fix)}
          steps={steps}
          relatedPosts={relatedPosts}
          generating={Boolean(generated)}
        />
      </form>
    </AppShell>
  )
}

/**
 * What the audit sent the writer here to do.
 *
 * The job's title is the instruction — "Write the missing summary lines" —
 * where the finding says what is wrong. A highlighted field with no words on
 * it only answers "which one", and the reader still has to remember why they
 * clicked.
 */
function auditNote(
  findingId: string | undefined,
  at: string | undefined,
  fix: string | undefined
) {
  const finding = findingId
    ? FINDINGS.find((entry) => entry.id === findingId)
    : undefined
  if (!finding || finding.scope.kind !== "blogger") {
    return undefined
  }

  const targets = finding.scope.targets ?? []
  const position = Number(at)
  const index = Number.isInteger(position) ? position : 0
  const next = targets[index + 1]

  return {
    action: jobForFinding(finding.id)?.title ?? finding.title,
    reason: finding.detail,
    // Where this post sits in the set the finding covers, and where the next
    // one is — a finding about three posts is one job, and the editor is where
    // it gets worked through rather than the dashboard.
    step:
      targets.length > 1 ? { at: index + 1, of: targets.length } : undefined,
    next: next
      ? {
          title: next.title,
          href: `/editor?post=${encodeURIComponent(next.postId)}${
            fix ? `&fix=${fix}` : ""
          }&from=${encodeURIComponent(finding.id)}&at=${index + 1}`,
        }
      : undefined,
  }
}

/** Only the fields the publish dialog can actually land on. */
function parseFixField(value: string | undefined) {
  return value === "meta" ||
    value === "image" ||
    value === "tags" ||
    value === "body"
    ? value
    : undefined
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

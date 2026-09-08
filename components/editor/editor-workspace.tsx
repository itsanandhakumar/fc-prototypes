"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  Undo2,
} from "lucide-react"

import { GenerationLog } from "@/components/editor/generation-log"
import { MarkdownPreview } from "@/components/editor/markdown-preview"
import { PostIdeas } from "@/components/editor/post-ideas"
import { PublishDialog } from "@/components/editor/publish-dialog"
import { TitleOptions } from "@/components/editor/title-options"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { PostStatus } from "@/lib/blog-data"
import type { PublishSettings } from "@/lib/blog-publish"
import { generateBody, type DraftBrief } from "@/lib/draft-generator"
import {
  buildGenerationSteps,
  type GenerationStep,
} from "@/lib/generation-steps"
import { getInsights, type PostInsights } from "@/lib/post-insights"
import { BODY_VIEWS, type BodyView } from "@/lib/preferences"
import { cn } from "@/lib/utils"

// The pane holds a whole post, so it is padded like a page rather than like a
// form field — and the source and the rendered view are padded the same, so
// the text does not shift when the view is switched. It takes the card surface
// rather than a field's: this is the paper, and the page behind it is the desk.
const BODY_CLASSNAME =
  "min-h-0 w-full flex-1 resize-none overflow-y-auto rounded-md border border-input bg-card px-5 py-4 text-xs/relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

// The title is a plain input; it becomes markup on its way to the clipboard,
// so anything the writer typed has to be escaped first.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function PanelCard({
  heading,
  action,
  children,
}: {
  heading: string
  /** A badge or spinner sitting against the heading. */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card size="sm" className="shrink-0 gap-2">
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-xs/relaxed">{heading}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function EditorWorkspace({
  initialTitle,
  initialBody,
  initialInsights,
  initialView,
  brief,
  postId,
  savedPost,
  hubspotConnected,
  blogLanguage,
  authors,
  defaultAuthor,
  publishedWith,
  fixField,
  fixNote,
  steps: initialSteps = [],
  relatedPosts = [],
  generating = false,
}: {
  initialTitle: string
  initialBody: string
  initialInsights?: PostInsights
  initialView: BodyView
  brief: DraftBrief
  postId: string
  /** How this post stands in Your posts, if it is in there at all. */
  savedPost?: { id: string; title: string; status: PostStatus }
  /** Whether there is a connected blog to publish to. */
  hubspotConnected: boolean
  /** The language that blog publishes in, once it has been chosen. */
  blogLanguage?: string
  /** Who this workspace can publish as, and who it opens on. */
  authors: string[]
  defaultAuthor: string
  /** What this post was published with last time, if it has been. */
  publishedWith?: PublishSettings
  /** A field an audit finding sent the writer here to change. */
  fixField?: "meta" | "image" | "tags" | "body"
  /** What that finding wants done, why, and how far through the set this is. */
  fixNote?: {
    action: string
    reason: string
    step?: { at: number; of: number }
    next?: { title: string; href: string }
  }
  /** What the app did to produce this draft, for the panel to narrate. */
  steps?: GenerationStep[]
  /** Titles the run cites as already covering this subject. */
  relatedPosts?: string[]
  /** A freshly generated draft plays the steps before revealing itself. */
  generating?: boolean
}) {
  const [title, setTitle] = React.useState(initialTitle)
  const [body, setBody] = React.useState(initialBody)
  const [insights, setInsights] = React.useState(initialInsights)
  const [steps, setSteps] = React.useState(initialSteps)
  const [analyzed, setAnalyzed] = React.useState({
    title: initialTitle,
    body: initialBody,
  })
  const [variant, setVariant] = React.useState(0)
  const [view, setView] = React.useState<BodyView>(initialView)
  // The draft is already computed; the run is what makes the work legible.
  // Regenerating plays the same run as the first write — the work is the same
  // work, so it is shown the same way.
  const [run, setRun] = React.useState<"writing" | "rewriting" | null>(
    generating && initialSteps.length ? "writing" : null
  )
  const [logOpen, setLogOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  // Titles this post has worn before the one it wears now. The list of
  // suggestions does not include the title in use, so without this a swap is
  // one-way — this is the way back.
  const [titleHistory, setTitleHistory] = React.useState<string[]>([])
  const previewRef = React.useRef<HTMLDivElement>(null)
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const running = run !== null

  React.useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current)
      }
    },
    []
  )

  // Whichever view is on screen is what lands on the clipboard: the Markdown
  // source, or the rendered post with its formatting intact so it can be
  // pasted into a doc. Either way it is the whole post — the title heads it,
  // the way it would in a file or a document.
  async function handleCopy() {
    const preview = previewRef.current
    const heading = title.trim()

    try {
      if (view === "preview" && preview) {
        const html = heading
          ? `<h1>${escapeHtml(heading)}</h1>${preview.innerHTML}`
          : preview.innerHTML
        const text = heading
          ? `${heading}\n\n${preview.innerText}`
          : preview.innerText

        if (typeof ClipboardItem === "undefined") {
          await navigator.clipboard.writeText(text)
        } else {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ])
        }
      } else {
        await navigator.clipboard.writeText(
          heading ? `# ${heading}\n\n${body}` : body
        )
      }
    } catch {
      // Clipboard refused — the button simply never confirms.
      return
    }

    setCopied(true)
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current)
    }
    copiedTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  function chooseTitle(next: string) {
    setTitleHistory((history) => [...history, title])
    setTitle(next)
  }

  // One step back per swap, so a run of them unwinds to the title the post
  // started with rather than only to the last one.
  function undoTitle() {
    const previous = titleHistory[titleHistory.length - 1]
    if (previous === undefined) {
      return
    }
    setTitle(previous)
    setTitleHistory((history) => history.slice(0, -1))
  }

  // The panel describes the last analysed draft. Regenerate and Save both
  // re-analyse; hand-edits in between leave it out of date, which the badge
  // says out loud rather than silently re-running on every keystroke.
  const isStale =
    insights !== undefined &&
    (body !== analyzed.body || title !== analyzed.title)

  function handleRegenerate() {
    const next = variant + 1
    // Same brief, next angle. The title is never touched.
    const nextBody = generateBody({ ...brief, title }, next)
    const nextInsights = getInsights(title, nextBody)

    setVariant(next)
    setBody(nextBody)
    setInsights(nextInsights)
    setAnalyzed({ title, body: nextBody })
    // The run has to describe the draft on screen, not the one it replaced.
    setSteps(
      buildGenerationSteps({
        brief: { ...brief, title },
        title,
        body: nextBody,
        insights: nextInsights,
        relatedPosts,
      })
    )
    // Nothing is awaited: the draft is ready, and the run is what takes the
    // time — the same as it does on the first write.
    setRun("rewriting")
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* The title is not typed — it comes from the run, or from Alternate
            titles in the panel — so it is set as a headline rather than boxed
            as a field. The hidden input is what carries it to the form. */}
        <input type="hidden" name="title" value={title} />
        {/* Only the first write produces the title; a rewrite leaves it
            alone, so it stays on screen rather than blanking out. */}
        {run === "writing" ? (
          <Skeleton className="h-10 w-2/3" />
        ) : (
          <h1 className="flex h-10 items-center text-lg font-medium">
            {title || (
              <span className="text-muted-foreground">Untitled post</span>
            )}
          </h1>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* Regenerates the body only, never the title. */}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={running}
            onClick={handleRegenerate}
          >
            <RefreshCw />
            {run === "rewriting" ? "Regenerating…" : "Regenerate"}
          </Button>

          <div className="flex items-center gap-3">
            {/* Takes whatever the view is showing. */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={running}
              onClick={handleCopy}
            >
              {copied ? <Check /> : <Copy />}
              {copied
                ? "Copied"
                : view === "markdown"
                  ? "Copy Markdown"
                  : "Copy formatted"}
            </Button>

            {/* Same draft, two views of it — boxed as one control, so the
                pair reads as a switch between them rather than as two more
                buttons alongside Copy. */}
            <div
              role="group"
              aria-label="Body view"
              className="flex items-center gap-0.5 rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
            >
              {BODY_VIEWS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={view === value ? "secondary" : "ghost"}
                  aria-pressed={view === value}
                  disabled={running}
                  onClick={() => setView(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* A finding that asks for a decision rather than a value — which of
            two posts should answer a search — has no field to point at, so it
            points at the writing. The note sits above the body for the same
            reason the field notes sit above their fields: arriving somewhere
            without being told why is not an instruction. */}
        {fixNote && fixField === "body" ? (
          <div className="flex gap-2 rounded-md bg-primary/10 px-2.5 py-2">
            <Sparkles
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-medium">{fixNote.action}</span>
                {fixNote.step ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Post {fixNote.step.at} of {fixNote.step.of}
                  </span>
                ) : null}
              </span>
              <span className="text-xs/relaxed text-muted-foreground">
                {fixNote.reason}
              </span>
              {fixNote.next ? (
                <Link
                  href={fixNote.next.href}
                  className="mt-0.5 flex min-w-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  <span className="min-w-0 truncate">
                    Then: {fixNote.next.title}
                  </span>
                  <ArrowRight className="size-3 shrink-0" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {running ? (
          <div
            data-testid="body-loading"
            className={`${BODY_CLASSNAME} flex flex-col gap-2 overflow-hidden`}
          >
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-3 h-3 w-10/12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : view === "markdown" ? (
          /* Scrolls within its own bounds, independently of the panel. */
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your post…"
            aria-label="Post body"
            className={BODY_CLASSNAME}
          />
        ) : (
          <>
            {/* The rendered view is read-only, so the draft still has to reach
                the form on save. */}
            <input type="hidden" name="body" value={body} />
            {/* The ref is what Copy reads the formatting off. */}
            <MarkdownPreview
              ref={previewRef}
              markdown={body}
              className={BODY_CLASSNAME}
            />
          </>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" variant="outline" size="lg" disabled={running}>
            Save as draft
          </Button>
          <PublishDialog
            postId={postId}
            title={title}
            body={body}
            brief={{ ...brief, title }}
            connected={hubspotConnected}
            blogLanguage={blogLanguage}
            authors={authors}
            defaultAuthor={defaultAuthor}
            // The same keywords the panel reports the draft is working, so the
            // tags it opens with are the ones the writer has been reading.
            suggestedTags={insights?.workingKeywords ?? []}
            // Likewise the description the panel already reports, so the
            // dialog opens on the sentence the writer has been looking at.
            suggestedMetaDescription={insights?.metaDescription ?? ""}
            stored={publishedWith}
            fixField={fixField}
            fixNote={fixNote}
            disabled={running}
          />
        </div>
      </div>

      {/* One card per thing the panel has to say, stacked in their own scroll
          region. Each card is self-contained, so a heading never floats away
          from what it describes. */}
      {/* p-0.5: the cards draw their border as a ring, which sits outside the
          box. Without room on every side the scroll container clips it flat —
          the sides always, and the first card's top at the scroll origin. */}
      <div className="flex w-80 shrink-0 flex-col gap-3 overflow-x-hidden overflow-y-auto p-0.5">
        {running ? (
          /* While the draft is being written the panel is the work log: what
             is being done now, and what has been done so far. */
          <PanelCard
            heading={
              run === "rewriting" ? "Rewriting the post" : "Writing the post"
            }
            action={
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            }
          >
            {/* Keyed per run so a rewrite plays from the first step rather
                than picking up where the last one finished. */}
            <GenerationLog
              key={variant}
              steps={steps}
              onComplete={() => setRun(null)}
            />
          </PanelCard>
        ) : insights ? (
          <>
            {/* The run stays available afterwards, closed — the draft can
                always be traced back to it. */}
            {steps.length ? (
              <Card size="sm" className="shrink-0 gap-0">
                <button
                  type="button"
                  aria-expanded={logOpen}
                  onClick={() => setLogOpen((open) => !open)}
                  className="flex w-full items-center gap-1.5 px-(--card-spacing) text-left text-xs/relaxed font-medium transition-colors hover:text-muted-foreground focus-visible:text-muted-foreground focus-visible:outline-none"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      logOpen && "rotate-90"
                    )}
                  />
                  How this draft was made · {steps.length} steps
                </button>

                {logOpen ? (
                  <CardContent className="pt-3">
                    <GenerationLog steps={steps} autoPlay={false} />
                  </CardContent>
                ) : null}
              </Card>
            ) : null}

            <PanelCard
              heading="SEO meta description"
              action={
                isStale ? (
                  <Badge data-testid="stale-badge" variant="outline">
                    Out of date
                  </Badge>
                ) : null
              }
            >
              <p className="text-xs/relaxed text-muted-foreground">
                {insights.metaDescription}
              </p>
            </PanelCard>

            <PanelCard heading="Why it's AI-citable">
              <p className="text-xs/relaxed text-muted-foreground">
                {insights.aiCitable}
              </p>
            </PanelCard>

            <PanelCard heading="Working keywords">
              <div className="flex flex-wrap gap-1.5">
                {insights.workingKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </PanelCard>

            <PanelCard heading="Gaps / not working">
              <div className="flex flex-wrap gap-1.5">
                {insights.gapKeywords.map((keyword) => (
                  <Badge key={keyword} variant="destructive">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </PanelCard>

            {/* Retitles this post and nothing else — no new post, no rewrite
                of the body. */}
            <PanelCard
              heading="Alternate titles"
              action={
                titleHistory.length ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="ml-auto"
                    onClick={undoTitle}
                  >
                    <Undo2 />
                    Undo
                  </Button>
                ) : null
              }
            >
              <TitleOptions
                titles={insights.alternateTitles}
                current={title}
                onSelect={chooseTitle}
              />
            </PanelCard>

            {/* Not a rename: each one is a post of its own, on a subject this
                draft leaves uncovered. The heading has to say so, or the list
                reads as more ways to retitle what is already open. */}
            {insights.postIdeas.length ? (
              <PanelCard heading="Other posts to write">
                <PostIdeas titles={insights.postIdeas} savedPost={savedPost} />
              </PanelCard>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  )
}

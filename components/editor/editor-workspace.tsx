"use client"

import * as React from "react"
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  Undo2,
} from "lucide-react"

import { publishPost, savePostAsDraft } from "@/app/editor-actions"
import { GenerationLog } from "@/components/editor/generation-log"
import { PostIdeas } from "@/components/editor/post-ideas"
import { PublishDialog } from "@/components/editor/publish-dialog"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { TitleOptions } from "@/components/editor/title-options"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { PostStatus } from "@/lib/blog-data"
import type { StoredInsights } from "@/lib/db/schema"
import type { DraftBrief } from "@/lib/draft-generator"
import {
  buildGenerationSteps,
  type GenerationPhase,
} from "@/lib/generation-steps"
import { markdownToPlainText } from "@/lib/markdown"
import { BLOG_PUBLISHING_ENABLED } from "@/lib/release"
import { BODY_VIEWS, type BodyView } from "@/lib/preferences"
import { cn } from "@/lib/utils"

// The pane holds a whole post, so it is padded like a page rather than like a
// form field — and the source and the rendered view are padded the same, so
// the text does not shift when the view is switched. It takes the card surface
// rather than a field's: this is the paper, and the page behind it is the desk.
const BODY_SHELL =
  "min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input bg-card transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
const BODY_TEXTAREA =
  "size-full resize-none bg-transparent px-5 py-4 font-mono text-xs/relaxed outline-none placeholder:text-muted-foreground"

// The title becomes markup on its way to the clipboard, so anything the writer
// typed has to be escaped first.
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

type GenerationResult = StoredInsights & {
  title: string
  body: string
  relatedPosts: string[]
}

export function EditorWorkspace({
  postId,
  initialTitle,
  initialBody,
  initialInsights,
  initialView,
  brief,
  savedPost,
  hubspotConnected,
  hubspotNeedsSetup,
  generateOnMount,
  requestedTitle,
}: {
  postId: string
  initialTitle: string
  initialBody: string
  initialInsights?: StoredInsights
  initialView: BodyView
  brief: DraftBrief
  /** How this post stands in Your posts, if it is in there at all. */
  savedPost?: { id: string; title: string; status: PostStatus }
  /** Whether there is a connected blog to publish to. */
  hubspotConnected: boolean
  /** Approved in HubSpot, but not yet pointed at a blog. */
  hubspotNeedsSetup?: boolean
  /** A fresh draft generates as soon as the editor is on screen. */
  generateOnMount: boolean
  /** Set when the draft is being written to a headline the writer chose. */
  requestedTitle?: string
}) {
  const [title, setTitle] = React.useState(initialTitle)
  const [body, setBody] = React.useState(initialBody)
  const [insights, setInsights] = React.useState(initialInsights)
  const [relatedPosts, setRelatedPosts] = React.useState<string[]>([])
  const [analyzed, setAnalyzed] = React.useState({
    title: initialTitle,
    body: initialBody,
  })

  const [view, setView] = React.useState<BodyView>(initialView)
  const [variant, setVariant] = React.useState(0)
  const [phase, setPhase] = React.useState<GenerationPhase | null>(null)
  const [run, setRun] = React.useState<"writing" | "rewriting" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [logOpen, setLogOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Titles this post has worn before the one it wears now. The list of
  // suggestions does not include the title in use, so without this a swap is
  // one-way — this is the way back.
  const [titleHistory, setTitleHistory] = React.useState<string[]>([])

  const previewRef = React.useRef<HTMLDivElement>(null)
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  /** Whether the on-mount generation has been kicked off, so it happens once. */
  const started = React.useRef(false)

  const running = run !== null

  React.useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current)
      }
      // Leaving the editor mid-generation should stop the request, not let it
      // finish into a component that is gone.
      abortRef.current?.abort()
      // React's dev StrictMode unmounts and remounts every component once,
      // running this cleanup in between — but refs survive that remount. Left
      // alone, the abort above kills the only generation and `started` stays
      // true, so the remount skips it and the editor sits empty forever.
      // Clearing the flag lets the remount start again.
      started.current = false
    },
    []
  )

  // One generation, streamed. Phases arrive as they happen and the result
  // arrives last; anything else on the wire is a failure worth showing.
  const generate = React.useCallback(
    async (mode: "writing" | "rewriting", nextVariant: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setRun(mode)
      setError(null)
      setPhase("reading-brief")

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            brief: brief.brief,
            keywords: brief.keywords.join(", "),
            chars: String(brief.targetCharacters),
            // A rewrite keeps the headline; a first draft only fixes one when
            // the writer arrived from a suggested idea.
            title: mode === "rewriting" ? title : requestedTitle,
            variant: nextVariant,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 401
              ? "Your session expired. Reload and sign in again."
              : "Could not reach the writing service."
          )
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let result: GenerationResult | undefined

        // NDJSON: a chunk can split a line anywhere, so only whole lines are
        // parsed and the remainder is carried into the next read.
        for (;;) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.trim()) {
              continue
            }
            const message = JSON.parse(line) as
              | { phase: GenerationPhase }
              | { result: GenerationResult }
              | { error: string }

            if ("phase" in message) {
              setPhase(message.phase)
            } else if ("error" in message) {
              throw new Error(message.error)
            } else {
              result = message.result
            }
          }
        }

        if (!result) {
          throw new Error("The draft ended before it was finished.")
        }

        const { title: newTitle, body: newBody, relatedPosts: related, ...rest } =
          result

        // A rewrite never touches the headline, so it stays on screen.
        if (mode === "writing") {
          setTitle(newTitle)
        }
        setBody(newBody)
        setInsights(rest)
        setRelatedPosts(related)
        setAnalyzed({ title: mode === "writing" ? newTitle : title, body: newBody })
        setVariant(nextVariant)
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") {
          return
        }
        setError(
          caught instanceof Error ? caught.message : "Generation failed."
        )
      } finally {
        // The abort path above returns before this, so a superseded run never
        // clears the flag on the run that replaced it.
        if (abortRef.current === controller) {
          setRun(null)
          setPhase(null)
          abortRef.current = null
        }
      }
    },
    [brief, requestedTitle, title]
  )

  // A fresh draft writes itself as soon as the editor is on screen. `started`
  // keeps that to one run — `generate` changes identity whenever the title does,
  // so without it every retitle would kick off another draft.
  //
  // The start is deferred by a tick rather than fired inline. React's dev
  // StrictMode mounts, unmounts and remounts every component in one go, and a
  // request begun inline would be aborted by that simulated unmount — spawning
  // a Claude process server-side purely to kill it. Deferring means the cleanup
  // below cancels it before anything is spawned, and the remount starts the one
  // real run. In production, where there is no double-mount, this is a tick.
  React.useEffect(() => {
    if (!generateOnMount || started.current) {
      return
    }

    const timer = setTimeout(() => {
      started.current = true
      void generate("writing", 0)
    }, 0)

    return () => clearTimeout(timer)
  }, [generateOnMount, generate])

  async function handleCopy() {
    const heading = title.trim()

    try {
      if (view === "preview" && previewRef.current) {
        // The rendered post, with its formatting intact, so it can be pasted
        // into a doc. The title heads it the way it would in a file.
        const html = heading
          ? `<h1>${escapeHtml(heading)}</h1>${previewRef.current.innerHTML}`
          : previewRef.current.innerHTML
        const text = heading
          ? `${heading}\n\n${markdownToPlainText(body)}`
          : markdownToPlainText(body)

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

  // The panel describes the last analysed draft. Regenerate re-analyses;
  // hand-edits in between leave it out of date, which the badge says out loud
  // rather than silently re-running the model on every keystroke.
  const isStale =
    insights !== undefined &&
    (body !== analyzed.body || title !== analyzed.title)

  const steps = React.useMemo(
    () => buildGenerationSteps({ brief, relatedPosts, body, insights }),
    [brief, relatedPosts, body, insights]
  )

  const hasDraft = Boolean(title.trim() || body.trim())

  return (
    <form className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6">
      {/* Everything the save needs travels as hidden fields, so both submit
          buttons post the same payload and differ only in their action. */}
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="brief" value={brief.brief} />
      <input type="hidden" name="keywords" value={brief.keywords.join(", ")} />
      <input
        type="hidden"
        name="chars"
        value={String(brief.targetCharacters)}
      />
      <input
        type="hidden"
        name="insights"
        value={insights ? JSON.stringify(insights) : ""}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* The title comes from the run, or from Alternate titles in the
            panel, so it is set as a headline rather than boxed as a field. */}
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
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={running || !hasDraft}
            onClick={() => void generate("rewriting", variant + 1)}
          >
            <RefreshCw className={cn(run === "rewriting" && "animate-spin")} />
            {run === "rewriting" ? "Regenerating…" : "Regenerate"}
          </Button>

          <div className="flex items-center gap-3">
            {/* Takes whatever the view is showing. */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={running || !hasDraft}
              onClick={handleCopy}
            >
              {copied ? <Check /> : <Copy />}
              {copied
                ? "Copied"
                : view === "markdown"
                  ? "Copy Markdown"
                  : "Copy formatted"}
            </Button>

            {/* Same draft, two views of it — boxed as one control, so the pair
                reads as a switch between them rather than as two more buttons
                alongside Copy. */}
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

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs/relaxed text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        {running ? (
          <div
            data-testid="body-loading"
            className={cn(BODY_SHELL, "flex flex-col gap-2 px-5 py-4")}
          >
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-3 h-3 w-10/12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : view === "markdown" ? (
          <div className={BODY_SHELL}>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your post…"
              aria-label="Post body, Markdown source"
              className={BODY_TEXTAREA}
            />
          </div>
        ) : (
          <RichTextEditor
            markdown={body}
            onChange={setBody}
            className={BODY_SHELL}
            editorRef={previewRef}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            formAction={savePostAsDraft}
            variant="outline"
            size="lg"
            disabled={running || !hasDraft}
          >
            Save as draft
          </Button>
          {/* Two builds, two meanings of the same word.
              With a CMS connected, publishing hands the post over, and the
              dialog is where the title, address and length are confirmed
              before it goes — it wears the destination's own colour and mark,
              because the post is leaving Forward.
              Without one, there is nowhere to hand it to. Publishing is then a
              state in Forward — the writer is done — and the button is an
              ordinary primary action that says so plainly. */}
          {BLOG_PUBLISHING_ENABLED ? (
            <PublishDialog
              postId={postId}
              title={title}
              body={body}
              brief={brief}
              insights={insights}
              connected={hubspotConnected}
              needsSetup={hubspotNeedsSetup}
              disabled={running || !hasDraft}
            />
          ) : (
            <Button
              type="submit"
              formAction={publishPost}
              size="lg"
              disabled={running || !hasDraft}
            >
              Publish
            </Button>
          )}
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
            <GenerationLog steps={steps} activePhase={phase} />
          </PanelCard>
        ) : insights ? (
          <>
            {/* The run stays available afterwards, closed — the draft can
                always be traced back to it. */}
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
                  <GenerationLog steps={steps} activePhase={null} />
                </CardContent>
              ) : null}
            </Card>

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
        ) : (
          <PanelCard heading="No analysis yet">
            <p className="text-xs/relaxed text-muted-foreground">
              {hasDraft
                ? "This post was written before the panel existed, or by hand. Regenerate to have it analysed."
                : "Write a post and the meta description, keyword coverage and title options will appear here."}
            </p>
          </PanelCard>
        )}
      </div>
    </form>
  )
}

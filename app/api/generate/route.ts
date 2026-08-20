import { NextResponse } from "next/server"

import { generateDraft } from "@/lib/ai/blog"
import { GenerationBusy, GenerationRefused } from "@/lib/ai/claude-cli"
import { currentUser } from "@/lib/session"
import { getPosts } from "@/lib/post-store"
import { parseKeywords, parseTargetCharacters } from "@/lib/draft-generator"

// Generation runs long enough that a plain request/response would leave the
// editor with nothing to show for a minute or more. This streams newline-
// delimited JSON instead: one `{phase}` object per stage, then one `{result}`
// or `{error}`. The generation log in the editor is driven off those phases,
// so it reports work that is genuinely happening.

export const maxDuration = 300

type Line =
  | { phase: string; detail?: string }
  | { result: unknown }
  | { error: string }

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  let payload: {
    brief?: string
    keywords?: string
    chars?: string
    title?: string
    variant?: number
  }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 })
  }

  const brief = {
    brief: String(payload.brief ?? "").trim(),
    keywords: parseKeywords(String(payload.keywords ?? "")),
    targetCharacters: parseTargetCharacters(payload.chars),
  }
  const title = payload.title?.trim() || undefined

  if (!brief.brief && !title) {
    return NextResponse.json(
      { error: "Add a brief to generate from." },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (line: Line) => {
        if (!open) {
          return
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      }

      try {
        send({ phase: "reading-brief" })

        // Real work, and the first thing the log claims: the writer's own
        // library is checked for posts already covering this subject.
        const related = await relatedTitles(user.id, title || brief.brief)
        send({
          phase: "related",
          detail: related.length
            ? `Checked ${related.length} related post${related.length === 1 ? "" : "s"}`
            : "No related posts in your workspace",
        })

        const draft = await generateDraft({
          brief,
          title,
          variant: payload.variant ?? 0,
          signal: request.signal,
          onPhase: (phase) => send({ phase }),
        })

        send({ result: { ...draft, relatedPosts: related } })
      } catch (error) {
        // The client has already been given a 200 and some phases, so a failure
        // here can only be reported in-band.
        if (error instanceof GenerationBusy || error instanceof GenerationRefused) {
          send({ error: error.message })
        } else if (
          error instanceof Error &&
          (error.name === "AbortError" || request.signal.aborted)
        ) {
          // The writer navigated away or hit regenerate again. Nothing to say.
        } else {
          console.error("Draft generation failed:", error)
          send({
            error:
              error instanceof Error
                ? error.message
                : "Generation failed. Try again.",
          })
        }
      } finally {
        open = false
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Without this a proxy can buffer the whole stream and defeat the point.
      "X-Accel-Buffering": "no",
    },
  })
}

// Posts already in the workspace that share the subject of the brief. Real
// rows, so the step that claims to have read them is telling the truth.
async function relatedTitles(
  userId: string,
  source: string
): Promise<string[]> {
  const terms = source
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4)

  if (!terms.length) {
    return []
  }

  const posts = await getPosts(userId)
  return posts
    .filter((post) => {
      const haystack = post.title.toLowerCase()
      return terms.some((term) => haystack.includes(term))
    })
    .slice(0, 3)
    .map((post) => post.title)
}

import { NextResponse } from "next/server"

import { GenerationBusy, GenerationRefused } from "@/lib/ai/claude-cli"
import { generateSocialVersions, type SocialSource } from "@/lib/ai/social"
import { parsePlatformIds } from "@/lib/social-flow"
import { getPost } from "@/lib/post-store"
import { SOCIALS_ENABLED } from "@/lib/release"
import { currentUser } from "@/lib/session"

// Same shape as `/api/generate`: newline-delimited JSON, one `{phase}` per
// stage, then `{result}` or `{error}`. The deck is driven off those phases, so
// it reports work that is happening rather than spinning for an unknown time.

export const maxDuration = 300

type Line = { phase: string } | { result: unknown } | { error: string }

export async function POST(request: Request) {
  // The UI is gated in the blogger-only release, but a route left open is
  // still a route: it would spend the account's Claude quota on a feature this
  // build does not ship.
  if (!SOCIALS_ENABLED) {
    return NextResponse.json({ error: "Not available." }, { status: 404 })
  }

  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  let payload: { brief?: string; blog?: string; platforms?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 })
  }

  const platformIds = parsePlatformIds(payload.platforms)
  if (!platformIds.length) {
    return NextResponse.json(
      { error: "Pick at least one platform." },
      { status: 400 }
    )
  }

  // A blog id is resolved here rather than trusted from the client: the title
  // and opening that go into the prompt have to come from a post this account
  // actually owns.
  let source: SocialSource | undefined
  if (payload.blog) {
    const post = await getPost(user.id, payload.blog)
    if (!post) {
      return NextResponse.json(
        { error: "That blog post could not be found." },
        { status: 404 }
      )
    }
    source = { kind: "blog", title: post.title, body: post.body }
  } else if (payload.brief?.trim()) {
    source = { kind: "brief", text: payload.brief.trim() }
  }

  if (!source) {
    return NextResponse.json(
      { error: "Add a brief, or choose a blog post." },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (line: Line) => {
        if (open) {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
        }
      }

      try {
        send({ phase: "reading-brief" })

        const versions = await generateSocialVersions({
          source,
          platformIds,
          signal: request.signal,
          onPhase: (phase) => send({ phase }),
        })

        send({ phase: "shaping" })
        send({ result: { versions } })
      } catch (error) {
        if (error instanceof GenerationBusy || error instanceof GenerationRefused) {
          send({ error: error.message })
        } else if (
          error instanceof Error &&
          (error.name === "AbortError" || request.signal.aborted)
        ) {
          // The writer navigated away. Nothing to say.
        } else {
          console.error("Social generation failed:", error)
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
      "X-Accel-Buffering": "no",
    },
  })
}

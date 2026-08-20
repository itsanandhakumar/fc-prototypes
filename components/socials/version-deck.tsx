"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"

import { saveDeckSelection } from "@/app/socials-actions"
import { VersionPicker } from "@/components/socials/version-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Platform } from "@/lib/connectors"

// The deck used to be rebuilt from the URL on every visit, which worked because
// the generator was deterministic: the same brief and the same version number
// produced the same words. A model does not do that, so the drafts are
// generated once here and then carried — the chosen ones are saved as a draft
// post, and the editor opens that rather than regenerating.

const PHASES: Record<string, string> = {
  "reading-brief": "Reading the brief",
  writing: "Writing three versions of each",
  shaping: "Cutting each to its platform's limit",
}

export function VersionDeck({
  platforms,
  sourceTitle,
  brief,
  blogId,
  platformIds,
}: {
  platforms: Platform[]
  sourceTitle: string
  /** One of these is set — a brief typed by hand, or a blog post to write up. */
  brief?: string
  blogId?: string
  platformIds: string[]
}) {
  const router = useRouter()
  const [versions, setVersions] = React.useState<Record<string, string[]>>()
  const [phase, setPhase] = React.useState<string | null>("reading-brief")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const started = React.useRef(false)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      // Dev StrictMode remounts once and refs survive it, so the flag has to be
      // cleared or the remount skips the only generation. Same reasoning as the
      // blog editor.
      started.current = false
    },
    []
  )

  const generate = React.useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setVersions(undefined)
    setPhase("reading-brief")

    try {
      const response = await fetch("/api/generate-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          brief,
          blog: blogId,
          platforms: platformIds.join(","),
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
      let result: { versions: Record<string, string[]> } | undefined

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
          const message = JSON.parse(line)
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
        throw new Error("The drafts ended before they were finished.")
      }
      setVersions(result.versions)
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") {
        return
      }
      setError(caught instanceof Error ? caught.message : "Generation failed.")
    } finally {
      if (abortRef.current === controller) {
        setPhase(null)
        abortRef.current = null
      }
    }
  }, [brief, blogId, platformIds])

  React.useEffect(() => {
    if (started.current) {
      return
    }
    // Deferred a tick so StrictMode's simulated unmount cancels it before a
    // Claude process is spawned, rather than after.
    const timer = setTimeout(() => {
      started.current = true
      void generate()
    }, 0)
    return () => clearTimeout(timer)
  }, [generate])

  async function use(chosen: Record<string, string>) {
    setSaving(true)
    try {
      const id = await saveDeckSelection({
        name: sourceTitle,
        blogId,
        variants: Object.entries(chosen).map(([platformId, text]) => ({
          platformId,
          text,
        })),
      })
      router.push(`/socials/editor?post=${encodeURIComponent(id)}`)
    } catch {
      setError("Could not open the editor. Try again.")
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <p
          role="alert"
          className="flex max-w-md items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs/relaxed text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void generate()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!versions) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs/relaxed font-medium">Pick a version</span>
          <span className="flex items-center gap-2 text-xs/relaxed text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {PHASES[phase ?? "reading-brief"] ?? "Writing"}…
          </span>
        </div>

        {/* One placeholder deck per platform, at roughly the shape the real
            cards will take, so the page does not jump when they land. */}
        <div className="flex min-h-0 flex-1 items-center justify-center gap-6">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border p-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <VersionPicker
      platforms={platforms}
      versions={versions}
      sourceTitle={sourceTitle}
      onUse={use}
      saving={saving}
    />
  )
}

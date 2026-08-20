import "server-only"

import { runClaude, type ClaudeEvent } from "@/lib/ai/claude-cli"
import type { StoredBrief, StoredInsights } from "@/lib/db/schema"

// The draft and everything the panel says about it come back from one call.
// Two calls would mean the analysis describes a draft the model is no longer
// looking at — the keyword coverage and the gaps have to be read off the body
// that actually shipped.
//
// Going through the CLI means there is no `output_config.format` to enforce the
// shape, so the contract is asked for in the prompt and checked here. A first
// response that does not parse gets one corrective retry before giving up.

export type GeneratedDraft = {
  title: string
  body: string
} & StoredInsights

const STRING_FIELDS = ["title", "body", "metaDescription", "aiCitable"] as const
const ARRAY_FIELDS = [
  "workingKeywords",
  "gapKeywords",
  "alternateTitles",
  "postIdeas",
] as const

const SYSTEM_PROMPT = `You are the writing engine behind Forward Blogger, a tool content teams use to draft blog posts.

You reply with a single raw JSON object and nothing else. No prose before or after it, no markdown code fences, no explanation. The object has exactly these keys:

- "title": string. The post's headline, plain text, no markdown, no surrounding quotes.
- "body": string. The post itself in Markdown, using ## and ### headings, paragraphs, bullet and numbered lists, and **bold**. Never an H1 — the title is rendered separately.
- "metaDescription": string. An SEO meta description, one or two sentences, under 160 characters.
- "aiCitable": string. Two or three sentences on why an answer engine would quote this post, citing the draft's actual structure — heading count, question phrasing, length.
- "workingKeywords": array of 5-8 strings. Terms the draft genuinely covers well.
- "gapKeywords": array of 4-6 strings. Relevant terms the draft does NOT cover but plausibly could.
- "alternateTitles": array of 3 strings. Other headlines for this same post, each different from "title".
- "postIdeas": array of 3 strings. Headlines for separate future posts on subjects this draft leaves uncovered.

On the writing:
- Open with the argument, not with throat-clearing. No "In today's fast-paced world", no "Let's dive in", no restating the title back at the reader.
- Structure with ## section headings, and ### only where a section genuinely subdivides.
- Make claims specific enough to be wrong. Prefer a concrete number, mechanism, or example over a hedge.
- Vary sentence and paragraph length. A wall of same-length paragraphs reads as generated.
- Every keyword the brief lists must appear in the body, used naturally in a sentence that would exist anyway. Do not stuff.
- Hit the requested length approximately. Being 15% over or under is fine; being double is not.
- Never pad to reach the target.

On the report:
- "workingKeywords" and "gapKeywords" describe the draft you just wrote, not the brief. Read your own output back before answering.
- "gapKeywords" are real omissions worth covering, not synonyms of what you already said.
- "alternateTitles" are genuinely different angles on the same post, not the title reworded.
- "postIdeas" are separate posts, not sections you skipped.

Remember: the body is a JSON string value, so its newlines and quotes must be escaped correctly.`

function lengthGuidance(targetCharacters: number): string {
  // The brief's slider tops out at an open-ended stop, which reads to the model
  // as an exact target unless it is described as a floor.
  if (targetCharacters >= 6000) {
    return "Roughly 6,000 characters or more — this is the long-form end, so go deep rather than broad."
  }
  const words = Math.round(targetCharacters / 6)
  return `Roughly ${targetCharacters.toLocaleString()} characters (about ${words.toLocaleString()} words).`
}

function buildPrompt(brief: StoredBrief, variant: number, title?: string) {
  const parts = [
    `Brief: ${brief.brief.trim() || title || "Write a useful blog post."}`,
  ]

  if (title?.trim()) {
    parts.push(
      `Required title: ${title.trim()}\nUse this exact title — do not rewrite it.`
    )
  }

  if (brief.keywords.length) {
    parts.push(`Keywords to cover: ${brief.keywords.join(", ")}`)
  }

  parts.push(`Length: ${lengthGuidance(brief.targetCharacters)}`)

  // Regenerate has to produce a different post, not the same one reworded.
  if (variant > 0) {
    parts.push(
      `This is rewrite #${variant}. The previous draft has been discarded. Take a materially different angle: change the structure, lead with a different claim, and use different examples. Do not paraphrase the earlier attempt.`
    )
  }

  return parts.join("\n\n")
}

/** Pull the JSON object out of a response that may have ignored the "raw only"
    instruction and wrapped it in a fence or added a sentence around it. */
function extractJson(text: string): string {
  const trimmed = text.trim()

  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  if (fenced) {
    return fenced[1].trim()
  }

  // Fall back to the outermost braces, which survives a stray "Here you go:".
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return trimmed
}

/** Returns the draft, or a description of what was wrong with the response —
    which is fed back to the model on the retry. */
function parseDraft(text: string): GeneratedDraft | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(text))
  } catch {
    return { error: "the response was not valid JSON" }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "the response was not a JSON object" }
  }

  const value = parsed as Record<string, unknown>

  const missingStrings = STRING_FIELDS.filter(
    (field) => typeof value[field] !== "string" || !String(value[field]).trim()
  )
  if (missingStrings.length) {
    return {
      error: `these keys were missing or not non-empty strings: ${missingStrings.join(", ")}`,
    }
  }

  const badArrays = ARRAY_FIELDS.filter(
    (field) =>
      !Array.isArray(value[field]) ||
      (value[field] as unknown[]).some((item) => typeof item !== "string")
  )
  if (badArrays.length) {
    return {
      error: `these keys were missing or not arrays of strings: ${badArrays.join(", ")}`,
    }
  }

  return {
    title: String(value.title).trim(),
    // Models occasionally lead with an H1 despite the instruction. Stripping it
    // is cheaper than a retry, and the title is rendered separately.
    body: String(value.body)
      .replace(/^\s*#\s+.*\n+/, "")
      .trim(),
    metaDescription: String(value.metaDescription).trim(),
    aiCitable: String(value.aiCitable).trim(),
    workingKeywords: value.workingKeywords as string[],
    gapKeywords: value.gapKeywords as string[],
    alternateTitles: value.alternateTitles as string[],
    postIdeas: value.postIdeas as string[],
  }
}

/**
 * Writes a draft and its analysis in one call.
 *
 * @param onPhase Called as the run moves through its stages, so the editor can
 *   show what is actually happening rather than a timed animation.
 */
export async function generateDraft({
  brief,
  title,
  variant = 0,
  signal,
  onPhase,
}: {
  brief: StoredBrief
  /** Set when the writer has a title the draft must keep — a regenerate. */
  title?: string
  variant?: number
  signal?: AbortSignal
  onPhase?: (phase: string) => void
}): Promise<GeneratedDraft> {
  const prompt = buildPrompt(brief, variant, title)

  let attempt = 0
  let lastError = ""

  // Two attempts. The retry is not a blind repeat — it tells the model exactly
  // how the first response broke the contract, which is what makes it likely to
  // land the second time.
  while (attempt < 2) {
    const input =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response could not be used: ${lastError}. Reply again with ONLY the raw JSON object, starting with { and ending with }. No code fences, no commentary.`

    let announcedWriting = false
    const run = await runClaude({
      system: SYSTEM_PROMPT,
      prompt: input,
      signal,
      onEvent: (event: ClaudeEvent) => {
        // The first assistant message is the honest moment to say the draft is
        // being written — everything before it was start-up and thinking.
        if (event.type === "assistant" && !announcedWriting) {
          announcedWriting = true
          onPhase?.("writing")
        }
      },
    })

    onPhase?.("analysing")

    const parsed = parseDraft(run.text)
    if (!("error" in parsed)) {
      return parsed
    }

    lastError = parsed.error
    attempt += 1
  }

  throw new Error(
    `The model did not return a usable draft — ${lastError}. Try again, or shorten the brief.`
  )
}

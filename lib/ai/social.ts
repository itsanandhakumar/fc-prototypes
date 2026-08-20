import "server-only"

import { runClaude } from "@/lib/ai/claude-cli"
import { findPlatform } from "@/lib/connectors"
import { trimTo } from "@/lib/social-draft"

// Three drafts per platform, written by the model rather than assembled from
// templates.
//
// All of them come from one call. Asking per platform would produce three
// unrelated posts that happen to be about the same subject; asking once lets
// the model write the argument first and then say it at 3,000 characters and at
// 280 — which is what "the same post, adapted" actually means.

export type SocialSource =
  | { kind: "brief"; text: string }
  | { kind: "blog"; title: string; body?: string }

/** Per platform, `VERSION_COUNT` drafts in the order they should be dealt. */
export type SocialVersions = Record<string, string[]>

const VERSIONS = 3

const SYSTEM_PROMPT = `You write social posts for Forward, a content tool. You reply with a single raw JSON object and nothing else — no prose around it, no markdown fences.

The object has one key per platform id you are given. Each value is an array of exactly ${VERSIONS} strings: three different posts, in that platform's voice and within its character limit.

The three are different posts, not three edits of one:
- One leads with the strongest claim.
- One leads with the mistake most people make.
- One leads with a concrete number, example, or moment.

Across all of them:
- Write like a person posting, not like a brand. No "Excited to share", no "In today's landscape", no rhetorical question opener, no "Thoughts?" closer.
- No hashtags unless the brief asks for them. No emoji.
- Do not use markdown. These are plain-text posts.
- Never claim a specific statistic, customer, or result you were not given. Concrete means specific and true, not invented.
- Stay under the character limit given for that platform. Being well under is fine; being over is not.
- A LinkedIn post can use short paragraphs separated by a blank line. An X post is one to three sentences and must not be a thread.`

function describeSource(source: SocialSource): string {
  if (source.kind === "brief") {
    return `Write about this: ${source.text.trim()}`
  }

  const parts = [`Write a post promoting this blog article: "${source.title}"`]
  if (source.body?.trim()) {
    // The opening carries the argument, and the whole article would crowd out
    // the instructions for no gain — the post is an invitation to read it, not
    // a summary of it.
    parts.push(
      `The article opens:\n"""\n${source.body.trim().slice(0, 1500)}\n"""`
    )
  }
  parts.push(
    "The post should make someone want to read the article. Do not summarise the whole thing."
  )
  return parts.join("\n\n")
}

/** Trailing safety net. The prompt states the limit and the model generally
    respects it, but a post rejected by X for length is a worse outcome than one
    trimmed on a word boundary. */
function enforceLimit(platformId: string, text: string): string {
  const platform = findPlatform(platformId)
  if (!platform) {
    return text.trim()
  }
  return trimTo(text.trim(), platform.characterLimit)
}

export async function generateSocialVersions({
  source,
  platformIds,
  signal,
  onPhase,
}: {
  source: SocialSource
  platformIds: string[]
  signal?: AbortSignal
  onPhase?: (phase: string) => void
}): Promise<SocialVersions> {
  const platforms = platformIds
    .map((id) => findPlatform(id))
    .filter((platform): platform is NonNullable<typeof platform> =>
      Boolean(platform)
    )

  if (!platforms.length) {
    throw new Error("No platforms to write for.")
  }

  const spec = platforms
    .map(
      (platform) =>
        `- "${platform.id}" (${platform.name}): hard limit ${platform.characterLimit} characters.`
    )
    .join("\n")

  const prompt = [
    describeSource(source),
    `Platforms, and the key to use for each:\n${spec}`,
    `Reply with JSON shaped exactly like: {${platforms
      .map((platform) => `"${platform.id}": ["…", "…", "…"]`)
      .join(", ")}}`,
  ].join("\n\n")

  let attempt = 0
  let lastError = ""

  while (attempt < 2) {
    const input =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response could not be used: ${lastError}. Reply again with ONLY the raw JSON object.`

    let announced = false
    const run = await runClaude({
      system: SYSTEM_PROMPT,
      prompt: input,
      signal,
      onEvent: (event) => {
        if (event.type === "assistant" && !announced) {
          announced = true
          onPhase?.("writing")
        }
      },
    })

    const parsed = parseVersions(
      run.text,
      platforms.map((platform) => platform.id)
    )
    if (parsed.ok) {
      return parsed.versions
    }

    lastError = parsed.error
    attempt += 1
  }

  throw new Error(
    `The model did not return usable posts — ${lastError}. Try again, or shorten the brief.`
  )
}

type ParseResult =
  | { ok: true; versions: SocialVersions }
  | { ok: false; error: string }

function parseVersions(text: string, platformIds: string[]): ParseResult {
  const trimmed = text.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  const candidate = fenced
    ? fenced[1].trim()
    : start !== -1 && end > start
      ? trimmed.slice(start, end + 1)
      : trimmed

  let value: unknown
  try {
    value = JSON.parse(candidate)
  } catch {
    return { ok: false, error: "the response was not valid JSON" }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "the response was not a JSON object" }
  }

  const record = value as Record<string, unknown>
  const result: SocialVersions = {}

  for (const id of platformIds) {
    const drafts = record[id]
    if (!Array.isArray(drafts) || !drafts.length) {
      return { ok: false, error: `"${id}" was missing or not a non-empty array` }
    }
    if (drafts.some((draft) => typeof draft !== "string" || !draft.trim())) {
      return { ok: false, error: `"${id}" contained something that was not text` }
    }

    // Short by one is recoverable — repeating the last draft is better than
    // failing the whole run — but the deck always deals three.
    const texts = (drafts as string[]).map((draft) => enforceLimit(id, draft))
    while (texts.length < VERSIONS) {
      texts.push(texts[texts.length - 1])
    }
    result[id] = texts.slice(0, VERSIONS)
  }

  return { ok: true, versions: result }
}

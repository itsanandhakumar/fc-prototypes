// Turns a blog draft into a first pass at a social post. Deterministic, and
// shaped by the platform's limit — a LinkedIn post can carry the argument, an X
// post has to pick one line.

import type { Platform } from "@/lib/connectors"

const LINK_PLACEHOLDER = "forward.tools/blog"

function blocksOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function proseOf(body: string): string[] {
  return blocksOf(body).filter(
    (block) => !block.startsWith("#") && !/^([-*]|\d+[.)])\s/.test(block)
  )
}

function headingsOf(body: string): string[] {
  return blocksOf(body)
    .filter((block) => block.startsWith("## "))
    .map((block) => block.replace(/^#+\s*/, ""))
}

function firstSentence(text: string): string {
  return (text.split(/(?<=[.!?])\s/)[0] ?? text).trim()
}

function trimTo(text: string, limit: number): string {
  if (text.length <= limit) {
    return text
  }
  const cut = text.slice(0, limit - 1)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

export function composeSocialPost(
  platform: Platform,
  { title, body }: { title: string; body: string }
): string {
  const prose = proseOf(body)
  const hook = firstSentence(prose[0] ?? title)
  const link = `${LINK_PLACEHOLDER}/${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "post"
  }`

  // Short-form platforms get the hook and the link. Budget for a link at the
  // 23 characters X and Mastodon charge for one, whatever its real length.
  if (platform.copy === "short") {
    const budget = platform.characterLimit - 23 - 2
    return `${trimTo(hook, budget)}\n\n${link}`
  }

  const points = headingsOf(body)
    .filter((heading) => !/frequently asked/i.test(heading))
    .slice(0, 3)
    .map((heading) => `• ${heading}`)

  const closing = prose[prose.length - 1]
    ? firstSentence(prose[prose.length - 1])
    : ""

  const draft = [
    title,
    "",
    hook,
    points.length ? `\nWhat the post covers:\n${points.join("\n")}` : "",
    closing && closing !== hook ? `\n${closing}` : "",
    `\nFull post → ${link}`,
  ]
    .filter((part) => part !== "")
    .join("\n")

  return trimTo(draft, platform.characterLimit)
}

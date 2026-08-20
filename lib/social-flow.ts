// Making a post runs across three screens — the brief, on the Socials home; the
// deck of versions; the workspace.
//
// The URL carries what to write *about*, which is what lets the deck be a page:
// one you can land on, link to, and reload. It no longer carries which draft
// you picked. It used to, because the generator was deterministic — the same
// brief and the same version number rebuilt the same words, so nothing had to
// travel but the number.
//
// A model does not write the same post twice. So the deck's output is saved as
// a draft post when you choose it, and the workspace opens that. The practical
// difference: coming back to the deck deals a fresh three rather than the same
// three, and the post you picked is safe in the database either way.

import { SOCIAL_PLATFORM_IDS } from "@/lib/connectors"

/** A short internal label for the post. Never posted — it is what the list
    shows in place of a title, since a social post does not have one. */
export function nameFrom(text: string): string {
  const first = (text.trim().split(/\n|(?<=[.!?])\s/)[0] ?? "").trim()
  const words = first.split(/\s+/).filter(Boolean).slice(0, 7).join(" ")
  const trimmed = words.replace(/[.,;:!?]+$/, "")

  if (!trimmed) {
    return "Untitled post"
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** How many drafts a generate offers. Three is enough to be a choice and few
    enough to read before choosing. */
export const VERSION_COUNT = 3

/** What the post is being written from. A blog carries its title, because that
    is all the writing needs and all the trail has room for. */
export type PostSource =
  { kind: "brief"; text: string } | { kind: "blog"; text: string }

/** What this post goes by before it is saved and named properly. */
export function nameOf(source: PostSource): string {
  return source.kind === "blog" ? source.text : nameFrom(source.text)
}

// Everything below is the URL, read and written. Unknown platforms are dropped
// rather than trusted: these values are typed by hand as readily as they are
// linked to.

export function parsePlatformIds(value: string | undefined): string[] {
  const ids = (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => SOCIAL_PLATFORM_IDS.includes(id))

  // Registry order, so two links naming the same platforms are the same link.
  return SOCIAL_PLATFORM_IDS.filter((id) => ids.includes(id))
}

/**
 * What a link says the post came from. Deliberately not `PostSource`: a blog is
 * named by its id in the URL and by its title in the writing, and one type
 * meaning both would be a trap for whoever reads it next.
 */
export type SourceRef =
  { kind: "brief"; brief: string } | { kind: "blog"; blogId: string }

function sourceParams(ref: SourceRef, platformIds: string[]) {
  const params = new URLSearchParams()
  if (ref.kind === "blog") {
    params.set("blog", ref.blogId)
  } else {
    params.set("brief", ref.brief)
  }
  params.set("platforms", platformIds.join(","))
  return params
}

export function versionsHref(ref: SourceRef, platformIds: string[]): string {
  return `/socials/versions?${sourceParams(ref, platformIds)}`
}

/** The workspace, opened with nothing in it. */
export function blankEditorHref(platformIds: string[]): string {
  return `/socials/editor?platforms=${platformIds.join(",")}`
}

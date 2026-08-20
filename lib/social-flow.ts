// Making a post runs across three screens now — the brief, on the Socials home;
// the deck of versions; the workspace — and only the first of them holds any
// state. The other two rebuild what they show from the URL, which is what lets
// them be pages: ones you can land on, link to, and step back to when you want
// a different version.
//
// That works because the generator is deterministic. The same brief and the
// same variant number always come back with the same words, so a draft never
// has to be carried from one screen to the next. Its number is enough.

import { findPlatform, SOCIAL_PLATFORM_IDS } from "@/lib/connectors"
import { shapeFor } from "@/lib/social-draft"
import {
  generateFromBlogTitle,
  generateSocialPost,
  nameFrom,
} from "@/lib/social-generator"

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

/** Every draft on offer, before any platform has cut it down. */
export function mastersOf(source: PostSource): string[] {
  return Array.from({ length: VERSION_COUNT }, (_, variant) =>
    source.kind === "blog"
      ? generateFromBlogTitle(source.text, variant)
      : generateSocialPost(source.text, variant)
  )
}

/** The deck: every version, cut to every selected platform's limit. */
export function versionsOf(
  source: PostSource,
  platformIds: string[]
): Record<string, string[]> {
  const masters = mastersOf(source)

  return Object.fromEntries(
    platformIds.flatMap((id) => {
      const platform = findPlatform(id)
      return platform
        ? [[id, masters.map((master) => shapeFor(platform, master))]]
        : []
    })
  )
}

/** The one draft each platform ended up with, given the version chosen for it. */
export function draftsOf(
  source: PostSource,
  platformIds: string[],
  chosen: Record<string, number>
): Record<string, string> {
  const versions = versionsOf(source, platformIds)

  return Object.fromEntries(
    platformIds.flatMap((id) => {
      const text = versions[id]?.[chosen[id] ?? 0]
      return text ? [[id, text]] : []
    })
  )
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

/** "linkedin:1,x:0" — which version each platform settled on. */
export function parseChosen(value: string | undefined): Record<string, number> {
  const chosen: Record<string, number> = {}

  for (const pair of (value ?? "").split(",")) {
    const [id, index] = pair.split(":")
    const variant = Number(index)
    if (findPlatform(id) && Number.isInteger(variant)) {
      chosen[id] = Math.min(Math.max(variant, 0), VERSION_COUNT - 1)
    }
  }

  return chosen
}

export function formatChosen(chosen: Record<string, number>): string {
  return Object.entries(chosen)
    .map(([id, variant]) => `${id}:${variant}`)
    .join(",")
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

export function editorHref(
  ref: SourceRef,
  platformIds: string[],
  chosen: Record<string, number>
): string {
  const params = sourceParams(ref, platformIds)
  params.set("variants", formatChosen(chosen))
  return `/socials/editor?${params}`
}

/** The link back from the workspace to the deck it came through. */
export function refFromParams(params: {
  brief?: string
  blog?: string
}): SourceRef | undefined {
  if (params.blog) {
    return { kind: "blog", blogId: params.blog }
  }
  if (params.brief?.trim()) {
    return { kind: "brief", brief: params.brief }
  }
  return undefined
}

/** The workspace, opened with nothing in it. */
export function blankEditorHref(platformIds: string[]): string {
  return `/socials/editor?platforms=${platformIds.join(",")}`
}

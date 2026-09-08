// What a post needs settling before it goes to the CMS. The editor knows the
// text; these are the things the blog knows — where it lives, who signed it,
// what it is filed under — and the publish dialog is where they are confirmed.
//
// Everything here is derived from the draft, so the dialog opens filled in and
// the writer is correcting rather than composing. What they land on is kept
// with the post, so publishing it a second time opens on last time's answers
// instead of guessing again.

import { slugify } from "@/lib/slug"

/**
 * What a featured image is expected to be. 1200 x 630 is the size a link
 * preview is cropped to across the places a post gets shared, so it is the
 * size the generated card is drawn at and the size an uploaded one is measured
 * against. Kept as the two numbers rather than as a ratio because the dialog
 * quotes them.
 */
export const FEATURED_IMAGE_WIDTH = 1200
export const FEATURED_IMAGE_HEIGHT = 630

export type FeaturedImage = {
  /**
   * `generated` is the card the prototype draws from the title, the same
   * treatment the social previews use for a share image. `upload` is a real
   * file the writer chose.
   */
  source: "generated" | "upload"
  name: string
  /**
   * Object URL for an uploaded file, so the real image renders. Client-side
   * only and not stored with the post: it dies with the page that made it,
   * and a stored one would point at nothing after a reload.
   */
  url?: string
  /**
   * The real pixel size of an uploaded file, read once when it is chosen. The
   * generated card carries none: it is drawn to the expected size by
   * definition, so there is nothing to measure.
   */
  width?: number
  height?: number
}

export type PublishSettings = {
  title: string
  /** The snippet under the title in a result. */
  metaDescription: string
  /**
   * BCP 47, taken from the connection. Recorded rather than offered: the blog
   * has one language, chosen once when it was connected, so there was nothing
   * for the publish dialog to do with it but repeat it back.
   */
  language: string
  /** The path segment the blog itself lives under, between domain and post. */
  blogSlug: string
  /** The post's own segment. */
  contentSlug: string
  author: string
  tags: string[]
  featuredImage: FeaturedImage
}

/** What HubSpot calls the blog's own path. */
export const DEFAULT_BLOG_SLUG = "blog"

/**
 * Where a search result stops showing the description. Not a hard limit — the
 * field takes more and the dialog only says so — because the cut-off moves
 * with the width of the result, and a writer who has a reason to run long
 * should not be stopped by a number that is itself an approximation.
 */
export const META_DESCRIPTION_LIMIT = 155

/** Enough to file a post by; more than this is a taxonomy, not a post. */
export const MAX_TAGS = 6

export const GENERATED_IMAGE_NAME = "Generated from the title"

/** Pixel dimensions as the dialog writes them. */
export function formatDimensions(width: number, height: number): string {
  return `${width.toLocaleString()} × ${height.toLocaleString()}`
}

/**
 * What the dialog says under the image, and whether that is a complaint.
 * An upload off the expected size still publishes — the CMS would crop it —
 * so the mismatch is reported rather than blocked.
 */
export function describeFeaturedImage(image: FeaturedImage): {
  size: string
  offSize: boolean
} {
  if (image.source === "generated" || !image.width || !image.height) {
    return {
      size: formatDimensions(FEATURED_IMAGE_WIDTH, FEATURED_IMAGE_HEIGHT),
      offSize: false,
    }
  }

  return {
    size: formatDimensions(image.width, image.height),
    offSize:
      image.width !== FEATURED_IMAGE_WIDTH ||
      image.height !== FEATURED_IMAGE_HEIGHT,
  }
}

/**
 * A slug as it would be typed. Kept separate from `slugify`, which turns prose
 * into a slug: this one is for a field already holding one, so it has to leave
 * a half-typed value alone rather than eat the hyphen the writer just entered.
 */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60)
}

/** The address a post will live at, as one string. */
export function blogUrl({
  domain,
  blogSlug,
  contentSlug,
}: {
  domain: string
  blogSlug: string
  contentSlug: string
}): string {
  return [domain, blogSlug, contentSlug].filter(Boolean).join("/")
}

// Keywords come out of the analysis in lower case because that is how the body
// was matched; a tag is a label, so it is written as one.
function asTag(keyword: string): string {
  return keyword
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * The keywords worth filing the post under. The analysis ranks phrases and the
 * single words inside them separately — useful when reading what a draft is
 * working, useless as tags, where "Content Refresh" sitting beside "Content"
 * and "Refresh" reads as a mistake.
 *
 * A keyword drops out when another one already says it: every word of it
 * appears in a longer keyword on the list. Matching whole words rather than
 * substrings is what keeps "Work" from being swallowed by "Network". The
 * ranking survives — the analysis orders these by how much use the body gives
 * them, and that is the order worth filing them in.
 */
export function tagsFromKeywords(keywords: string[]): string[] {
  const entries = keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .map((keyword) => ({ keyword, words: keyword.split(/\s+/) }))

  const kept = entries.filter(
    (entry) =>
      !entries.some(
        (other) =>
          other.words.length > entry.words.length &&
          entry.words.every((word) => other.words.includes(word))
      )
  )

  return [...new Set(kept.map((entry) => asTag(entry.keyword)))].slice(
    0,
    MAX_TAGS
  )
}

/**
 * The dialog's opening state. `stored` wins wherever it has an answer, because
 * a post being published again should not quietly move to a new address; the
 * title and language are the exceptions, since both are owned elsewhere — the
 * editor holds one and the connection holds the other.
 */
export function defaultPublishSettings({
  title,
  language,
  author,
  suggestedTags = [],
  suggestedMetaDescription = "",
  stored,
}: {
  title: string
  language: string
  author: string
  /** Working keywords from the draft's analysis, if it has been analysed. */
  suggestedTags?: string[]
  /** The description the analysis drew from the draft's opening. */
  suggestedMetaDescription?: string
  /** What this post was published with last time, if it has been. */
  stored?: PublishSettings
}): PublishSettings {
  const heading = title.trim() || "Untitled post"

  return {
    title: heading,
    metaDescription: stored?.metaDescription || suggestedMetaDescription,
    language,
    blogSlug: stored?.blogSlug || DEFAULT_BLOG_SLUG,
    contentSlug: stored?.contentSlug || slugify(heading),
    author: stored?.author || author,
    tags: stored?.tags.length ? stored.tags : tagsFromKeywords(suggestedTags),
    // An uploaded image cannot survive the round trip (see FeaturedImage), so
    // a post published with one opens back on the generated card rather than
    // on a broken reference to the file.
    featuredImage: { source: "generated", name: GENERATED_IMAGE_NAME },
  }
}

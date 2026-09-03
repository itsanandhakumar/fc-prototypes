import "server-only"

// A thin client over the HubSpot CMS v3 API — only the calls Forward makes.
//
// Auth is an OAuth access token: `Authorization: Bearer <token>`. Tokens last
// half an hour, so callers must get theirs from `hubspotSession()` rather than
// straight off the connection row; nothing in this file refreshes anything.
//
// Two scopes are in play. `content` covers posts, authors and tags; `files`
// covers uploading a featured image. HubSpot returns a 403 naming the missing
// one, and that message is worth surfacing verbatim — it is the single most
// common setup mistake.

const BASE = "https://api.hubapi.com"

export class HubSpotError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: string
  ) {
    super(message)
    this.name = "HubSpotError"
  }
}

async function call<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      // These are user-triggered writes; a cached publish would be a bug.
      cache: "no-store",
    })
  } catch (error) {
    throw new HubSpotError(
      0,
      "Could not reach HubSpot. Check the network and try again.",
      error instanceof Error ? error.message : undefined
    )
  }

  if (!response.ok) {
    // HubSpot returns JSON errors, but a gateway in front of it may not.
    const raw = await response.text()
    let detail = raw.slice(0, 500)
    try {
      const parsed = JSON.parse(raw) as { message?: string; errors?: unknown }
      if (parsed.message) {
        detail = parsed.message
      }
    } catch {
      // Keep the raw body.
    }

    throw new HubSpotError(response.status, messageFor(response.status), detail)
  }

  // 204 on delete, and some endpoints return an empty body.
  const text = await response.text()
  return (text ? JSON.parse(text) : {}) as T
}

function messageFor(status: number): string {
  switch (status) {
    case 401:
      return "HubSpot rejected the token. Disconnect and connect HubSpot again."
    case 403:
      return "The connection is missing a scope HubSpot needs for this. Reconnect to grant it — HubSpot names the missing scope below."
    case 404:
      return "HubSpot could not find that blog, author or post. Reconnect and pick them again."
    case 429:
      return "HubSpot is rate-limiting this account. Wait a moment and try again."
    default:
      return `HubSpot returned ${status}.`
  }
}

// ---------------------------------------------------------------------------
// Reads, used while connecting and while filling in the publish dialog
// ---------------------------------------------------------------------------

export type HubSpotBlog = {
  id: string
  name: string
  /** The public address posts appear under. */
  absoluteUrl?: string
  language?: string
  /** The path segment between the domain and the post's own slug. */
  slug?: string
}

/** The blogs this portal has. The id is the `contentGroupId` a post is filed
    under, and an account with several blogs has to choose. */
export async function listBlogs(token: string): Promise<HubSpotBlog[]> {
  const data = await call<{ results?: HubSpotBlog[] }>(
    token,
    "/cms/v3/blog-settings/settings?limit=100"
  )
  return data.results ?? []
}

export type HubSpotAuthor = {
  id: string
  name?: string
  fullName?: string
  email?: string
}

export async function listAuthors(token: string): Promise<HubSpotAuthor[]> {
  const data = await call<{ results?: HubSpotAuthor[] }>(
    token,
    "/cms/v3/blogs/authors?limit=100"
  )
  return data.results ?? []
}

export type HubSpotTag = {
  id: string
  name: string
  language?: string
  deletedAt?: string | null
}

/** Tags are portal-wide rather than per-blog, and HubSpot keeps deleted ones
    in the collection, so the tombstones are dropped here rather than in every
    caller. */
export async function listTags(token: string): Promise<HubSpotTag[]> {
  const data = await call<{ results?: HubSpotTag[] }>(
    token,
    "/cms/v3/blogs/tags?limit=200"
  )
  return (data.results ?? []).filter((tag) => !tag.deletedAt)
}

/** A tag typed into the publish dialog that the portal does not have yet.
    HubSpot has no "get or create", so the caller matches by name first. */
export async function createTag(
  token: string,
  name: string,
  language?: string
): Promise<HubSpotTag> {
  return call<HubSpotTag>(token, "/cms/v3/blogs/tags", {
    method: "POST",
    body: JSON.stringify(language ? { name, language } : { name }),
  })
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export type HubSpotFile = {
  id: string
  url?: string
  name?: string
}

/**
 * Puts an image in the portal's own file manager and hands back its public
 * URL, which is what a blog post's `featuredImage` wants.
 *
 * It has to live in HubSpot rather than be linked from wherever the writer got
 * it: a featured image is served to every reader of the post and shown by
 * every social network that unfurls it, so a link to a temporary URL would rot
 * in public. `PUBLIC_INDEXABLE` is deliberate for the same reason — a private
 * file would 404 for readers.
 *
 * This is the one call that is not JSON, so it does not go through `call`.
 */
export async function uploadFile(
  token: string,
  file: File,
  folderPath = "/forward"
): Promise<HubSpotFile> {
  const form = new FormData()
  form.append("file", file, file.name || "featured-image")
  form.append("folderPath", folderPath)
  form.append(
    "options",
    JSON.stringify({
      access: "PUBLIC_INDEXABLE",
      // Two posts about the same subject should not fight over one filename.
      duplicateValidationStrategy: "NONE",
      duplicateValidationScope: "EXACT_FOLDER",
      overwrite: false,
    })
  )

  let response: Response
  try {
    response = await fetch(`${BASE}/files/v3/files`, {
      method: "POST",
      // No Content-Type: fetch sets it, with the multipart boundary.
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      cache: "no-store",
    })
  } catch (error) {
    throw new HubSpotError(
      0,
      "Could not reach HubSpot to upload the image.",
      error instanceof Error ? error.message : undefined
    )
  }

  const raw = await response.text()
  if (!response.ok) {
    let detail = raw.slice(0, 500)
    try {
      const parsed = JSON.parse(raw) as { message?: string }
      if (parsed.message) {
        detail = parsed.message
      }
    } catch {
      // Keep the raw body.
    }
    throw new HubSpotError(response.status, messageFor(response.status), detail)
  }

  return JSON.parse(raw) as HubSpotFile
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export type PublishInput = {
  /** Set on a re-publish, so the same post is updated rather than duplicated. */
  hubspotPostId?: string | null
  blogId: string
  name: string
  slug: string
  /** HTML, not Markdown — HubSpot stores the rendered body. */
  postBody: string
  metaDescription?: string
  authorId?: string
  /** Tag ids, already resolved. Names are turned into ids by the caller,
      because creating a tag is a write the writer should be told about. */
  tagIds?: string[]
  featuredImageUrl?: string
  featuredImageAltText?: string
  /** The blog files every post under one language; ISO 639, e.g. "en". */
  language?: string
  /** Omit to publish immediately; a future instant schedules it. */
  publishAt?: Date | null
}

export type HubSpotPost = {
  id: string
  url?: string
  absoluteUrl?: string
  slug?: string
  state?: string
}

/**
 * Write the post, then make it live.
 *
 * These are two steps because HubSpot makes them two. A POST creates a draft
 * whatever `state` says, and a PATCH against a post that is already live edits
 * its *buffered draft* rather than the page the public sees. So the body goes
 * up first, and the transition is asked for separately.
 *
 * Publishing has a required set — name, contentGroupId, slug, blogAuthorId,
 * metaDescription, and either a featured image or `useFeaturedImage: false` —
 * which is exactly why the publish dialog asks for an author, a meta
 * description and an image rather than leaving them to HubSpot's defaults.
 */
export async function publishBlogPost(
  token: string,
  input: PublishInput
): Promise<HubSpotPost> {
  const scheduled = Boolean(input.publishAt && input.publishAt > new Date())

  const body: Record<string, unknown> = {
    name: input.name,
    contentGroupId: input.blogId,
    slug: input.slug,
    postBody: input.postBody,
    // Sent explicitly rather than left to default: HubSpot rejects a publish
    // that says nothing about the featured image either way.
    useFeaturedImage: Boolean(input.featuredImageUrl),
  }

  if (input.metaDescription) {
    body.metaDescription = input.metaDescription
  }
  if (input.authorId) {
    body.blogAuthorId = input.authorId
  }
  if (input.tagIds?.length) {
    body.tagIds = input.tagIds
  }
  if (input.featuredImageUrl) {
    body.featuredImage = input.featuredImageUrl
    if (input.featuredImageAltText) {
      body.featuredImageAltText = input.featuredImageAltText
    }
  }
  if (input.language) {
    body.language = input.language
  }
  if (input.publishAt) {
    body.publishDate = input.publishAt.toISOString()
  }

  // An update keeps the post's address and its accumulated analytics; a create
  // would strand both at the old URL.
  const post = input.hubspotPostId
    ? await call<HubSpotPost>(
        token,
        `/cms/v3/blogs/posts/${encodeURIComponent(input.hubspotPostId)}`,
        { method: "PATCH", body: JSON.stringify(body) }
      )
    : await call<HubSpotPost>(token, "/cms/v3/blogs/posts", {
        method: "POST",
        body: JSON.stringify(body),
      })

  const id = encodeURIComponent(post.id)

  if (scheduled) {
    await call(token, "/cms/v3/blogs/posts/schedule", {
      method: "POST",
      body: JSON.stringify({
        id: post.id,
        publishDate: input.publishAt!.toISOString(),
      }),
    })
    return post
  }

  // Live now. For a post that has never been published this is the transition;
  // for one that has, the edit above went into a draft and this is what moves
  // it. Both are asked for, in that order, because neither covers both cases.
  await call(token, `/cms/v3/blogs/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "PUBLISHED" }),
  })

  try {
    await call(token, `/cms/v3/blogs/posts/${id}/draft/push-live`, {
      method: "POST",
    })
  } catch {
    // Expected on a post with no buffered draft, which is the common case: the
    // PATCH above already published it. A real failure surfaces at the next
    // read, and losing the post to an error here would be the worse outcome.
  }

  return post
}

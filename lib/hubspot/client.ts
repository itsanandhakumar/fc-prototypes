import "server-only"

// A thin client over the HubSpot CMS v3 API — only the calls Forward makes.
//
// Auth is a private-app token: `Authorization: Bearer <token>`. Unlike OAuth
// there is nothing to refresh, which is why `connection.refreshToken` stays
// null for HubSpot.
//
// The scope the token needs is `content`. HubSpot returns a 403 with a body
// naming the missing scope when it is absent, and that message is worth
// surfacing verbatim — it is the single most common setup mistake.

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
      return "HubSpot rejected the token. Reconnect with a fresh private-app token."
    case 403:
      return "The token is missing the `content` scope. Add it to the private app in HubSpot, then copy the token again — changing scopes issues a new one."
    case 404:
      return "HubSpot could not find that blog or author. Reconnect and pick them again."
    case 429:
      return "HubSpot is rate-limiting this account. Wait a moment and try again."
    default:
      return `HubSpot returned ${status}.`
  }
}

// ---------------------------------------------------------------------------
// Reads, used while connecting
// ---------------------------------------------------------------------------

export type HubSpotBlog = {
  id: string
  name: string
  /** The public address posts appear under. */
  absoluteUrl?: string
  language?: string
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

/** Confirms the token works and names the portal, so Settings can show which
    account is connected rather than just "connected". */
export async function describeToken(token: string): Promise<{
  portalId: number
  label: string
}> {
  const data = await call<{ hub_id?: number; user?: string }>(
    token,
    `/oauth/v1/access-tokens/${encodeURIComponent(token)}`
  )

  const portalId = data.hub_id ?? 0
  return {
    portalId,
    label: portalId ? `Portal ${portalId}` : "HubSpot",
  }
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
  featuredImageUrl?: string
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
    state: scheduled ? "SCHEDULED" : "PUBLISHED",
    publishDate: (input.publishAt ?? new Date()).toISOString(),
  }

  if (input.metaDescription) {
    body.metaDescription = input.metaDescription
  }
  if (input.authorId) {
    body.blogAuthorId = input.authorId
  }
  if (input.featuredImageUrl) {
    body.featuredImage = input.featuredImageUrl
    body.useFeaturedImage = true
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

  // Creating a post leaves it in the requested state, but HubSpot treats
  // "published" as a separate transition on some portals. Pushing it live is
  // idempotent, so it is safe to call either way — and a failure here should
  // not lose the post that was just written.
  if (!scheduled) {
    try {
      await call(
        token,
        `/cms/v3/blogs/posts/${encodeURIComponent(post.id)}/publish-action`,
        { method: "POST", body: JSON.stringify({ action: "schedule-publish" }) }
      )
    } catch {
      // The post exists; the caller reports the URL it came back with.
    }
  }

  return post
}

"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { connectionFor, removeConnection, saveConnection } from "@/lib/connections"
import type { ConnectionProvider, StoredInsights } from "@/lib/db/schema"
import type { DraftBrief } from "@/lib/draft-generator"
import {
  createTag,
  HubSpotError,
  listAuthors,
  listBlogs,
  listTags,
  publishBlogPost,
  uploadFile,
} from "@/lib/hubspot/client"
import { HubSpotAuthError } from "@/lib/hubspot/oauth"
import { hubspotSession } from "@/lib/hubspot/token"
import { markdownToHtml } from "@/lib/markdown"
import { getPost, savePost, setHubSpotPublication } from "@/lib/post-store"
import { requireUser } from "@/lib/session"
import { slugify } from "@/lib/slug"

export type ConnectState = { error: string | null }

// Everything HubSpot fails with is reported in HubSpot's own words. "The
// connection is missing a scope" is actionable in a way "publishing failed" is
// not, and the detail HubSpot attaches usually names the exact scope or field.
function reportFailure(error: unknown): string {
  if (error instanceof HubSpotError) {
    return `${error.message}${error.detail ? ` — ${error.detail}` : ""}`
  }
  if (error instanceof HubSpotAuthError) {
    return error.message
  }
  throw error
}

// ---------------------------------------------------------------------------
// Connecting
//
// The OAuth round trip itself lives in app/api/connectors/hubspot/*. By the
// time anything here runs, the grant is already stored — what is left is the
// part only the customer can answer: which blog, in which language, under
// whose name.
// ---------------------------------------------------------------------------

export type HubSpotSetupOptions = {
  error: string | null
  portalLabel?: string
  blogs?: Array<{ id: string; name: string; url?: string; language?: string }>
  authors?: Array<{ id: string; name: string }>
}

/** What the finish-setup step offers. Called once the customer is back from
    HubSpot, so a failure here means the fresh grant cannot read the portal —
    almost always a missing scope, which is why the message is passed through. */
export async function hubspotSetupOptions(): Promise<HubSpotSetupOptions> {
  const user = await requireUser()

  try {
    const { token, connection } = await hubspotSession(user.id)
    const [blogs, authors] = await Promise.all([
      listBlogs(token),
      listAuthors(token),
    ])

    if (!blogs.length) {
      return {
        error:
          "The connection works, but this portal has no blog. Create one in HubSpot under Content → Blog, then reconnect.",
      }
    }

    return {
      error: null,
      portalLabel: connection.accountLabel ?? "HubSpot",
      blogs: blogs.map((blog) => ({
        id: blog.id,
        name: blog.name,
        url: blog.absoluteUrl,
        language: blog.language,
      })),
      authors: authors.map((author) => ({
        id: author.id,
        name: author.fullName || author.name || author.email || "Unnamed",
      })),
    }
  } catch (error) {
    return { error: reportFailure(error) }
  }
}

/**
 * The second half of connecting: point the grant at a blog.
 *
 * The language is asked here and nowhere else. HubSpot files every post on a
 * blog under one language and changing it later re-files the whole blog, so it
 * is a property of the connection rather than of a post — which is exactly how
 * the writer thinks about it too.
 */
export async function finishHubSpotSetup(input: {
  blogId: string
  blogName: string
  domain?: string
  language: string
  authorId?: string
  authorName?: string
}): Promise<ConnectState> {
  const user = await requireUser()

  if (!input.blogId) {
    return { error: "Pick a blog before connecting." }
  }

  const existing = await connectionFor(user.id, "hubspot")
  if (!existing) {
    return { error: "The HubSpot connection is gone. Connect again." }
  }

  await saveConnection({
    userId: user.id,
    provider: "hubspot",
    accessToken: existing.accessToken,
    refreshToken: existing.refreshToken,
    expiresAt: existing.expiresAt,
    // Now that there is a blog, it leads the label: it is the part the writer
    // recognises, and a portal can hold several.
    accountLabel: `${input.blogName} · ${existing.meta?.hubDomain ?? `Portal ${existing.meta?.portalId ?? ""}`.trim()}`,
    meta: {
      ...existing.meta,
      blogId: input.blogId,
      blogName: input.blogName,
      domain: input.domain,
      language: input.language,
      authorId: input.authorId,
      authorName: input.authorName,
    },
  })

  revalidatePath("/blogger")
  revalidatePath("/editor")
  return { error: null }
}

export async function disconnectProvider(provider: ConnectionProvider) {
  const user = await requireUser()
  await removeConnection(user.id, provider)
  revalidatePath("/blogger")
  revalidatePath("/socials")
  revalidatePath("/editor")
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export type HubSpotPublishContext = {
  error: string | null
  /** Connected, but never pointed at a blog. */
  needsSetup?: boolean
  accountLabel?: string
  blogName?: string
  /** Host only — "blog.forward.tools". */
  domain?: string
  /** The blog's own path segment between the host and the post's slug. */
  pathPrefix?: string
  language?: string
  authors?: Array<{ id: string; name: string }>
  tags?: Array<{ id: string; name: string }>
  defaultAuthorId?: string
}

/**
 * What the publish dialog needs to fill itself in.
 *
 * Authors and tags are read live rather than cached on the connection: both
 * are edited in HubSpot, and a stale list would offer the writer an author who
 * has left. It is one round trip, on opening a dialog the writer is about to
 * spend a moment in.
 */
export async function hubspotPublishContext(): Promise<HubSpotPublishContext> {
  const user = await requireUser()

  try {
    const { token, connection } = await hubspotSession(user.id)

    if (!connection.meta?.blogId) {
      return { error: null, needsSetup: true }
    }

    const [authors, tags] = await Promise.all([
      listAuthors(token),
      listTags(token),
    ])

    // `absoluteUrl` is the blog's public address — "https://blog.forward.tools/blog".
    // The dialog shows it the way HubSpot's own editor does, host and path
    // apart, so the writer can see which segment the slug is being added to.
    let domain: string | undefined
    let pathPrefix: string | undefined
    if (connection.meta.domain) {
      try {
        const url = new URL(connection.meta.domain)
        domain = url.host
        pathPrefix = url.pathname.replace(/^\/+|\/+$/g, "") || undefined
      } catch {
        domain = connection.meta.domain.replace(/^https?:\/\//, "")
      }
    }

    return {
      error: null,
      accountLabel: connection.accountLabel ?? "HubSpot",
      blogName: connection.meta.blogName,
      domain,
      pathPrefix,
      language: connection.meta.language,
      defaultAuthorId: connection.meta.authorId,
      authors: authors.map((author) => ({
        id: author.id,
        name: author.fullName || author.name || author.email || "Unnamed",
      })),
      tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
    }
  } catch (error) {
    return { error: reportFailure(error) }
  }
}

/**
 * Puts an image in the portal's file manager and returns its public URL.
 *
 * Separate from publishing so the writer sees the image in the dialog before
 * committing to anything — and so a failed upload costs them the image rather
 * than the post.
 */
export async function uploadHubSpotImage(
  formData: FormData
): Promise<{ error: string | null; url?: string }> {
  const user = await requireUser()

  const file = formData.get("file")
  if (!(file instanceof File) || !file.size) {
    return { error: "Choose an image first." }
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That is not an image." }
  }
  // HubSpot accepts far more than this; the limit is here so a mis-drag costs
  // a message rather than a minute of uploading.
  if (file.size > 10 * 1024 * 1024) {
    return { error: "That image is over 10MB. Use a smaller one." }
  }

  try {
    const { token } = await hubspotSession(user.id)
    const uploaded = await uploadFile(token, file)
    if (!uploaded.url) {
      return { error: "HubSpot stored the image but returned no URL for it." }
    }
    return { error: null, url: uploaded.url }
  } catch (error) {
    return { error: reportFailure(error) }
  }
}

/** Tag names typed into the dialog become ids here. An existing tag is matched
    by name before a new one is created, because two tags called the same thing
    are worse than none. */
async function resolveTags(
  token: string,
  names: string[],
  language?: string
): Promise<string[]> {
  if (!names.length) {
    return []
  }

  const existing = await listTags(token)
  const byName = new Map(
    existing.map((tag) => [tag.name.trim().toLowerCase(), tag.id])
  )

  const ids: string[] = []
  for (const name of names) {
    const key = name.trim().toLowerCase()
    if (!key) {
      continue
    }
    const found = byName.get(key)
    if (found) {
      ids.push(found)
      continue
    }
    const created = await createTag(token, name.trim(), language)
    byName.set(key, created.id)
    ids.push(created.id)
  }

  return ids
}

export type PublishResult = { error: string | null; url?: string }

export async function publishToHubSpot(input: {
  postId?: string
  title: string
  body: string
  brief?: DraftBrief
  insights?: StoredInsights
  /** Overrides from the dialog, where the writer can change what was filled in. */
  slug?: string
  metaDescription?: string
  authorId?: string
  /** Tags already in the portal. */
  tagIds?: string[]
  /** Tags typed in the dialog that may not exist yet. */
  tagNames?: string[]
  featuredImageUrl?: string
  featuredImageAltText?: string
}): Promise<PublishResult> {
  const user = await requireUser()

  let token: string
  let meta
  try {
    const session = await hubspotSession(user.id)
    token = session.token
    meta = session.connection.meta
  } catch (error) {
    return { error: reportFailure(error) }
  }

  const blogId = meta?.blogId
  if (!blogId) {
    return {
      error: "The HubSpot connection has no blog set. Finish setup in Settings.",
    }
  }

  const title = input.title.trim() || "Untitled post"

  // Save first. If HubSpot then fails, the writer still has the post — losing
  // the draft because a third party was down would be the worse outcome.
  const saved = await savePost({
    userId: user.id,
    id: input.postId || undefined,
    title,
    body: input.body,
    status: "Draft",
    brief: input.brief
      ? {
          brief: input.brief.brief,
          keywords: input.brief.keywords,
          targetCharacters: input.brief.targetCharacters,
        }
      : undefined,
    insights: input.insights,
  })

  const existing = await getPost(user.id, saved.id)

  try {
    const tagIds = [
      ...(input.tagIds ?? []),
      ...(await resolveTags(token, input.tagNames ?? [], meta?.language)),
    ]

    const post = await publishBlogPost(token, {
      hubspotPostId: existing?.hubspotPostId ?? null,
      blogId,
      name: title,
      slug: (input.slug || slugify(title)).replace(/^\/+/, ""),
      // HubSpot stores rendered HTML, not Markdown.
      postBody: markdownToHtml(input.body),
      metaDescription:
        input.metaDescription ?? input.insights?.metaDescription ?? undefined,
      authorId: input.authorId ?? meta?.authorId,
      tagIds: Array.from(new Set(tagIds)),
      featuredImageUrl: input.featuredImageUrl,
      // The title is a reasonable description of an image chosen to illustrate
      // it, and an empty alt on a post's lead image is an accessibility bug.
      featuredImageAltText: input.featuredImageAltText || title,
      language: meta?.language,
    })

    const url =
      post.absoluteUrl ??
      post.url ??
      (meta?.domain
        ? `${meta.domain.replace(/\/+$/, "")}/${post.slug ?? slugify(title)}`
        : undefined)

    await setHubSpotPublication({
      userId: user.id,
      id: saved.id,
      hubspotPostId: post.id,
      hubspotUrl: url ?? null,
    })
  } catch (error) {
    return { error: reportFailure(error) }
  }

  revalidatePath("/blogger")
  redirect(`/blogger?posted=${encodeURIComponent(saved.id)}`)
}

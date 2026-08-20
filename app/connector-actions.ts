"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { removeConnection, connectionFor, saveConnection } from "@/lib/connections"
import type { ConnectionProvider, StoredInsights } from "@/lib/db/schema"
import type { DraftBrief } from "@/lib/draft-generator"
import {
  describeToken,
  HubSpotError,
  listAuthors,
  listBlogs,
  publishBlogPost,
} from "@/lib/hubspot/client"
import { markdownToHtml } from "@/lib/markdown"
import { getPost, savePost, setHubSpotPublication } from "@/lib/post-store"
import { requireUser } from "@/lib/session"
import { slugify } from "@/lib/slug"

export type ConnectState = { error: string | null }

// ---------------------------------------------------------------------------
// Connecting
// ---------------------------------------------------------------------------

/** Step one: the token is checked against HubSpot before anything is stored, so
    a typo fails here rather than at publish time. Returns what the account has
    to choose between. */
export async function inspectHubSpotToken(token: string): Promise<{
  error: string | null
  label?: string
  blogs?: Array<{ id: string; name: string; url?: string; language?: string }>
  authors?: Array<{ id: string; name: string }>
}> {
  await requireUser()

  const trimmed = token.trim()
  if (!trimmed) {
    return { error: "Paste the private-app token first." }
  }

  try {
    const [described, blogs, authors] = await Promise.all([
      describeToken(trimmed),
      listBlogs(trimmed),
      listAuthors(trimmed),
    ])

    if (!blogs.length) {
      return {
        error:
          "That token works, but the portal has no blog. Create one in HubSpot under Content → Blog, then try again.",
      }
    }

    return {
      error: null,
      label: described.label,
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
    if (error instanceof HubSpotError) {
      return { error: `${error.message}${error.detail ? ` (${error.detail})` : ""}` }
    }
    throw error
  }
}

/** Step two: store it. The token was already proven in step one. */
export async function connectHubSpot(input: {
  token: string
  blogId: string
  blogName: string
  domain?: string
  authorId?: string
  authorName?: string
  language: string
  label: string
}): Promise<ConnectState> {
  const user = await requireUser()

  if (!input.token.trim() || !input.blogId) {
    return { error: "Pick a blog before connecting." }
  }

  await saveConnection({
    userId: user.id,
    provider: "hubspot",
    accessToken: input.token.trim(),
    accountLabel: `${input.blogName} · ${input.label}`,
    meta: {
      blogId: input.blogId,
      authorId: input.authorId,
      authorName: input.authorName,
      language: input.language,
      domain: input.domain,
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
}): Promise<PublishResult> {
  const user = await requireUser()

  const connection = await connectionFor(user.id, "hubspot")
  if (!connection) {
    return { error: "Connect HubSpot in Settings before publishing." }
  }

  const blogId = connection.meta?.blogId
  if (!blogId) {
    return {
      error: "The HubSpot connection has no blog set. Reconnect and pick one.",
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
    const post = await publishBlogPost(connection.accessToken, {
      hubspotPostId: existing?.hubspotPostId ?? null,
      blogId,
      name: title,
      slug: (input.slug || slugify(title)).replace(/^\/+/, ""),
      // HubSpot stores rendered HTML, not Markdown.
      postBody: markdownToHtml(input.body),
      metaDescription:
        input.metaDescription ?? input.insights?.metaDescription ?? undefined,
      authorId: input.authorId ?? connection.meta?.authorId,
    })

    const url =
      post.absoluteUrl ??
      post.url ??
      (connection.meta?.domain
        ? `${connection.meta.domain.replace(/\/+$/, "")}/${post.slug ?? slugify(title)}`
        : undefined)

    await setHubSpotPublication({
      userId: user.id,
      id: saved.id,
      hubspotPostId: post.id,
      hubspotUrl: url ?? null,
    })
  } catch (error) {
    if (error instanceof HubSpotError) {
      return {
        error: `${error.message}${error.detail ? ` — ${error.detail}` : ""}`,
      }
    }
    throw error
  }

  revalidatePath("/blogger")
  redirect(`/blogger?posted=${encodeURIComponent(saved.id)}`)
}

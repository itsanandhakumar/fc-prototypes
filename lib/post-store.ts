import "server-only"

import { and, desc, eq } from "drizzle-orm"

import type { BlogPost, PostStatus } from "@/lib/blog-data"
import { db } from "@/lib/db"
import {
  posts,
  type PostRow,
  type StoredBrief,
  type StoredInsights,
} from "@/lib/db/schema"

// Every function here takes a `userId` and every query filters on it. That is
// the whole authorisation model for posts: there is no path to a row that does
// not go through the owner's id, so a guessed post id returns nothing rather
// than someone else's draft.

const MS_PER_MINUTE = 60_000

function toBlogPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    status: row.status === "published" ? "Published" : "Draft",
    // Negative would mean a row stamped in the future by clock skew between
    // the app and TiDB; clamping keeps "Just now" from becoming "-2m ago".
    updatedMinutesAgo: Math.max(
      0,
      Math.round((Date.now() - row.updatedAt.getTime()) / MS_PER_MINUTE)
    ),
    body: row.body,
    brief: row.brief ?? undefined,
    insights: row.insights ?? undefined,
    hubspotPostId: row.hubspotPostId ?? undefined,
    hubspotUrl: row.hubspotUrl ?? undefined,
  }
}

export async function getPosts(userId: string): Promise<BlogPost[]> {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.updatedAt))

  return rows.map(toBlogPost)
}

/** An absent or unknown id means a new, blank post. */
export async function getPost(
  userId: string,
  id: string | undefined
): Promise<BlogPost | undefined> {
  if (!id) {
    return undefined
  }

  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, userId)))
    .limit(1)

  return row ? toBlogPost(row) : undefined
}

// Only ever used to make way for a replacement draft, so a published post is
// never removed — the writer would have no way to get it back.
export async function deleteDraft(
  userId: string,
  id: string
): Promise<boolean> {
  const [row] = await db
    .select({ status: posts.status })
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, userId)))
    .limit(1)

  if (!row || row.status !== "draft") {
    return false
  }

  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)))
  return true
}

type SaveInput = {
  userId: string
  id?: string
  title: string
  body: string
  status: PostStatus
  brief?: StoredBrief
  insights?: StoredInsights
}

// One upsert for both Save and Publish — they differ only in the status they
// write. An id that is absent, unknown, or owned by someone else falls through
// to an insert, so a save can never overwrite another account's post.
export async function savePost({
  userId,
  id,
  title,
  body,
  status,
  brief,
  insights,
}: SaveInput): Promise<BlogPost> {
  const dbStatus = status === "Published" ? "published" : "draft"
  const existing = id ? await getPost(userId, id) : undefined

  if (existing) {
    await db
      .update(posts)
      .set({
        title,
        body,
        status: dbStatus,
        // A save that carries no fresh analysis leaves the stored one alone
        // rather than blanking the panel.
        ...(brief ? { brief } : {}),
        ...(insights ? { insights } : {}),
      })
      .where(and(eq(posts.id, existing.id), eq(posts.userId, userId)))

    const saved = await getPost(userId, existing.id)
    if (!saved) {
      throw new Error(`Post ${existing.id} vanished during save.`)
    }
    return saved
  }

  const newId = crypto.randomUUID()
  await db.insert(posts).values({
    id: newId,
    userId,
    title,
    body,
    status: dbStatus,
    brief: brief ?? null,
    insights: insights ?? null,
  })

  const created = await getPost(userId, newId)
  if (!created) {
    throw new Error("Insert succeeded but the post could not be read back.")
  }
  return created
}

/** Records where a post ended up on HubSpot, and marks it Published.
    Separate from `savePost` because it runs after the API call succeeded — the
    post is saved first, so a HubSpot failure never costs the writer the draft. */
export async function setHubSpotPublication({
  userId,
  id,
  hubspotPostId,
  hubspotUrl,
}: {
  userId: string
  id: string
  hubspotPostId: string
  hubspotUrl: string | null
}): Promise<void> {
  await db
    .update(posts)
    .set({ status: "published", hubspotPostId, hubspotUrl })
    .where(and(eq(posts.id, id), eq(posts.userId, userId)))
}

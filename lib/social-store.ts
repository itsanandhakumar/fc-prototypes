import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  socialPosts as socialPostsTable,
  socialVariants as socialVariantsTable,
  type SocialPostRow,
  type SocialVariantRow,
} from "@/lib/db/schema"
import type { SocialPost, SocialVariant } from "@/lib/social-data"

// Social posts in TiDB, scoped by `userId` the same way blog posts are.
//
// The prototype kept minutes-from-now offsets so it never needed a clock. That
// cannot survive a restart and cannot be queried — a scheduler asking "what is
// due?" needs a real instant — so the column is a timestamp and the offset is
// computed on the way out, which is also what keeps the server and client from
// rendering different relative times.

const MS_PER_MINUTE = 60_000

function minutesSince(at: Date, now: number): number {
  return Math.max(0, Math.round((now - at.getTime()) / MS_PER_MINUTE))
}

function minutesUntil(at: Date, now: number): number {
  return Math.max(0, Math.round((at.getTime() - now) / MS_PER_MINUTE))
}

function toSocialPost(
  row: SocialPostRow,
  variants: SocialVariantRow[],
  now: number
): SocialPost {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    updatedMinutesAgo: minutesSince(row.updatedAt, now),
    scheduledInMinutes: row.scheduledAt
      ? minutesUntil(row.scheduledAt, now)
      : undefined,
    variants: variants.map(
      (variant): SocialVariant => ({
        platformId: variant.platformId,
        text: variant.text,
        metrics: variant.metrics ?? undefined,
        failure: variant.failure ?? undefined,
      })
    ),
  }
}

async function variantsFor(postIds: string[]): Promise<Map<string, SocialVariantRow[]>> {
  const grouped = new Map<string, SocialVariantRow[]>()
  if (!postIds.length) {
    return grouped
  }

  const rows = await db
    .select()
    .from(socialVariantsTable)
    .where(inArray(socialVariantsTable.socialPostId, postIds))

  for (const row of rows) {
    const list = grouped.get(row.socialPostId) ?? []
    list.push(row)
    grouped.set(row.socialPostId, list)
  }
  return grouped
}

export async function getSocialPosts(userId: string): Promise<SocialPost[]> {
  const rows = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.userId, userId))
    .orderBy(desc(socialPostsTable.updatedAt))

  // One query for every variant rather than one per post: a workspace with
  // eighty posts would otherwise make eighty round trips to TiDB.
  const grouped = await variantsFor(rows.map((row) => row.id))
  const now = Date.now()

  return rows.map((row) => toSocialPost(row, grouped.get(row.id) ?? [], now))
}

export async function getSocialPost(
  userId: string,
  id: string | undefined
): Promise<SocialPost | undefined> {
  if (!id) {
    return undefined
  }

  const [row] = await db
    .select()
    .from(socialPostsTable)
    .where(and(eq(socialPostsTable.id, id), eq(socialPostsTable.userId, userId)))
    .limit(1)

  if (!row) {
    return undefined
  }

  const grouped = await variantsFor([row.id])
  return toSocialPost(row, grouped.get(row.id) ?? [], Date.now())
}

/** What every write has in common: the post, its copy, and where it goes. What
    differs is the state it lands in, which is the argument. */
export type Write = {
  userId: string
  id?: string
  name: string
  variants: Array<Pick<SocialVariant, "platformId" | "text">>
  /** The blog post it was written from, when it came from one. */
  sourcePostId?: string
}

async function upsert(
  write: Write,
  state: {
    status: SocialPost["status"]
    scheduledAt?: Date | null
    /** Why a platform turned it down, by platform id. */
    failures?: Record<string, string>
    /** Where it landed, by platform id. */
    permalinks?: Record<string, string>
  }
): Promise<SocialPost> {
  const existing = write.id
    ? await getSocialPost(write.userId, write.id)
    : undefined

  const id = existing?.id ?? crypto.randomUUID()

  if (existing) {
    await db
      .update(socialPostsTable)
      .set({
        name: write.name,
        status: state.status,
        scheduledAt: state.scheduledAt ?? null,
      })
      .where(
        and(
          eq(socialPostsTable.id, id),
          eq(socialPostsTable.userId, write.userId)
        )
      )

    // The variants are rewritten wholesale. Diffing them would be more code for
    // no benefit: the composer always sends the full set, and a variant's
    // identity is its platform rather than a row id.
    await db
      .delete(socialVariantsTable)
      .where(eq(socialVariantsTable.socialPostId, id))
  } else {
    await db.insert(socialPostsTable).values({
      id,
      userId: write.userId,
      name: write.name,
      status: state.status,
      scheduledAt: state.scheduledAt ?? null,
      sourcePostId: write.sourcePostId ?? null,
    })
  }

  if (write.variants.length) {
    await db.insert(socialVariantsTable).values(
      write.variants.map((variant) => ({
        socialPostId: id,
        platformId: variant.platformId,
        text: variant.text,
        failure: state.failures?.[variant.platformId] ?? null,
        permalink: state.permalinks?.[variant.platformId] ?? null,
        // Figures belong to a post that has been seen, and none of these have:
        // a post published a moment ago has no engagement yet, and one
        // rewritten since it was published is not the post those numbers were
        // measuring. Both start empty and earn their numbers again.
        metrics: null,
      }))
    )
  }

  const saved = await getSocialPost(write.userId, id)
  if (!saved) {
    throw new Error(`Social post ${id} vanished during save.`)
  }
  return saved
}

/**
 * Saving always stores a draft.
 *
 * That includes a post that was scheduled: taking it back to a draft takes it
 * out of the queue, which is the only sense "save" can have for something with
 * a departure time on it.
 */
export async function saveDraft(write: Write): Promise<SocialPost> {
  return upsert(write, { status: "Draft", scheduledAt: null })
}

/** Queued, to go out at `at`. */
export async function schedulePost(
  write: Write & { at: Date }
): Promise<SocialPost> {
  return upsert(write, { status: "Scheduled", scheduledAt: write.at })
}

/**
 * Out, on every platform that took it.
 *
 * Each network answers for itself, so the outcome is per platform rather than
 * per post: a post is Failed if any variant was turned down — the one thing
 * that needs attention is the thing the status should name — and Published only
 * when all of them went.
 */
export async function publishPost(
  write: Write & {
    failures?: Record<string, string>
    permalinks?: Record<string, string>
  }
): Promise<SocialPost> {
  const rejected = write.variants.some(
    (variant) => write.failures?.[variant.platformId]
  )

  return upsert(write, {
    status: rejected ? "Failed" : "Published",
    scheduledAt: null,
    failures: write.failures,
    permalinks: write.permalinks,
  })
}

/** Clears the failures on a rejected post and sends it again. */
export async function retrySocialPost(
  userId: string,
  id: string
): Promise<SocialPost | undefined> {
  const existing = await getSocialPost(userId, id)
  if (!existing || existing.status !== "Failed") {
    return undefined
  }

  return publishPost({
    userId,
    id,
    name: existing.name,
    variants: existing.variants.map(({ platformId, text }) => ({
      platformId,
      text,
    })),
  })
}

/**
 * Everything due to go out, across every account.
 *
 * This is the query the schedule column exists for, and the reason it is a
 * timestamp rather than an offset. Nothing calls it yet — sending needs
 * LinkedIn and X credentials — but it is what a worker or a cron route will
 * ask for.
 */
export async function dueSocialPosts(now = new Date()): Promise<SocialPostRow[]> {
  const rows = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.status, "Scheduled"))
    .orderBy(socialPostsTable.scheduledAt)

  return rows.filter((row) => row.scheduledAt && row.scheduledAt <= now)
}

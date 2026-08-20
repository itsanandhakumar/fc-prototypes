import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  connections,
  type ConnectionMeta,
  type ConnectionProvider,
  type ConnectionRow,
} from "@/lib/db/schema"

// Which destinations an account has linked, and the credentials for them.
//
// Nothing here is ever returned to the client. The token can publish to a live
// blog, so it stays on the server: pages ask `connectedProviders()` for the
// list of ids they should render as connected, and only server actions and
// route handlers reach for `connectionFor()`.

export async function connectionFor(
  userId: string,
  provider: ConnectionProvider
): Promise<ConnectionRow | undefined> {
  const [row] = await db
    .select()
    .from(connections)
    .where(
      and(eq(connections.userId, userId), eq(connections.provider, provider))
    )
    .limit(1)

  return row
}

/** Just the ids, for rendering. Safe to pass to a client component. */
export async function connectedProviders(userId: string): Promise<string[]> {
  const rows = await db
    .select({ provider: connections.provider })
    .from(connections)
    .where(eq(connections.userId, userId))

  return rows.map((row) => row.provider)
}

/** What Settings shows about a connection, without the token. */
export type ConnectionSummary = {
  provider: ConnectionProvider
  accountLabel: string | null
  meta: ConnectionMeta | null
}

export async function connectionSummaries(
  userId: string
): Promise<ConnectionSummary[]> {
  const rows = await db
    .select({
      provider: connections.provider,
      accountLabel: connections.accountLabel,
      meta: connections.meta,
    })
    .from(connections)
    .where(eq(connections.userId, userId))

  return rows
}

// Reconnecting replaces rather than accumulating: a second row for the same
// provider would make "which token do we publish with?" ambiguous.
export async function saveConnection(input: {
  userId: string
  provider: ConnectionProvider
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  accountLabel?: string | null
  meta?: ConnectionMeta | null
}): Promise<void> {
  const existing = await connectionFor(input.userId, input.provider)

  if (existing) {
    await db
      .update(connections)
      .set({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
        accountLabel: input.accountLabel ?? null,
        meta: input.meta ?? null,
      })
      .where(eq(connections.id, existing.id))
    return
  }

  await db.insert(connections).values({
    userId: input.userId,
    provider: input.provider,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    expiresAt: input.expiresAt ?? null,
    accountLabel: input.accountLabel ?? null,
    meta: input.meta ?? null,
  })
}

export async function removeConnection(
  userId: string,
  provider: ConnectionProvider
): Promise<void> {
  await db
    .delete(connections)
    .where(
      and(eq(connections.userId, userId), eq(connections.provider, provider))
    )
}

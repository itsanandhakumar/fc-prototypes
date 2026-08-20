// TiDB Cloud is MySQL-compatible, so the whole schema is `mysql-core`.
//
// No foreign-key constraints are declared. TiDB supports them, but they carry
// caveats on a serverless cluster and buy us nothing here — every read is
// already scoped by `userId` in the query layer. The columns that would have
// been keys are indexed instead, which is the part that actually matters for
// the reads this app makes.

import {
  index,
  int,
  json,
  mediumtext,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core"
import type { AdapterAccountType } from "next-auth/adapters"

// Auth.js owns the shape of the next four tables — the column names are the
// adapter's, not ours, which is why they are camelCase in the database too.
// `passwordHash` is the one addition: it is null for accounts that only ever
// sign in with Google.
export const users = mysqlTable("user", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", fsp: 3 }),
  image: varchar("image", { length: 512 }),
  /** bcrypt hash. Null when the account has no password — Google-only sign-in. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccountType>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    // Google's id_token is a JWT and comfortably exceeds varchar(255), so the
    // token columns are `text` rather than the adapter's default.
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    index("account_userId_idx").on(account.userId),
  ]
)

// Sessions are JWT-backed, so this table stays empty in normal operation. It
// exists because the adapter's types expect it, and because switching to
// database sessions later should not need a migration.
export const sessions = mysqlTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 255 }).primaryKey(),
    userId: varchar("userId", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [index("session_userId_idx").on(session.userId)]
)

export const verificationTokens = mysqlTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (token) => [primaryKey({ columns: [token.identifier, token.token] })]
)

export type PostStatus = "draft" | "published"

/** The instructions a draft was written from, kept with the post so the editor
    can always show how it was made. */
export type StoredBrief = {
  brief: string
  keywords: string[]
  targetCharacters: number
}

/** What the model reported about the draft, cached so the panel does not have
    to re-analyse on every page load. */
export type StoredInsights = {
  metaDescription: string
  aiCitable: string
  workingKeywords: string[]
  gapKeywords: string[]
  alternateTitles: string[]
  postIdeas: string[]
}

export const posts = mysqlTable(
  "post",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    // `text` caps at 64KB. A long-form post is nowhere near that, but MySQL
    // truncates rather than erroring when it overflows, and a silently
    // shortened post is the worst possible failure here — so the body takes
    // the next size up.
    body: mediumtext("body").notNull(),
    status: varchar("status", { length: 32 })
      .$type<PostStatus>()
      .notNull()
      .default("draft"),
    brief: json("brief").$type<StoredBrief>(),
    insights: json("insights").$type<StoredInsights>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (post) => [
    // The list query is always "this user's posts, newest first", so the index
    // carries the sort as well as the filter.
    index("post_user_updated_idx").on(post.userId, post.updatedAt),
  ]
)

export type UserRow = typeof users.$inferSelect
export type PostRow = typeof posts.$inferSelect
export type NewPostRow = typeof posts.$inferInsert

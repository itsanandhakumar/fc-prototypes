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

// ---------------------------------------------------------------------------
// Password resets
//
// Auth.js has `verificationToken`, but that table belongs to the adapter and is
// keyed by (identifier, token) for magic links. Password resets need their own
// lifecycle — single use, short expiry, and a record of having been spent — so
// they get their own table rather than sharing one whose shape we do not own.
// ---------------------------------------------------------------------------

export const passwordResetTokens = mysqlTable(
  "password_reset_token",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).notNull(),
    /** SHA-256 of the token that went out in the email, never the token itself.
        A leaked database then yields no usable reset links — the only copy of
        the real token is in the recipient's inbox. */
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    /** Set the moment it is spent. Kept rather than deleted so a second click
        can say "already used" instead of the same message a forged token
        gets. */
    usedAt: timestamp("usedAt", { mode: "date" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (token) => [
    // The only lookup is by hash, and it has to be fast enough that a wrong
    // token costs the same as a right one.
    index("reset_token_hash_idx").on(token.tokenHash),
    // For rate limiting: "has this account asked recently?"
    index("reset_user_created_idx").on(token.userId, token.createdAt),
  ]
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
    /** HubSpot's own id once the post has been published there, so a second
        publish updates the same post instead of creating a duplicate. */
    hubspotPostId: varchar("hubspotPostId", { length: 64 }),
    /** Where it actually lives, as HubSpot reported it. */
    hubspotUrl: varchar("hubspotUrl", { length: 1024 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (post) => [
    // The list query is always "this user's posts, newest first", so the index
    // carries the sort as well as the filter.
    index("post_user_updated_idx").on(post.userId, post.updatedAt),
  ]
)

// ---------------------------------------------------------------------------
// Connections
//
// One row per destination an account has linked. The token lives here rather
// than in a cookie: a cookie is readable by anything running in the browser and
// is capped at 4KB, and a HubSpot token is a credential that can publish to a
// customer's live blog.
// ---------------------------------------------------------------------------

export type ConnectionProvider = "hubspot" | "linkedin" | "x"

/** Everything a provider needs beyond the token. Shape varies per provider,
    which is why it is JSON rather than columns. */
export type ConnectionMeta = {
  /** HubSpot: the blog to publish into (`contentGroupId`). */
  blogId?: string
  /** HubSpot: who the post is filed under. */
  authorId?: string
  authorName?: string
  /** HubSpot: e.g. "en-us". Asked once at connect time. */
  language?: string
  /** Where published posts appear, for building a preview URL. */
  domain?: string
}

export const connections = mysqlTable(
  "connection",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 32 })
      .$type<ConnectionProvider>()
      .notNull(),
    /** The private-app token or OAuth access token. Never sent to the client:
        every read happens in a server action or route handler. */
    accessToken: text("accessToken").notNull(),
    /** OAuth providers only. Null for a HubSpot private app, whose token does
        not expire. */
    refreshToken: text("refreshToken"),
    expiresAt: timestamp("expiresAt"),
    /** What to show in Settings — "Forward Marketing · Portal 24601". */
    accountLabel: varchar("accountLabel", { length: 255 }),
    meta: json("meta").$type<ConnectionMeta>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (connection) => [
    // One connection per provider per account — reconnecting replaces rather
    // than accumulating.
    index("connection_user_provider_idx").on(
      connection.userId,
      connection.provider
    ),
  ]
)

// ---------------------------------------------------------------------------
// Social posts
//
// A post is one idea; a variant is the copy that actually goes to one network.
// They are separate tables because each variant succeeds or fails on its own —
// LinkedIn can accept a post in the same breath X rejects it.
// ---------------------------------------------------------------------------

export type SocialPostStatus = "Draft" | "Scheduled" | "Published" | "Failed"

export type VariantMetrics = {
  impressions: number
  likes: number
  comments: number
  reposts: number
}

export const socialPosts = mysqlTable(
  "social_post",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).notNull(),
    /** An internal label. Never posted — X has no title field. */
    name: varchar("name", { length: 512 }).notNull(),
    status: varchar("status", { length: 32 })
      .$type<SocialPostStatus>()
      .notNull()
      .default("Draft"),
    /** A real instant, not an offset. The prototype stored minutes-from-now,
        which cannot survive a restart and cannot be queried by a worker. */
    scheduledAt: timestamp("scheduledAt"),
    /** The blog post this was written from, when it came from one. */
    sourcePostId: varchar("sourcePostId", { length: 255 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  (post) => [
    index("social_user_updated_idx").on(post.userId, post.updatedAt),
    // The scheduler's query is "anything due, across all accounts", so its
    // index leads with the time rather than the owner.
    index("social_due_idx").on(post.status, post.scheduledAt),
  ]
)

export const socialVariants = mysqlTable(
  "social_variant",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    socialPostId: varchar("socialPostId", { length: 255 }).notNull(),
    platformId: varchar("platformId", { length: 32 }).notNull(),
    text: text("text").notNull(),
    /** Set once the network has accepted it. */
    permalink: varchar("permalink", { length: 1024 }),
    remoteId: varchar("remoteId", { length: 255 }),
    /** Why this platform rejected it. One variant can fail while its siblings
        go out fine, which is why this sits here rather than on the post. */
    failure: text("failure"),
    metrics: json("metrics").$type<VariantMetrics>(),
    metricsCheckedAt: timestamp("metricsCheckedAt"),
  },
  (variant) => [index("variant_post_idx").on(variant.socialPostId)]
)

export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect
export type UserRow = typeof users.$inferSelect
export type PostRow = typeof posts.$inferSelect
export type NewPostRow = typeof posts.$inferInsert
export type ConnectionRow = typeof connections.$inferSelect
export type SocialPostRow = typeof socialPosts.$inferSelect
export type SocialVariantRow = typeof socialVariants.$inferSelect

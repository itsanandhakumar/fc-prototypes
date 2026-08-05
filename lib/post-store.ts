import { blogPosts, type BlogPost } from "@/lib/blog-data"
import { orderPlatformIds } from "@/lib/connectors"
import type { DraftBrief } from "@/lib/draft-generator"

// Prototype storage: in memory, seeded from the mock posts. Saves survive
// navigation but reset when the dev server restarts.
let posts: BlogPost[] = [...blogPosts]

export function getPosts(): BlogPost[] {
  return posts
}

// An absent or unknown id means a new, blank post.
export function getPost(id: string | undefined): BlogPost | undefined {
  if (!id) {
    return undefined
  }
  return posts.find((post) => post.id === id)
}

// Only ever used to make way for a replacement draft, so a published post is
// never removed — the writer would have no way to get it back.
export function deleteDraft(id: string): boolean {
  const existing = getPost(id)
  if (!existing || existing.status !== "Draft") {
    return false
  }

  posts = posts.filter((post) => post.id !== id)
  return true
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  return slug || "untitled-post"
}

function uniqueId(title: string): string {
  const base = slugify(title)
  let id = base
  let suffix = 2
  while (posts.some((post) => post.id === id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

// Publishing commits the current text and records where it went. Like saving,
// it upserts, so a draft that has never been saved can be posted directly.
export function publishPost({
  id,
  title,
  body,
  platforms,
  brief,
}: {
  id?: string
  title: string
  body: string
  platforms: string[]
  /** The brief the draft came from, kept with the post. */
  brief?: DraftBrief
}): BlogPost {
  const existing = getPost(id)

  const published: BlogPost = {
    id: existing?.id ?? uniqueId(title),
    title,
    body,
    status: "Published",
    updatedMinutesAgo: 0,
    publishedTo: orderPlatformIds([
      ...new Set([...(existing?.publishedTo ?? []), ...platforms]),
    ]),
    brief: brief ?? existing?.brief,
  }

  posts = [published, ...posts.filter((post) => post.id !== published.id)]

  return published
}

// Saving always stores a draft, freshly updated, at the top of the list.
export function saveDraft({
  id,
  title,
  body,
  brief,
}: {
  id?: string
  title: string
  body: string
  /** The brief the draft came from, kept with the post. */
  brief?: DraftBrief
}): BlogPost {
  const existing = getPost(id)

  const saved: BlogPost = {
    id: existing?.id ?? uniqueId(title),
    title,
    body,
    status: "Draft",
    updatedMinutesAgo: 0,
    brief: brief ?? existing?.brief,
  }

  posts = [saved, ...posts.filter((post) => post.id !== saved.id)]

  return saved
}

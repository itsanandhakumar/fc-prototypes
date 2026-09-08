import { blogPosts, type BlogPost } from "@/lib/blog-data"
import type { PublishSettings } from "@/lib/blog-publish"
import type { DraftBrief } from "@/lib/draft-generator"
import { slugify } from "@/lib/slug"

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

// Publishing commits the current text to the blog. Like saving, it upserts, so
// a draft that has never been saved can be published directly. Where it goes is
// not recorded: HubSpot is the only destination, so "Published" already says it.
export function publishPost({
  id,
  title,
  body,
  brief,
  publish,
}: {
  id?: string
  title: string
  body: string
  /** The brief the draft came from, kept with the post. */
  brief?: DraftBrief
  /** What the publish dialog was settled on, kept so the next publish of this
      post opens on the same answers. */
  publish?: PublishSettings
}): BlogPost {
  const existing = getPost(id)

  const published: BlogPost = {
    id: existing?.id ?? uniqueId(title),
    title,
    body,
    status: "Published",
    updatedMinutesAgo: 0,
    brief: brief ?? existing?.brief,
    publish: publish ?? existing?.publish,
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

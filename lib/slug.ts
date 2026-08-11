// Shared because two places need the same answer: the store, which uses it to
// mint a post id, and the publish dialog, which shows the writer the URL the
// post is about to live at. They would drift if each kept its own.
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  return slug || "untitled-post"
}

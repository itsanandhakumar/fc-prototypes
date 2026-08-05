// Preferences that outlive a page load. Stored in cookies so the server can
// apply them on the first render instead of flashing a default first.

export const BODY_VIEW_COOKIE = "forward_body_view"

export type BodyView = "markdown" | "preview"

export function parseBodyView(value: string | undefined): BodyView {
  return value === "preview" ? "preview" : "markdown"
}

export const BODY_VIEWS: Array<{ value: BodyView; label: string }> = [
  { value: "markdown", label: "Markdown" },
  { value: "preview", label: "Preview" },
]

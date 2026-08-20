import { Marked } from "marked"
import TurndownService from "turndown"

// Markdown is the post's canonical form: it is what the model writes, what is
// stored, and what Copy Markdown hands over. The rich-text view is a second
// representation of the same text, so both directions of the conversion have
// to be lossless for the subset the editor supports — otherwise a writer who
// toggles views twice loses formatting.
//
// The supported subset is deliberately narrow: headings, paragraphs, bold,
// italic, links, inline code, blockquotes, bulleted and numbered lists. Tiptap
// is configured to the same subset, so anything it cannot represent is not
// offered in the first place.

const marked = new Marked({
  // A single newline inside a paragraph is a wrap, not a line break — models
  // hard-wrap prose, and without this every wrapped line becomes a <br>.
  breaks: false,
  gfm: true,
})

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) {
    return ""
  }
  // `parse` is sync as configured (no async extensions), but its type is a
  // union — the cast is what tells TypeScript which branch this is.
  return marked.parse(markdown) as string
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    // ATX (`## Heading`) rather than setext, `-` bullets, and `**bold**` —
    // these have to match what the model emits, or a round trip through the
    // rich-text view would rewrite the whole document's punctuation and show
    // up as a spurious change.
    headingStyle: "atx",
    bulletListMarker: "-",
    strongDelimiter: "**",
    emDelimiter: "_",
    codeBlockStyle: "fenced",
    hr: "---",
  })

  // Tiptap emits an empty paragraph for a blank line. Turndown would render it
  // as a stray backslash, so it is dropped instead.
  service.addRule("emptyParagraph", {
    filter: (node) =>
      node.nodeName === "P" && !node.textContent?.trim() && !node.querySelector("img"),
    replacement: () => "",
  })

  return service
}

let turndown: TurndownService | undefined

// Turndown pads list markers to a fixed width — `-   item`, `1.  item` — which
// is valid Markdown but not what the model writes. Left alone, merely opening
// the rich-text view and switching back would rewrite every list in the
// document, which reads as an edit the writer did not make and trips the
// panel's "out of date" badge.
//
// Fenced code blocks are stepped over: a line inside one that happens to start
// with `- ` is content, not a list.
function normaliseListMarkers(markdown: string): string {
  return markdown
    .split(/(^```[\s\S]*?^```$)/m)
    .map((segment, index) =>
      // Odd indices are the captured fences themselves.
      index % 2 === 1
        ? segment
        : segment
            .replace(/^([ \t]*)([-*+]) {2,}/gm, "$1$2 ")
            .replace(/^([ \t]*)(\d+)\. {2,}/gm, "$1$2. ")
    )
    .join("")
}

export function htmlToMarkdown(html: string): string {
  turndown ??= createTurndown()
  return normaliseListMarkers(
    turndown
      .turndown(html)
      // Turndown separates blocks with two newlines but can leave three or more
      // where empty nodes were removed. Collapsing them keeps the Markdown view
      // from growing blank lines every time the writer switches back to it.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

/** Plain text, for the character count and for the plain-text clipboard flavour. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim()
}

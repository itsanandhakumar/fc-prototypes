import * as React from "react"

import { cn } from "@/lib/utils"

// Renders the block format the drafts are written in: headings, paragraphs,
// bulleted and numbered lists, and bold runs. Deliberately narrow — it covers
// what the editor produces rather than all of Markdown.

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+[.)]\s+(.*)$/

function parse(markdown: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") })
      paragraph = []
    }
  }

  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ...list })
      list = null
    }
  }

  const flush = () => {
    flushParagraph()
    flushList()
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      // A blank line ends a paragraph but not a list: items spaced out with
      // blank lines are one loose list, not several single-item ones.
      flushParagraph()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flush()
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      flushParagraph()
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flush()

  return blocks
}

// Bold is the only inline mark the drafts use.
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={key} className="font-medium text-foreground">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <React.Fragment key={key}>{part}</React.Fragment>
    })
}

export function MarkdownPreview({
  markdown,
  className,
  ref,
}: {
  markdown: string
  className?: string
  /** Held by the editor so Copy can read the rendered post off the DOM. */
  ref?: React.Ref<HTMLDivElement>
}) {
  const blocks = React.useMemo(() => parse(markdown), [markdown])

  if (!blocks.length) {
    return (
      <div ref={ref} className={className}>
        <p className="text-xs/relaxed text-muted-foreground">
          Nothing to preview yet.
        </p>
      </div>
    )
  }

  return (
    <div ref={ref} className={className}>
      <div className="flex max-w-2xl flex-col gap-3">
        {blocks.map((block, index) => {
          const key = `block-${index}`

          if (block.kind === "heading") {
            const Tag = (["h1", "h2", "h3"] as const)[block.level - 1]
            return (
              <Tag
                key={key}
                className={cn(
                  "font-heading font-medium",
                  // 18 / 16 / 14 against 14px body copy, off the rescaled steps.
                  block.level === 3
                    ? "mt-2 text-sm"
                    : "mt-4 text-base first:mt-0"
                )}
              >
                {inline(block.text, key)}
              </Tag>
            )
          }

          if (block.kind === "list") {
            const Tag = block.ordered ? "ol" : "ul"
            return (
              <Tag
                key={key}
                className={cn(
                  "flex flex-col gap-1.5 pl-4 text-xs/relaxed",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="pl-1">
                    {inline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </Tag>
            )
          }

          return (
            <p key={key} className="text-xs/relaxed">
              {inline(block.text, key)}
            </p>
          )
        })}
      </div>
    </div>
  )
}

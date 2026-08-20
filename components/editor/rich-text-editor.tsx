"use client"

import * as React from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown"
import { cn } from "@/lib/utils"

// The rendered view of the post, editable in place. Markdown remains the
// canonical form: this component takes Markdown in, converts once, and converts
// back on every change — so the two views of the body never diverge.

type ToolbarAction = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  run: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
  /** Shown in the tooltip, so the shortcut is discoverable without a menu. */
  shortcut?: string
}

const ACTIONS: ToolbarAction[][] = [
  [
    {
      id: "bold",
      label: "Bold",
      icon: Bold,
      shortcut: "⌘B",
      run: (editor) => editor.chain().focus().toggleBold().run(),
      isActive: (editor) => editor.isActive("bold"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: Italic,
      shortcut: "⌘I",
      run: (editor) => editor.chain().focus().toggleItalic().run(),
      isActive: (editor) => editor.isActive("italic"),
    },
    {
      id: "code",
      label: "Inline code",
      icon: Code,
      shortcut: "⌘E",
      run: (editor) => editor.chain().focus().toggleCode().run(),
      isActive: (editor) => editor.isActive("code"),
    },
  ],
  [
    // H1 is offered even though generated drafts start at H2: the title is
    // rendered separately, but a writer restructuring a post by hand may still
    // want a top-level heading inside the body.
    {
      id: "h1",
      label: "Heading 1",
      icon: Heading1,
      shortcut: "⌘⌥1",
      run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 1 }),
    },
    {
      id: "h2",
      label: "Heading 2",
      icon: Heading2,
      shortcut: "⌘⌥2",
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
    },
    {
      id: "h3",
      label: "Heading 3",
      icon: Heading3,
      shortcut: "⌘⌥3",
      run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
    },
  ],
  [
    {
      id: "bullet",
      label: "Bulleted list",
      icon: List,
      shortcut: "⌘⇧8",
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
      isActive: (editor) => editor.isActive("bulletList"),
    },
    {
      id: "ordered",
      label: "Numbered list",
      icon: ListOrdered,
      shortcut: "⌘⇧7",
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
      isActive: (editor) => editor.isActive("orderedList"),
    },
    {
      id: "quote",
      label: "Quote",
      icon: Quote,
      shortcut: "⌘⇧B",
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
      isActive: (editor) => editor.isActive("blockquote"),
    },
  ],
]

function ToolbarButton({
  action,
  editor,
}: {
  action: ToolbarAction
  editor: Editor
}) {
  const Icon = action.icon
  const active = action.isActive(editor)

  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      aria-label={action.label}
      aria-pressed={active}
      title={
        action.shortcut ? `${action.label} (${action.shortcut})` : action.label
      }
      // The editor loses focus the moment a toolbar button takes it, which
      // collapses the selection the button is meant to act on.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => action.run(editor)}
      className="size-7"
    >
      <Icon className="size-3.5" />
    </Button>
  )
}

export function RichTextEditor({
  markdown,
  onChange,
  className,
  editorRef,
}: {
  markdown: string
  onChange: (markdown: string) => void
  className?: string
  /** Held by the editor so Copy can read the rendered post off the DOM. */
  editorRef?: React.Ref<HTMLDivElement>
}) {
  // Every keystroke round-trips HTML -> Markdown and calls up to the parent,
  // which owns the body. Without this the parent's state would flow straight
  // back in as `markdown` and reset the cursor to the top of the document on
  // every character.
  const emitting = React.useRef(false)
  const latest = React.useRef(onChange)
  React.useEffect(() => {
    latest.current = onChange
  })

  const editor = useEditor({
    // Tiptap warns loudly without this: the server pass and the first client
    // pass must render the same thing, so it renders nothing until mounted.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Turndown has no Markdown for a hard break that survives a round trip
        // through the plain-text views, so the editor does not offer one.
        hardBreak: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
    ],
    content: markdownToHtml(markdown),
    editorProps: {
      attributes: {
        "aria-label": "Post body",
        // The prose styles go on the contenteditable element itself rather
        // than a wrapper: `EditorContent`'s div holds nothing but this node, so
        // block spacing set on the wrapper would have nothing to space out.
        class: "forward-prose max-w-2xl outline-none",
      },
    },
    onUpdate({ editor }) {
      emitting.current = true
      latest.current(htmlToMarkdown(editor.getHTML()))
      // Cleared after the parent's state has flowed back down, which is what
      // the sync effect below is guarding against.
      queueMicrotask(() => {
        emitting.current = false
      })
    },
  })

  // Markdown that changed somewhere else — a regenerate, an edit made in the
  // Markdown view, an alternate title applied — has to be pulled in. An edit
  // made *here* must not be, or the caret jumps.
  React.useEffect(() => {
    if (!editor || emitting.current) {
      return
    }
    if (htmlToMarkdown(editor.getHTML()) === markdown) {
      return
    }
    editor.commands.setContent(markdownToHtml(markdown), { emitUpdate: false })
  }, [editor, markdown])

  if (!editor) {
    // Matches the mounted height so the panel does not jump on hydration.
    return <div ref={editorRef} className={className} aria-busy="true" />
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-orientation="horizontal"
        className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
      >
        {ACTIONS.map((group, index) => (
          <React.Fragment key={index}>
            {index ? (
              <span
                aria-hidden="true"
                className="mx-1 h-4 w-px shrink-0 bg-border"
              />
            ) : null}
            {group.map((action) => (
              <ToolbarButton key={action.id} action={action} editor={editor} />
            ))}
          </React.Fragment>
        ))}

        <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Undo"
          title="Undo (⌘Z)"
          disabled={!editor.can().undo()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          className="size-7"
        >
          <Undo2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Redo"
          title="Redo (⌘⇧Z)"
          disabled={!editor.can().redo()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          className="size-7"
        >
          <Redo2 className="size-3.5" />
        </Button>
      </div>

      {/* The ref sits on the scroll container rather than the toolbar wrapper,
          so Copy reads the post and not the buttons above it. */}
      <div
        ref={editorRef}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

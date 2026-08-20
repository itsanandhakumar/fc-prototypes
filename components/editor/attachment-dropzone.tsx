"use client"

import * as React from "react"
import { FileText, Plus, X as XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AttachmentKind, AttachmentRule } from "@/lib/connectors"
import { cn } from "@/lib/utils"

/**
 * What the rules belong to. A platform satisfies this shape, and so does a
 * set of them taken together — one post going to several at once has to meet
 * all their rules, and there is no Platform to represent that (see
 * `sharedAttachmentRules` in lib/connectors.ts). Only the name and the rules
 * were ever read from it, so this is what it always needed to be.
 */
export type MediaDestination = { name: string; attachments: AttachmentRule[] }

export type Attachment = {
  id: string
  name: string
  kind: AttachmentKind
  /** Object URL, so the real file renders rather than its name. */
  url: string
}

function kindOf(file: File): AttachmentKind {
  if (file.type === "image/gif") {
    return "gif"
  }
  if (file.type.startsWith("image/")) {
    return "image"
  }
  if (file.type.startsWith("video/")) {
    return "video"
  }
  return "document"
}

export function AttachmentTile({
  attachment,
  className,
}: {
  attachment: Attachment
  className?: string
}) {
  if (attachment.kind === "video") {
    return (
      <video
        src={attachment.url}
        muted
        playsInline
        preload="metadata"
        className={cn("size-full object-cover", className)}
      />
    )
  }

  if (attachment.kind === "document") {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center gap-1 bg-muted p-2 text-center",
          className
        )}
      >
        <FileText className="size-4 text-muted-foreground" />
        <span className="line-clamp-2 text-xs break-all text-muted-foreground">
          {attachment.name}
        </span>
      </div>
    )
  }

  // An object URL, not a served asset, so next/image has nothing to optimise.
  return (
    <img
      src={attachment.url}
      alt={attachment.name}
      className={cn("size-full object-cover", className)}
    />
  )
}

export function AttachmentDropzone({
  destination,
  attachments,
  onChange,
}: {
  destination: MediaDestination
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const [dragging, setDragging] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  const accept = destination.attachments.map((rule) => rule.accept).join(",")
  const currentKind = attachments[0]?.kind
  const rule = currentKind
    ? destination.attachments.find((item) => item.kind === currentKind)
    : undefined
  const canAddMore = !rule || attachments.length < rule.max

  const summary = destination.attachments
    .map((item) =>
      item.max > 1 ? `${item.label} up to ${item.max}` : `${item.label} 1`
    )
    .join(" · ")

  function accept_files(files: FileList | null) {
    const incoming = Array.from(files ?? [])
    if (!incoming.length) {
      return
    }

    const kind = currentKind ?? kindOf(incoming[0])
    const matching = destination.attachments.find((item) => item.kind === kind)

    if (!matching) {
      setNotice(`${destination.name} does not take that kind of file.`)
      return
    }

    const usable = incoming.filter((file) => kindOf(file) === kind)
    if (usable.length !== incoming.length) {
      setNotice(`${destination.name} takes one kind of media per post.`)
    } else {
      setNotice(null)
    }

    const room = matching.max - attachments.length
    if (room <= 0) {
      setNotice(
        `${matching.label} is limited to ${matching.max} on ${destination.name}.`
      )
      return
    }

    const added = usable.slice(0, room).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      kind,
      url: URL.createObjectURL(file),
    }))

    if (usable.length > room) {
      setNotice(
        `${matching.label} is limited to ${matching.max} on ${destination.name}.`
      )
    }

    onChange([
      ...attachments,
      ...added.filter((item) => !attachments.some((a) => a.id === item.id)),
    ])
  }

  function remove(id: string) {
    // Taken off this list, not destroyed. The same file can be on more than
    // one list — a post that carried one set of media to every platform and
    // then split them apart holds the same attachment in each — and revoking
    // the object URL here would blank it everywhere else it is still shown.
    // The URLs go when the page does, which for a prototype holding a handful
    // of files is soon enough.
    setNotice(null)
    onChange(attachments.filter((item) => item.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          accept_files(event.dataTransfer.files)
        }}
        className={cn(
          "rounded-md border border-dashed border-input p-2 transition-colors",
          dragging && "border-ring bg-muted/60"
        )}
      >
        {attachments.length ? (
          <div className="grid max-h-32 grid-cols-4 gap-2 overflow-y-auto">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group/tile relative aspect-square overflow-hidden rounded-md border border-border"
              >
                <AttachmentTile attachment={attachment} />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label={`Remove ${attachment.name}`}
                  className="absolute top-1 right-1"
                  onClick={() => remove(attachment.id)}
                >
                  <XIcon />
                </Button>
              </div>
            ))}

            {canAddMore ? (
              /* A label opens the picker natively — no scripted click, which
                 the dialog's focus trap can swallow. */
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-xs text-muted-foreground transition-colors hover:bg-muted/60">
                <Plus className="size-4" />
                Add
                <input
                  type="file"
                  accept={accept}
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    accept_files(event.target.files)
                    event.target.value = ""
                  }}
                />
              </label>
            ) : null}
          </div>
        ) : (
          /* Kept to a couple of lines so it always sits above the fold — a
             dropzone nobody scrolls to is a dropzone nobody uses. */
          <label className="flex cursor-pointer flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-md px-3 py-3 text-center transition-colors hover:bg-muted/60">
            <Plus className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium">
              Drag and drop, or click to choose
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {summary}
            </span>
            <input
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={(event) => {
                accept_files(event.target.files)
                event.target.value = ""
              }}
            />
          </label>
        )}
      </div>

      {notice ? (
        <p className="text-xs text-destructive">{notice}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Files stay in the browser — nothing is uploaded to {destination.name}.
        </p>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { FileText, Plus, X as XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AttachmentKind, Platform } from "@/lib/connectors"
import { cn } from "@/lib/utils"

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
  platform,
  attachments,
  onChange,
}: {
  platform: Platform
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const [dragging, setDragging] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  const accept = platform.attachments.map((rule) => rule.accept).join(",")
  const currentKind = attachments[0]?.kind
  const rule = currentKind
    ? platform.attachments.find((item) => item.kind === currentKind)
    : undefined
  const canAddMore = !rule || attachments.length < rule.max

  const summary = platform.attachments
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
    const matching = platform.attachments.find((item) => item.kind === kind)

    if (!matching) {
      setNotice(`${platform.name} does not take that kind of file.`)
      return
    }

    const usable = incoming.filter((file) => kindOf(file) === kind)
    if (usable.length !== incoming.length) {
      setNotice(`${platform.name} takes one kind of media per post.`)
    } else {
      setNotice(null)
    }

    const room = matching.max - attachments.length
    if (room <= 0) {
      setNotice(
        `${matching.label} is limited to ${matching.max} on ${platform.name}.`
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
        `${matching.label} is limited to ${matching.max} on ${platform.name}.`
      )
    }

    onChange([
      ...attachments,
      ...added.filter((item) => !attachments.some((a) => a.id === item.id)),
    ])
  }

  function remove(id: string) {
    const going = attachments.find((item) => item.id === id)
    if (going) {
      URL.revokeObjectURL(going.url)
    }
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
          Files stay in the browser — nothing is uploaded to {platform.name}.
        </p>
      )}
    </div>
  )
}

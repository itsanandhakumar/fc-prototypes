"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIELD_CLASSNAME =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

// A way in, not a gate. The editor works perfectly well without ever opening
// this — most social posts are short enough to just type — so the brief lives
// behind a button rather than in front of the workspace.
export function GenerateDialog({
  onGenerate,
}: {
  /** Hands the brief back; the composer decides what to do with it. */
  onGenerate: (brief: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [brief, setBrief] = React.useState("")

  const ready = Boolean(brief.trim())

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) {
      return
    }
    onGenerate(brief.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Sparkles />
        Generate with AI
      </DialogTrigger>

      <DialogContent className="gap-1.5 sm:max-w-lg">
        <DialogHeader>
          {/* The title is the field's label, the way the brief dialog in
              Blogger does it. */}
          <DialogTitle>
            What should this post be about?{" "}
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">(required)</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Describe the post and it will be drafted for every platform you
            have selected.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={submit}>
          <textarea
            autoFocus
            rows={4}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="e.g. why most content calendars fail, aimed at solo founders"
            aria-label="What should this post be about?"
            className={`resize-none ${FIELD_CLASSNAME}`}
          />

          <Button type="submit" size="lg" className="h-10 w-full" disabled={!ready}>
            <Sparkles />
            Generate
          </Button>

          <p className="text-xs/relaxed text-muted-foreground">
            {ready
              ? "Drafts every platform you have selected. You can edit each one after."
              : "Add a brief to generate from."}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}

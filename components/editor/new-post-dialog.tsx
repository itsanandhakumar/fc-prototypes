"use client"

import { Plus } from "lucide-react"

import { NewPostForm } from "@/components/editor/new-post-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Writing a post starts with a brief, which opens over the workspace rather
// than on a route of its own — the list stays behind it, so starting one and
// changing your mind costs nothing.
export function NewPostDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <Plus />
        Write New Post
      </DialogTrigger>

      {/* Tighter than the dialog's usual gap: the title is the brief field's
          label, so it sits as close to it as the labels below do to theirs. */}
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-1.5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {/* The title is the brief's label, so what the brief needs is
              marked against it. */}
          <DialogTitle>
            What do you want to write about?{" "}
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">(required)</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Describe the post you want, list any keywords to cover, and pick a
            length.
          </DialogDescription>
        </DialogHeader>

        <NewPostForm />
      </DialogContent>
    </Dialog>
  )
}

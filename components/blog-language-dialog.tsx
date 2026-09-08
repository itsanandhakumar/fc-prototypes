"use client"

import * as React from "react"
import { Languages } from "lucide-react"

import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BLOG_LANGUAGES, DEFAULT_BLOG_LANGUAGE } from "@/lib/blog-language"
import type { BlogDestination } from "@/lib/connectors"

/** The dropdown's options, in the shape Base UI reads labels from. */
const LANGUAGE_ITEMS = BLOG_LANGUAGES.map((language) => ({
  label: language.name,
  value: language.code,
}))

// The one question connecting a blog cannot answer by itself. It is asked here
// rather than in Settings because this is the moment it matters — the blog is
// being attached, and everything published to it from now on is filed under
// this language. Asked once and never again: the answer outlives a disconnect,
// so reconnecting the same blog goes straight through.

export function BlogLanguageDialog({
  destination,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  /** The blog about to be connected, or null when nothing is being connected. */
  destination: BlogDestination | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (languageCode: string) => void
  pending: boolean
}) {
  const [language, setLanguage] = React.useState(DEFAULT_BLOG_LANGUAGE)

  if (!destination) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Small: one question, one control, one button. Anything wider would
          make a one-line decision look like a form. */}
      <DialogContent className="sm:max-w-sm">
        <div className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Choose your blog&rsquo;s language</DialogTitle>
            <DialogDescription>
              Posts published to {destination.name} are filed under one
              language. You are only asked this once.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
            <PlatformGlyph
              platformId={destination.id}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 truncate text-xs font-medium">
              {destination.account}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label id="blog-language-label">Language</Label>
            {/* `items` is what lets the closed trigger read "English (United
                States)" rather than the tag it stores. */}
            <Select
              items={LANGUAGE_ITEMS}
              value={language}
              // Never null in practice: the dropdown is not clearable, and it
              // opens on a real value rather than a placeholder.
              onValueChange={(value) => setLanguage(value ?? language)}
            >
              <SelectTrigger
                aria-labelledby="blog-language-label"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOG_LANGUAGES.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {/* Wearing the destination's colour, like every other control that
                hands something over to it. */}
            <Button
              type="button"
              size="lg"
              className={destination.button}
              disabled={pending}
              onClick={() => onConfirm(language)}
            >
              <Languages />
              {pending ? "Connecting…" : `Connect ${destination.name}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

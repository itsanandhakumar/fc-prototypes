"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { generateFromPrompt } from "@/app/editor-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CHARACTER_STOPS, DEFAULT_CHARACTERS } from "@/lib/draft-generator"

const FIELD_CLASSNAME =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs/relaxed text-muted-foreground">{children}</p>
}

export function NewPostForm() {
  const [brief, setBrief] = React.useState("")
  const [keywords, setKeywords] = React.useState("")
  // The slider moves between stops, not raw words, so the intervals can widen.
  const [stopIndex, setStopIndex] = React.useState(
    CHARACTER_STOPS.findIndex((stop) => stop.value === DEFAULT_CHARACTERS)
  )
  const stop = CHARACTER_STOPS[stopIndex]

  const ready = Boolean(brief.trim())

  return (
    <form action={generateFromPrompt} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        {/* The card title is this field's label, so it carries no second one. */}
        <textarea
          id="prompt"
          name="prompt"
          aria-label="What do you want to write about?"
          required
          rows={5}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="e.g. How internal linking affects rankings. Aimed at in-house SEOs who have already fixed the obvious things. Argue that anchor text matters more than link count."
          className={`resize-none ${FIELD_CLASSNAME}`}
        />
      </div>

      <div className="grid gap-1.5">
        {/* Unmarked, which is what the asterisk on the brief above makes
            mean optional. */}
        <Label htmlFor="keywords">Keywords to cover</Label>
        <Input
          id="keywords"
          name="keywords"
          autoComplete="off"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="anchor text, orphan pages, crawl depth"
        />
        <Hint>Separate with commas — each one gets its own section.</Hint>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <Label htmlFor="chars">Length</Label>
          <span className="text-xs/relaxed text-muted-foreground tabular-nums">
            ≈ {stop.label} characters
          </span>
        </div>

        <input type="hidden" name="chars" value={stop.value} />
        <input
          id="chars"
          type="range"
          min={0}
          max={CHARACTER_STOPS.length - 1}
          step={1}
          value={stopIndex}
          aria-valuetext={`${stop.label} characters`}
          onChange={(event) => setStopIndex(Number(event.target.value))}
          className="w-full accent-foreground"
        />

        <div className="flex justify-between text-xs/relaxed text-muted-foreground tabular-nums">
          <span>{CHARACTER_STOPS[0].label}</span>
          <span>{CHARACTER_STOPS[CHARACTER_STOPS.length - 1].label}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Taller than a stock lg button: it is the one action on the screen,
            and a full-width bar at button height reads as a strip rather than
            as something to press. */}
        <Button
          type="submit"
          size="lg"
          className="h-10 w-full"
          disabled={!ready}
        >
          <Sparkles />
          Generate
        </Button>
        {ready ? null : <Hint>Add a brief to generate from.</Hint>}
      </div>
    </form>
  )
}

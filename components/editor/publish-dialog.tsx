"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ImageUp,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { publishToHubSpot } from "@/app/connector-actions"
import { ConnectorList } from "@/components/connector-list"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  defaultPublishSettings,
  describeFeaturedImage,
  FEATURED_IMAGE_HEIGHT,
  FEATURED_IMAGE_WIDTH,
  GENERATED_IMAGE_NAME,
  MAX_TAGS,
  META_DESCRIPTION_LIMIT,
  normalizeSlug,
  type PublishSettings,
} from "@/lib/blog-publish"
import { HUBSPOT } from "@/lib/connectors"
import type { DraftBrief } from "@/lib/draft-generator"
import { cn } from "@/lib/utils"

/** What an audit finding asks for, as the editor receives it. */
type AuditNote = {
  action: string
  reason: string
  /** Which of the finding's posts this is, when it covers several. */
  step?: { at: number; of: number }
  /** The next one, so the whole finding can be cleared without going back. */
  next?: { title: string; href: string }
}

// Publishing a blog post is a confirmation, not a composition: the text going
// out is the post already on screen. What is left are the things the blog knows
// rather than the draft — where it lives, who signed it, what it is filed under
// — and this is where they are settled. Every field opens filled in, so the
// writer is checking answers rather than supplying them, and can publish
// without touching any of them. Writing a post *about* the post — shorter, per
// network — is Social Studio's job, not this one's.

/**
 * Taller than the app's default control. This dialog is a form read from top
 * to bottom rather than a toolbar scanned across, so its boxes are given room
 * to breathe; kept as one value so every field in here shares a height.
 */
const FIELD_BOX = "h-10 py-2"

// Label, control, and nothing else. Every field here opens on an answer the
// dialog worked out, so a line under each one explaining where that answer
// came from is a paragraph of reading between two boxes that need none.
function Field({
  label,
  htmlFor,
  /** Sits at the far end of the label's line, for a count or a limit. */
  note,
  children,
}: {
  label: string
  htmlFor?: string
  note?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {note}
      </div>
      {children}
    </div>
  )
}

/**
 * The address, in the three parts it is actually made of. The domain comes
 * from the connection and cannot be typed into; the two slugs can. They are
 * drawn as one control because that is what they are — reading the segments
 * left to right should read as the URL, not as three unrelated boxes.
 */
function AddressField({
  blogSlug,
  contentSlug,
  onChange,
}: {
  blogSlug: string
  contentSlug: string
  onChange: (next: { blogSlug?: string; contentSlug?: string }) => void
}) {
  const segment =
    "h-8 rounded-sm border-0 bg-transparent px-1 focus-visible:bg-input/40 focus-visible:ring-0 dark:bg-transparent"

  return (
    <div className="flex h-10 min-w-0 items-center gap-0.5 rounded-md border border-input bg-input/20 px-1.5 text-xs/relaxed focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30">
      <span className="shrink-0 text-muted-foreground">{HUBSPOT.domain}</span>
      <span className="shrink-0 text-muted-foreground">/</span>
      <Input
        aria-label="Blog slug"
        value={blogSlug}
        // Sized to its own text, so the separators stay tight against the
        // segment they follow and the row reads as one address rather than as
        // a box with a gap in it. The minimum keeps it grabbable when empty.
        className={cn(segment, "field-sizing-content w-auto min-w-6 shrink-0")}
        onChange={(event) =>
          onChange({ blogSlug: normalizeSlug(event.target.value) })
        }
      />
      <span className="shrink-0 text-muted-foreground">/</span>
      <Input
        aria-label="Content slug"
        value={contentSlug}
        className={cn(segment, "min-w-0 flex-1")}
        onChange={(event) =>
          onChange({ contentSlug: normalizeSlug(event.target.value) })
        }
      />
    </div>
  )
}

/** Tags as they are used: a set you add to and take from, not a text field. */
function TagsField({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = React.useState("")
  const full = tags.length >= MAX_TAGS

  function add() {
    const tag = draft.trim()
    // Silently ignoring a duplicate is right here: the tag the writer asked
    // for is already on the post, so the ask has been met.
    if (
      !tag ||
      full ||
      tags.some((item) => item.toLowerCase() === tag.toLowerCase())
    ) {
      setDraft("")
      return
    }
    onChange([...tags, tag])
    setDraft("")
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {tags.length ? (
        <ul className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  className="flex size-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                  onClick={() => onChange(tags.filter((item) => item !== tag))}
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Input
          aria-label="Add a tag"
          className={FIELD_BOX}
          value={draft}
          disabled={full}
          placeholder={full ? `${MAX_TAGS} tags is the most` : "Add a tag"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter would otherwise reach the editor's form and save the
            // draft out from under the dialog.
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              add()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={full || !draft.trim()}
          onClick={add}
        >
          <Plus />
          Add
        </Button>
      </div>
    </div>
  )
}

/**
 * The card the post leads with. Generated from the title by default — the same
 * treatment the social previews give a share image — so there is always one,
 * and replaceable with a real file.
 */
function FeaturedImageField({
  title,
  image,
  onChange,
}: {
  title: string
  image: PublishSettings["featuredImage"]
  onChange: (image: PublishSettings["featuredImage"]) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { size, offSize } = describeFeaturedImage(image)

  return (
    // Stacked rather than side by side: at 1.91:1 a card wide enough to read
    // as the image it stands for leaves no room for controls beside it, so
    // the width goes to the card and the controls go underneath. Held to
    // three quarters of the field so it reads as a preview of the image
    // rather than as the image itself, with the controls kept to the same
    // width so the two read as one block.
    <div className="flex w-3/4 min-w-0 flex-col gap-2">
      <div className="w-full overflow-hidden rounded-md border border-border">
        {image.source === "upload" && image.url ? (
          <img
            src={image.url}
            alt=""
            className="aspect-[1.91/1] w-full object-cover"
          />
        ) : (
          // The ratio has to be the whole story here, so the card is a box at
          // that ratio with its contents laid over the top. Left as a flex
          // column the text set its own height instead — three lines of
          // headline made the card taller than 1.91:1 and it came out nearly
          // square. Absolutely positioned contents cannot push on the box.
          //
          // HubSpot's own colours, like every other control here that stands
          // for the thing the post is going to.
          <div
            className="relative aspect-[1.91/1] w-full overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(135deg, ${HUBSPOT.accent} 0%, ${HUBSPOT.accentTo} 100%)`,
            }}
          >
            <div className="absolute inset-0 flex flex-col justify-between p-3">
              {/* The dialog's line-height is inherited as a length, which on
                  type this small is most of the card's height. */}
              <span className="text-[0.65rem] leading-none font-semibold tracking-[0.2em] text-white/70 uppercase">
                {HUBSPOT.domain}
              </span>
              <span className="line-clamp-3 text-sm/snug font-semibold text-white">
                {title}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="min-w-0 text-xs break-all text-muted-foreground">
            {image.name}
          </span>
          {/* The size is worth stating rather than assuming: a link preview is
              cropped to it wherever the post gets shared, and an upload that
              misses it is the one thing about this field worth noticing. */}
          <span
            className={cn(
              "text-xs tabular-nums",
              offSize ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {size}
            {offSize
              ? ` · wants ${FEATURED_IMAGE_WIDTH.toLocaleString()} × ${FEATURED_IMAGE_HEIGHT.toLocaleString()}`
              : null}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp />
            Replace
          </Button>

          {image.source === "upload" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // The object URL is this page's to release.
                if (image.url) {
                  URL.revokeObjectURL(image.url)
                }
                onChange({
                  source: "generated",
                  name: GENERATED_IMAGE_NAME,
                })
              }}
            >
              <RotateCcw />
              Use generated
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) {
              return
            }
            if (image.url) {
              URL.revokeObjectURL(image.url)
            }
            const url = URL.createObjectURL(file)
            onChange({ source: "upload", name: file.name, url })

            // Measured off the decoded file rather than trusted: the only way
            // to know what was actually picked. It lands a moment after the
            // image itself, which is why it is a second update rather than
            // part of the first.
            const probe = new window.Image()
            probe.onload = () =>
              onChange({
                source: "upload",
                name: file.name,
                url,
                width: probe.naturalWidth,
                height: probe.naturalHeight,
              })
            probe.src = url
            // So choosing the same file twice in a row still fires.
            event.target.value = ""
          }}
        />
      </div>
    </div>
  )
}

/**
 * Mounted only while the dialog is open, which is what makes every field open
 * on the draft as it stands right now rather than on the draft as it was when
 * the editor first rendered.
 */
function PublishForm({
  postId,
  body,
  brief,
  title,
  language,
  authors,
  defaultAuthor,
  suggestedTags,
  suggestedMetaDescription,
  stored,
  fixField,
  fixNote,
  fixRef,
  onCancel,
}: {
  postId: string
  body: string
  brief: DraftBrief
  title: string
  language: string
  authors: string[]
  defaultAuthor: string
  suggestedTags: string[]
  suggestedMetaDescription: string
  stored?: PublishSettings
  fixField?: "meta" | "image" | "tags" | "body"
  fixNote?: AuditNote
  /** Set on the block the audit pointed at, so the dialog can focus into it. */
  fixRef: React.RefObject<HTMLDivElement | null>
  onCancel: () => void
}) {
  const [settings, setSettings] = React.useState<PublishSettings>(() =>
    defaultPublishSettings({
      title,
      language,
      author: defaultAuthor,
      suggestedTags,
      suggestedMetaDescription,
      stored,
    })
  )
  const [publishing, startPublishing] = React.useTransition()

  /**
   * The highlight fades on the first interaction anywhere in the dialog. It is
   * there to answer "which one did you mean?", and once the writer is looking
   * at it the ring is just a decoration around a field they are trying to use.
   */
  const [highlight, setHighlight] = React.useState(
    fixField === "body" ? undefined : fixField
  )

  // Listened for on the document rather than on the dialog: the dialog is
  // portalled outside the React root, so a React handler inside it never sees
  // these — the event has no path back to where React is listening.
  React.useEffect(() => {
    if (!highlight) {
      return
    }
    const clear = () => setHighlight(undefined)
    document.addEventListener("pointerdown", clear)
    document.addEventListener("keydown", clear)
    return () => {
      document.removeEventListener("pointerdown", clear)
      document.removeEventListener("keydown", clear)
    }
  }, [highlight])

  React.useEffect(() => {
    if (!fixField) {
      return
    }
    // After the dialog has been laid out, or it scrolls to the wrong place.
    const timer = setTimeout(() => {
      fixRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
      fixRef.current
        ?.querySelector("input,textarea")
        ?.dispatchEvent(new Event("focus"))
    }, 120)
    return () => clearTimeout(timer)
  }, [fixField, fixRef])

  /**
   * The block gets a wash so the instruction and the field read as one thing;
   * the control inside it gets the ring, because that is the part being asked
   * for. A box drawn round the whole group says "somewhere in here".
   */
  const ring = (field: "meta" | "image" | "tags") =>
    highlight === field
      ? cn(
          "-mx-2 rounded-md bg-primary/8 px-2 py-2",
          "[&_textarea]:ring-2 [&_textarea]:ring-primary/70",
          "[&_input]:ring-2 [&_input]:ring-primary/70",
          "[&_[data-slot=card]]:ring-2 [&_[data-slot=card]]:ring-primary/70"
        )
      : undefined

  /**
   * What the audit wants done, above the field it wants done to.
   *
   * A ring alone answers "which one" and leaves the reader to remember why
   * they clicked. The job's title is the instruction; the finding's own words
   * are the reason, which is what makes it worth doing rather than a chore.
   */
  const auditNote = (field: "meta" | "image" | "tags") =>
    highlight === field && fixNote ? (
      <div className="mb-2 flex gap-2 rounded-md bg-primary/10 px-2.5 py-2">
        <Sparkles
          className="mt-0.5 size-3.5 shrink-0 text-primary"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xs font-medium">{fixNote.action}</span>
            {fixNote.step ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                Post {fixNote.step.at} of {fixNote.step.of}
              </span>
            ) : null}
          </span>

          <span className="text-xs/relaxed text-muted-foreground">
            {fixNote.reason}
          </span>

          {/* Why the field is not empty. The editor drafts one from the post's
              opening, so a writer sent here to add a missing description
              arrives to find text already in the box and reasonably wonders
              what the audit was talking about. It is a suggestion; nothing is
              saved against the post until it is published. */}
          {fixField === "meta" && !stored?.metaDescription ? (
            <span className="text-xs/relaxed text-muted-foreground">
              The box below is a draft written from this post&rsquo;s opening.
              Keep it or change it — nothing is saved until you publish.
            </span>
          ) : null}

          {/* The way through the rest of the set. Without it a finding about
              three posts means going back to the audit twice. */}
          {fixNote.next ? (
            <Link
              href={fixNote.next.href}
              className="mt-0.5 flex min-w-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              <span className="min-w-0 truncate">
                Next: {fixNote.next.title}
              </span>
              <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    ) : null

  function update(patch: Partial<PublishSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  // Roughly what the reader is in for. The store counts nothing, so this is
  // the only place either figure is worked out.
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / 220))

  // Past the limit the tail of the description stops being shown, which is
  // worth flagging but not worth blocking — see META_DESCRIPTION_LIMIT.
  const over = settings.metaDescription.length > META_DESCRIPTION_LIMIT

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-0">
      <DialogHeader className="shrink-0 pr-8">
        <DialogTitle>Publish to {HUBSPOT.name}</DialogTitle>
        <DialogDescription>
          Filled in from the draft. Change what you need to.
        </DialogDescription>
      </DialogHeader>

      {/* The dialog's height is capped, so the fields take the slack and
          scroll while the header and the actions stay put. */}
      <div className="-mx-1 my-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
          <PlatformGlyph
            platformId={HUBSPOT.id}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 truncate text-xs font-medium">
            {HUBSPOT.account}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {words.toLocaleString()} words · {minutes} min read
          </span>
        </div>

        <Field label="Blog title" htmlFor="publish-title">
          <Input
            id="publish-title"
            className={FIELD_BOX}
            value={settings.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>

        <Field label="Blog URL">
          <AddressField
            blogSlug={settings.blogSlug}
            contentSlug={settings.contentSlug}
            onChange={update}
          />
        </Field>

        <Field label="Author">
          <Select
            items={authors.map((name) => ({ label: name, value: name }))}
            value={settings.author}
            onValueChange={(value) =>
              update({ author: value ?? settings.author })
            }
          >
            <SelectTrigger
              aria-label="Author"
              className="w-full py-2.5 data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {authors.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div
          ref={highlight === "tags" ? fixRef : undefined}
          className={ring("tags")}
        >
          {auditNote("tags")}
          <Field label="Tags">
            <TagsField
              tags={settings.tags}
              onChange={(tags) => update({ tags })}
            />
          </Field>
        </div>

        <div
          ref={highlight === "image" ? fixRef : undefined}
          className={ring("image")}
        >
          {auditNote("image")}
          <Field label="Featured image">
            <FeaturedImageField
              title={settings.title || "Untitled post"}
              image={settings.featuredImage}
              onChange={(featuredImage) => update({ featuredImage })}
            />
          </Field>
        </div>

        {/* Last, after the fields that decide where the post goes and how it
            is filed: this one is a sentence to write rather than a value to
            check, so it does not sit between two things being glanced at. */}
        <div
          ref={highlight === "meta" ? fixRef : undefined}
          className={ring("meta")}
        >
          {auditNote("meta")}
          <Field
            label="Meta description"
            htmlFor="publish-meta-description"
            note={
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  over ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {settings.metaDescription.length}/{META_DESCRIPTION_LIMIT}
              </span>
            }
          >
            <Textarea
              id="publish-meta-description"
              className="py-3"
              rows={3}
              value={settings.metaDescription}
              aria-invalid={over || undefined}
              placeholder="What a search result should say under the title."
              onChange={(event) =>
                update({ metaDescription: event.target.value })
              }
            />
          </Field>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">
          A mock-up. Nothing is sent.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            className={HUBSPOT.button}
            disabled={publishing}
            onClick={() =>
              startPublishing(async () =>
                publishToHubSpot({
                  postId,
                  title: settings.title,
                  body,
                  brief,
                  publish: settings,
                })
              )
            }
          >
            <Send />
            {publishing ? "Publishing…" : `Publish to ${HUBSPOT.name}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PublishDialog({
  postId,
  title,
  body,
  brief,
  connected,
  blogLanguage,
  authors,
  defaultAuthor,
  suggestedTags = [],
  suggestedMetaDescription = "",
  stored,
  fixField,
  fixNote,
  disabled,
}: {
  postId: string
  title: string
  body: string
  /** Stored with the post on publish, so the run survives publishing. */
  brief: DraftBrief
  /** Whether the HubSpot blog is connected. */
  connected: boolean
  /** The language the blog files its posts under, chosen when it was
      connected. Absent only on a blog connected before it was asked for. */
  blogLanguage?: string
  /** Who this workspace can publish as. */
  authors: string[]
  defaultAuthor: string
  /** Working keywords from the draft's analysis, which become its tags. */
  suggestedTags?: string[]
  /** The description the analysis drew from the draft's opening. */
  suggestedMetaDescription?: string
  /** What this post was published with last time, if it has been. */
  stored?: PublishSettings
  /**
   * A field an audit finding sent the writer here to change. The dialog opens
   * on it — arriving at the editor with the dialog shut would leave them to
   * find the field the finding already named.
   */
  fixField?: "meta" | "image" | "tags" | "body"
  /** What the audit wants done here, why, and how far through the set. */
  fixNote?: AuditNote
  disabled?: boolean
}) {
  // Opened even with no blog connected: the dialog then explains that
  // publishing needs one, which is a better answer to "fix this" than a link
  // that appears to do nothing at all. Not opened for a body fix, which is a
  // change to the writing and has nothing to do with publishing.
  const [open, setOpen] = React.useState(
    Boolean(fixField && fixField !== "body")
  )

  /**
   * The block the audit pointed at. The dialog focuses the control inside it
   * on open — otherwise it focuses the first field it finds, which is the
   * title, and someone sent here to change one particular thing arrives with
   * the cursor in a different one.
   */
  const fixRef = React.useRef<HTMLDivElement>(null)
  const focusTarget = React.useCallback(() => {
    const block = fixRef.current
    if (!block) {
      return null
    }
    // In preference order, not document order: a tags field's first button is
    // the ✕ that removes a tag, and landing on it invites the writer to delete
    // something rather than add one.
    return (
      block.querySelector<HTMLElement>("textarea, input:not([type=file])") ??
      block.querySelector<HTMLElement>("button")
    )
  }, [])

  return (
    <>
      {/* Wearing HubSpot's own colour and mark: the post leaves Forward here,
          and the button that hands it over says where it is going. */}
      <Button
        type="button"
        size="lg"
        className={HUBSPOT.button}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PlatformGlyph platformId={HUBSPOT.id} />
        Publish to {HUBSPOT.name}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[85vh] flex-col sm:max-w-lg"
          initialFocus={fixField ? () => focusTarget() : undefined}
        >
          {connected ? (
            <PublishForm
              postId={postId}
              body={body}
              brief={brief}
              title={title}
              language={blogLanguage ?? ""}
              authors={authors}
              defaultAuthor={defaultAuthor}
              suggestedTags={suggestedTags}
              suggestedMetaDescription={suggestedMetaDescription}
              stored={stored}
              fixField={fixField}
              fixNote={fixNote}
              fixRef={fixRef}
              onCancel={() => setOpen(false)}
            />
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Connect {HUBSPOT.name} to publish</DialogTitle>
                <DialogDescription>
                  Publishing needs a connected blog. Connections also live in
                  Settings.
                </DialogDescription>
              </DialogHeader>

              <ConnectorList
                connectedIds={[]}
                only="blog"
                blogLanguage={blogLanguage}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

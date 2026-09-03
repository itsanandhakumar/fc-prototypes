"use client"

import * as React from "react"
import { ImageUp, Loader2, Plus, Send, X } from "lucide-react"

import {
  hubspotPublishContext,
  publishToHubSpot,
  uploadHubSpotImage,
  type HubSpotPublishContext,
} from "@/app/connector-actions"
import { ConnectorList } from "@/components/connector-list"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
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
import { HUBSPOT } from "@/lib/connectors"
import type { StoredInsights } from "@/lib/db/schema"
import type { DraftBrief } from "@/lib/draft-generator"
import { slugify } from "@/lib/slug"

// What HubSpot needs to publish a post, asked once, filled in from the draft.
//
// This used to be a confirmation: three read-only lines and a button. That was
// honest about the one thing it could do and wrong about everything HubSpot
// actually requires — publishing a post needs a slug, an author, a meta
// description and a decision about the featured image, and a post that reaches
// the blog without them is one someone has to go and finish by hand in HubSpot.
// So the dialog fills all of it in from the draft and lets the writer change
// what they want, which is the same bargain HubSpot's own editor offers.
//
// The blog and the language are not here. They belong to the connection rather
// than to a post — HubSpot files a whole blog under one language — so they are
// asked once, at connect time, in Settings.

/** HubSpot truncates a meta description in search results around here. Over is
    allowed, because it is a recommendation rather than a limit, and a counter
    that turns red is a better teacher than a field that refuses to type. */
const META_DESCRIPTION_TARGET = 155

const FIELD =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

type Tag = { id?: string; name: string }

function Section({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint}
      </div>
      {children}
    </div>
  )
}

export function PublishDialog({
  postId,
  title,
  body,
  brief,
  insights,
  connected,
  needsSetup,
  disabled,
}: {
  postId: string
  title: string
  body: string
  /** Stored with the post on publish, so the run survives publishing. */
  brief: DraftBrief
  /** The panel's analysis, stored for the same reason. */
  insights?: StoredInsights
  /** Whether the HubSpot blog is connected. */
  connected: boolean
  /** Connected, but never pointed at a blog. */
  needsSetup?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [context, setContext] = React.useState<HubSpotPublishContext | null>(
    null
  )

  const [name, setName] = React.useState(title)
  const [slug, setSlug] = React.useState(() => slugify(title || "Untitled post"))
  // Until the writer touches it, the address follows the headline — which is
  // what they expect while they are still renaming a draft. One edit and it
  // stops, because a slug they chose is not a slug we may overwrite.
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [authorId, setAuthorId] = React.useState("")
  // Tags start as the draft's working keywords — the terms the analysis says
  // the post genuinely covers, which is the same question a tag answers. Gap
  // keywords are deliberately not here: they name what the draft does *not*
  // cover, and tagging a post with those would be a lie to the reader and to
  // search.
  const keywords = React.useMemo(
    () => insights?.workingKeywords ?? [],
    [insights]
  )
  const [tags, setTags] = React.useState<Tag[]>(() =>
    keywords.map((name) => ({ name }))
  )
  // Once the writer has had an opinion about the tags, the analysis stops
  // getting one.
  const [tagsTouched, setTagsTouched] = React.useState(false)
  const [tagDraft, setTagDraft] = React.useState("")
  const [metaDescription, setMetaDescription] = React.useState(
    insights?.metaDescription ?? ""
  )
  const [imageUrl, setImageUrl] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  // Everything HubSpot knows and we do not: the authors on the portal, the tags
  // it already has, and which blog the post is going to. Read when the dialog
  // opens rather than with the page, because most sessions never open it.
  React.useEffect(() => {
    if (!open || !connected || context) {
      return
    }
    let live = true
    void (async () => {
      const result = await hubspotPublishContext()
      if (!live) {
        return
      }
      setContext(result)
      if (result.error) {
        setError(result.error)
      }
      if (result.defaultAuthorId) {
        setAuthorId(result.defaultAuthorId)
      }
    })()
    return () => {
      live = false
    }
  }, [open, connected, context])

  // The headline is still being edited behind this dialog, so the fields follow
  // it. Adjusted during render rather than in an effect: React's own answer for
  // state derived from props, and it avoids the extra pass an effect would add
  // on every keystroke in the title.
  const [lastTitle, setLastTitle] = React.useState(title)
  if (title !== lastTitle) {
    setLastTitle(title)
    setName(title)
    if (!slugEdited) {
      setSlug(slugify(title || "Untitled post"))
    }
  }

  // The analysis usually lands after this component mounts, and Regenerate
  // replaces it, so the keywords are picked up whenever they change rather than
  // only at mount. Matching an existing HubSpot tag is left to the server:
  // `resolveTags` looks a name up before creating one, so a keyword the portal
  // already has as a tag reuses it instead of making a near-duplicate.
  const keywordKey = keywords.join("\u0000")
  const [lastKeywordKey, setLastKeywordKey] = React.useState(keywordKey)
  if (keywordKey !== lastKeywordKey) {
    setLastKeywordKey(keywordKey)
    if (!tagsTouched) {
      setTags(keywords.map((name) => ({ name })))
    }
  }

  function addTag(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }
    // Matching the portal's own tag by name means the writer gets the existing
    // tag rather than a near-duplicate that differs only in case.
    const known = context?.tags?.find(
      (tag) => tag.name.toLowerCase() === trimmed.toLowerCase()
    )
    setTags((current) =>
      current.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, known ?? { name: trimmed }]
    )
    setTagsTouched(true)
    setTagDraft("")
  }

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const result = await uploadHubSpotImage(form)
      if (result.error) {
        setError(result.error)
        return
      }
      setImageUrl(result.url ?? "")
    } finally {
      setUploading(false)
    }
  }

  // On success the action redirects, so nothing after the await runs. A
  // returned value therefore always means the publish failed, and HubSpot's
  // own message is what the writer needs to see — "missing the content scope"
  // is actionable in a way "publish failed" is not.
  async function publish() {
    setPublishing(true)
    setError(null)
    try {
      const result = await publishToHubSpot({
        postId,
        title: name,
        body,
        brief,
        insights,
        slug,
        metaDescription: metaDescription.trim() || undefined,
        authorId: authorId || undefined,
        tagIds: tags.map((tag) => tag.id).filter((id): id is string => !!id),
        tagNames: tags.filter((tag) => !tag.id).map((tag) => tag.name),
        featuredImageUrl: imageUrl.trim() || undefined,
        featuredImageAltText: name,
      })
      if (result?.error) {
        setError(result.error)
      }
    } catch (caught) {
      // A redirect throws by design; anything else is worth reporting.
      if (caught instanceof Error && caught.message.includes("NEXT_REDIRECT")) {
        throw caught
      }
      setError(caught instanceof Error ? caught.message : "Publishing failed.")
    } finally {
      setPublishing(false)
    }
  }

  // Roughly what the reader is in for. The store counts nothing, so this is
  // the only place either figure is worked out.
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / 220))
  const loading = connected && !needsSetup && !context

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
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {connected && !needsSetup ? (
            <>
              <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
                <DialogTitle>Publish to {HUBSPOT.name}</DialogTitle>
                <DialogDescription>
                  Filled in from the draft. Change what you need to.
                </DialogDescription>
              </DialogHeader>

              {/* The form scrolls; the account it is going to and the button
                  that sends it stay put, because those are the two facts the
                  writer wants in view the whole way down. */}
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlatformGlyph
                      platformId={HUBSPOT.id}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 truncate text-xs font-medium">
                      {context?.accountLabel ?? HUBSPOT.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {words.toLocaleString()} words · {minutes} min read
                  </span>
                </div>

                {loading ? (
                  <p className="flex items-center gap-2 text-xs/relaxed text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Reading your blog’s authors and tags…
                  </p>
                ) : null}

                <Section label="Blog title" htmlFor="hs-title">
                  <Input
                    id="hs-title"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Section>

                {/* Shown the way HubSpot's own editor shows it — host, blog,
                    then the one segment that belongs to this post. Only the
                    last is editable, because the other two are the blog. */}
                <Section label="Blog URL" htmlFor="hs-slug">
                  <div className="flex items-center gap-1 rounded-md border border-input bg-input/20 px-2 py-1 text-xs dark:bg-input/30">
                    <span className="shrink-0 truncate text-muted-foreground">
                      {context?.domain ?? "your blog"}
                    </span>
                    {context?.pathPrefix ? (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span className="shrink-0 text-muted-foreground">
                          {context.pathPrefix}
                        </span>
                      </>
                    ) : null}
                    <span className="text-muted-foreground">/</span>
                    <input
                      id="hs-slug"
                      value={slug}
                      onChange={(event) => {
                        setSlugEdited(true)
                        setSlug(event.target.value)
                      }}
                      className="min-w-0 flex-1 bg-transparent py-0.5 outline-none"
                    />
                  </div>
                </Section>

                <Section
                  label="Author"
                  htmlFor="hs-author"
                  hint={
                    context?.authors?.length ? null : (
                      <span className="text-xs text-muted-foreground">
                        None on this portal
                      </span>
                    )
                  }
                >
                  <select
                    id="hs-author"
                    className={FIELD}
                    value={authorId}
                    onChange={(event) => setAuthorId(event.target.value)}
                  >
                    <option value="">No author</option>
                    {context?.authors?.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </Section>

                <Section label="Tags" htmlFor="hs-tag">
                  {tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag.name}
                          className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
                        >
                          {tag.name}
                          <button
                            type="button"
                            aria-label={`Remove ${tag.name}`}
                            onClick={() => {
                              setTagsTouched(true)
                              setTags((current) =>
                                current.filter((item) => item.name !== tag.name)
                              )
                            }}
                            className="text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    {/* A datalist rather than a dropdown: the portal's tags are
                        suggestions, and a tag it does not have yet is a valid
                        answer — it is created on publish. */}
                    <Input
                      id="hs-tag"
                      list="hs-tag-options"
                      placeholder="Add a tag"
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          addTag(tagDraft)
                        }
                      }}
                    />
                    <datalist id="hs-tag-options">
                      {context?.tags?.map((tag) => (
                        <option key={tag.id} value={tag.name} />
                      ))}
                    </datalist>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!tagDraft.trim()}
                      onClick={() => addTag(tagDraft)}
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                </Section>

                <Section label="Featured image">
                  {imageUrl ? (
                    <div className="flex flex-col gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt=""
                        className="aspect-[1200/630] w-full rounded-md border border-border object-cover"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={() => fileInput.current?.click()}
                        >
                          <ImageUp />
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setImageUrl("")}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => fileInput.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ImageUp />
                        )}
                        {uploading ? "Uploading…" : "Upload an image"}
                      </Button>
                      <Input
                        aria-label="Featured image URL"
                        placeholder="…or paste an image URL"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                      />
                      <p className="text-xs/relaxed text-muted-foreground">
                        Shown on the blog’s listing page and by anything that
                        unfurls the link. 1,200 × 630 reads well everywhere.
                      </p>
                    </div>
                  )}
                  {/* Uploaded to the portal's own file manager, not linked from
                      here: a featured image is served to every reader, so it
                      cannot depend on a URL only this session can reach. */}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ""
                      if (file) {
                        void upload(file)
                      }
                    }}
                  />
                </Section>

                <Section
                  label="Meta description"
                  htmlFor="hs-meta"
                  hint={
                    <span
                      className={
                        metaDescription.length > META_DESCRIPTION_TARGET
                          ? "text-xs text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {metaDescription.length}/{META_DESCRIPTION_TARGET}
                    </span>
                  }
                >
                  <textarea
                    id="hs-meta"
                    rows={3}
                    className={FIELD}
                    value={metaDescription}
                    onChange={(event) => setMetaDescription(event.target.value)}
                  />
                </Section>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs/relaxed text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
                <p className="min-w-0 text-xs text-muted-foreground">
                  Publishes to your live blog.
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className={HUBSPOT.button}
                    disabled={publishing || uploading}
                    onClick={publish}
                  >
                    {publishing ? <Loader2 className="animate-spin" /> : <Send />}
                    {publishing ? "Publishing…" : `Publish to ${HUBSPOT.name}`}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-w-0 flex-col gap-4 p-4">
              <DialogHeader>
                <DialogTitle>
                  {needsSetup
                    ? `Finish setting up ${HUBSPOT.name}`
                    : `Connect ${HUBSPOT.name} to publish`}
                </DialogTitle>
                <DialogDescription>
                  {needsSetup
                    ? "The account is approved. Choose which blog posts go to."
                    : "Publishing needs a connected blog. Connections also live in Settings."}
                </DialogDescription>
              </DialogHeader>

              <ConnectorList
                connectedIds={needsSetup ? [HUBSPOT.id] : []}
                hubspotNeedsSetup={needsSetup}
                only="blog"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

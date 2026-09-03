"use client"

import * as React from "react"
import { AlertTriangle, Check, Loader2, Plug, Unplug } from "lucide-react"

import {
  disconnectProvider,
  finishHubSpotSetup,
  hubspotSetupOptions,
} from "@/app/connector-actions"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { HUBSPOT, PLATFORMS, SOCIAL_PLATFORM_IDS } from "@/lib/connectors"
import { cn } from "@/lib/utils"

// Connecting HubSpot is a round trip through HubSpot's own consent screen, not
// a form. The customer approves Forward from inside their portal, which means
// we never handle a credential of theirs and either side can revoke it later —
// neither of which was true of the pasted private-app token this replaces.
//
// It comes back in two halves. The grant arrives first and is stored by the
// callback; the blog, language and author can only be listed once there is a
// token to list them with, so they are asked here, on return. A connection
// caught between the two is not broken — it is just unfinished, and says so.

type Blog = { id: string; name: string; url?: string; language?: string }
type Author = { id: string; name: string }

// HubSpot's blog languages are ISO 639 codes, sometimes with a region. The
// blog's own setting wins over anything in this list; it is here for the
// portal that has never set one.
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "en-us", label: "English (United States)" },
  { value: "en-gb", label: "English (United Kingdom)" },
  { value: "en-in", label: "English (India)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "pt-br", label: "Portuguese (Brazil)" },
  { value: "ja", label: "Japanese" },
]

const FIELD =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

const START_URL = "/api/connectors/hubspot/start"

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-xs/relaxed text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  )
}

/** The half of connecting that happens after HubSpot hands the customer back. */
function HubSpotSetup() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [portalLabel, setPortalLabel] = React.useState("HubSpot")
  const [blogs, setBlogs] = React.useState<Blog[]>([])
  const [authors, setAuthors] = React.useState<Author[]>([])
  const [blogId, setBlogId] = React.useState("")
  const [authorId, setAuthorId] = React.useState("")
  const [language, setLanguage] = React.useState("en")

  React.useEffect(() => {
    let live = true
    void (async () => {
      const result = await hubspotSetupOptions()
      if (!live) {
        return
      }
      if (result.error) {
        setError(result.error)
      } else {
        setPortalLabel(result.portalLabel ?? "HubSpot")
        setBlogs(result.blogs ?? [])
        setAuthors(result.authors ?? [])
        setBlogId(result.blogs?.[0]?.id ?? "")
        setAuthorId(result.authors?.[0]?.id ?? "")
        // A blog that declares its own language should win over the default:
        // it is the one HubSpot will actually file posts under.
        setLanguage(result.blogs?.[0]?.language ?? "en")
      }
      setLoading(false)
    })()
    return () => {
      live = false
    }
  }, [])

  // Switching blogs re-reads that blog's language rather than keeping the
  // previous one, which would quietly file posts under the wrong one.
  function chooseBlog(id: string) {
    setBlogId(id)
    const blog = blogs.find((candidate) => candidate.id === id)
    if (blog?.language) {
      setLanguage(blog.language)
    }
  }

  async function save() {
    const blog = blogs.find((candidate) => candidate.id === blogId)
    if (!blog) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await finishHubSpotSetup({
        blogId: blog.id,
        blogName: blog.name,
        domain: blog.url,
        language,
        authorId: authorId || undefined,
        authorName: authors.find((a) => a.id === authorId)?.name,
      })
      if (result.error) {
        setError(result.error)
      }
      // On success the page revalidates and this panel is replaced by the
      // connected row, so there is nothing to reset.
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-xs/relaxed text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Reading your HubSpot account…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-xs font-medium">Choose your blog’s language</h4>
        <p className="text-xs/relaxed text-muted-foreground">
          Posts published to {HUBSPOT.name} are filed under one language. You
          are only asked this once.
        </p>
      </div>

      {/* The portal, as HubSpot named it. Read-only: it is what was just
          approved, and changing it means connecting again. */}
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <PlatformGlyph platformId={HUBSPOT.id} className="size-4 shrink-0" />
        <span className="min-w-0 truncate text-xs font-medium">
          {portalLabel}
        </span>
      </div>

      {/* One blog needs no question; several do. HubSpot files a post under a
          `contentGroupId`, so this is the choice that decides where it lands. */}
      {blogs.length > 1 ? (
        <div className="grid gap-1.5">
          <Label htmlFor="hs-blog">Blog</Label>
          <select
            id="hs-blog"
            className={FIELD}
            value={blogId}
            onChange={(event) => chooseBlog(event.target.value)}
          >
            {blogs.map((blog) => (
              <option key={blog.id} value={blog.id}>
                {blog.name}
              </option>
            ))}
          </select>
        </div>
      ) : blogs.length === 1 ? (
        <p className="text-xs/relaxed text-muted-foreground">
          Publishing to{" "}
          <span className="font-medium text-foreground">{blogs[0].name}</span> —
          the only blog on this portal.
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="hs-language">Language</Label>
        <select
          id="hs-language"
          className={FIELD}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {/* A blog can report a code this list does not carry. Keeping it as
              an option means the setting survives being looked at. */}
          {LANGUAGES.some((option) => option.value === language) ? null : (
            <option value={language}>{language}</option>
          )}
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {authors.length ? (
        <div className="grid gap-1.5">
          <Label htmlFor="hs-author">Default author</Label>
          <select
            id="hs-author"
            className={FIELD}
            value={authorId}
            onChange={(event) => setAuthorId(event.target.value)}
          >
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
          <p className="text-xs/relaxed text-muted-foreground">
            Filled in for every post. Changeable per post when you publish.
          </p>
        </div>
      ) : null}

      {error ? <Problem>{error}</Problem> : null}

      <Button
        type="button"
        className={HUBSPOT.button}
        disabled={saving || !blogId}
        onClick={save}
      >
        {saving ? <Loader2 className="animate-spin" /> : <Plug />}
        {saving ? "Connecting…" : `Connect ${HUBSPOT.name}`}
      </Button>
    </div>
  )
}

export type Kind = "blog" | "social"

export function ConnectorList({
  connectedIds,
  hubspotLabel,
  hubspotNeedsSetup,
  hubspotError,
  only,
}: {
  connectedIds: string[]
  /** Which portal and blog, once connected. */
  hubspotLabel?: string | null
  /** Approved in HubSpot, but never pointed at a blog. */
  hubspotNeedsSetup?: boolean
  /** Whatever went wrong on the way back from HubSpot. */
  hubspotError?: string | null
  only?: Kind
}) {
  const [disconnecting, startDisconnecting] = React.useTransition()

  const hubspotConnected = connectedIds.includes(HUBSPOT.id)
  const socialPlatforms = PLATFORMS.filter((platform) =>
    SOCIAL_PLATFORM_IDS.includes(platform.id)
  )

  return (
    <div className="flex flex-col gap-6">
      {only !== "social" ? (
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-medium">Blog</h3>
            <p className="text-xs text-muted-foreground">
              Where a published post goes.
            </p>
          </div>

          {hubspotError ? <Problem>{hubspotError}</Problem> : null}

          {hubspotConnected && !hubspotNeedsSetup ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <PlatformGlyph
                  platformId={HUBSPOT.id}
                  className="size-4 shrink-0"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">
                    {HUBSPOT.name}
                  </span>
                  {hubspotLabel ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {hubspotLabel}
                    </span>
                  ) : null}
                </div>
                <Check className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disconnecting}
                onClick={() =>
                  startDisconnecting(async () => disconnectProvider("hubspot"))
                }
              >
                <Unplug />
                Disconnect
              </Button>
            </div>
          ) : hubspotConnected ? (
            <HubSpotSetup />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-dashed border-border px-3 py-2.5 text-xs/relaxed text-muted-foreground">
                Nothing connected yet.
              </div>
              {/* An anchor wearing the button's clothes. It has to be a real
                  navigation rather than a router push: the next stop is
                  HubSpot's own domain, and the client router cannot follow a
                  redirect off the application. */}
              <a
                href={START_URL}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-fit no-underline"
                )}
              >
                <Plug />
                Connect {HUBSPOT.name}
              </a>
              <p className="text-xs/relaxed text-muted-foreground">
                You will be sent to {HUBSPOT.name} to choose a portal and
                approve access. Forward never sees your {HUBSPOT.name}{" "}
                password, and you can revoke it from there at any time.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {only !== "blog" ? (
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs font-medium">Social</h3>
            <p className="text-xs text-muted-foreground">
              Where Social Studio posts.
            </p>
          </div>

          {/* Not connectable yet, and saying so is more honest than a button
              that opens a dialog which cannot finish. What is missing is
              credentials, not permission: neither platform reviews an app that
              posts on behalf of a signed-in user. See ai/guide/api-approvals.md. */}
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border opacity-60">
            {socialPlatforms.map((platform) => (
              <li
                key={platform.id}
                className="flex items-center justify-between gap-4 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <PlatformGlyph platformId={platform.id} className="size-4" />
                  {platform.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Awaiting API access
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs/relaxed text-muted-foreground">
            Posting needs a registered app on each platform. Until then Social
            Studio drafts and schedules, but does not send.
          </p>
        </section>
      ) : null}
    </div>
  )
}

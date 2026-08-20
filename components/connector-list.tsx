"use client"

import * as React from "react"
import { AlertTriangle, Check, Loader2, Plug, Unplug } from "lucide-react"

import {
  connectHubSpot,
  disconnectProvider,
  inspectHubSpotToken,
} from "@/app/connector-actions"
import { PlatformGlyph } from "@/components/editor/platform-glyph"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HUBSPOT, PLATFORMS, SOCIAL_PLATFORM_IDS } from "@/lib/connectors"

// Connecting HubSpot is a two-step exchange rather than a single form: the
// token has to be proven against the API before it is stored, and the blog and
// author it can reach are only knowable once it has been. A token that turns
// out to be wrong therefore fails here, with HubSpot's own message, instead of
// silently at publish time.

type Blog = { id: string; name: string; url?: string; language?: string }
type Author = { id: string; name: string }

const LANGUAGES = [
  { value: "en-us", label: "English (United States)" },
  { value: "en-gb", label: "English (United Kingdom)" },
  { value: "en-in", label: "English (India)" },
  { value: "de-de", label: "German" },
  { value: "fr-fr", label: "French" },
  { value: "es-es", label: "Spanish" },
]

const FIELD =
  "w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"

function HubSpotConnect({ onDone }: { onDone: () => void }) {
  const [token, setToken] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [checking, setChecking] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [label, setLabel] = React.useState("")
  const [blogs, setBlogs] = React.useState<Blog[]>([])
  const [authors, setAuthors] = React.useState<Author[]>([])
  const [blogId, setBlogId] = React.useState("")
  const [authorId, setAuthorId] = React.useState("")
  const [language, setLanguage] = React.useState("en-us")

  async function check() {
    setChecking(true)
    setError(null)
    try {
      const result = await inspectHubSpotToken(token)
      if (result.error) {
        setError(result.error)
        return
      }
      setLabel(result.label ?? "HubSpot")
      setBlogs(result.blogs ?? [])
      setAuthors(result.authors ?? [])
      setBlogId(result.blogs?.[0]?.id ?? "")
      setAuthorId(result.authors?.[0]?.id ?? "")
      // A blog that declares its own language should win over the default.
      setLanguage(result.blogs?.[0]?.language ?? "en-us")
    } finally {
      setChecking(false)
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
      const result = await connectHubSpot({
        token,
        blogId: blog.id,
        blogName: blog.name,
        domain: blog.url,
        authorId: authorId || undefined,
        authorName: authors.find((a) => a.id === authorId)?.name,
        language,
        label,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  // Once the token is proven, the panel becomes the choice of where posts land.
  if (blogs.length) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <p className="text-xs/relaxed text-muted-foreground">
          Connected to <span className="font-medium text-foreground">{label}</span>.
          Choose where posts are published.
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="hs-blog">Blog</Label>
          <select
            id="hs-blog"
            className={FIELD}
            value={blogId}
            onChange={(event) => setBlogId(event.target.value)}
          >
            {blogs.map((blog) => (
              <option key={blog.id} value={blog.id}>
                {blog.name}
              </option>
            ))}
          </select>
        </div>

        {authors.length ? (
          <div className="grid gap-1.5">
            <Label htmlFor="hs-author">Author</Label>
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
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="hs-language">Language</Label>
          {/* HubSpot files every post under one language, and changing it later
              re-files the whole blog — so it is asked once, here. */}
          <select
            id="hs-language"
            className={FIELD}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="text-xs/relaxed text-destructive">
            {error}
          </p>
        ) : null}

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

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="grid gap-1.5">
        <Label htmlFor="hs-token">Private app token</Label>
        <Input
          id="hs-token"
          type="password"
          autoComplete="off"
          placeholder="pat-na1-…"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <p className="text-xs/relaxed text-muted-foreground">
          HubSpot → Settings → Integrations → Private Apps. The app needs the{" "}
          <code className="rounded bg-muted px-1 py-0.5">content</code> scope.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-xs/relaxed text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        disabled={checking || !token.trim()}
        onClick={check}
      >
        {checking ? <Loader2 className="animate-spin" /> : null}
        {checking ? "Checking with HubSpot…" : "Continue"}
      </Button>
    </div>
  )
}

export type Kind = "blog" | "social"

export function ConnectorList({
  connectedIds,
  hubspotLabel,
  only,
}: {
  connectedIds: string[]
  /** Which portal and blog, once connected. */
  hubspotLabel?: string | null
  only?: Kind
}) {
  const [connecting, setConnecting] = React.useState(false)
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

          {hubspotConnected ? (
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
          ) : connecting ? (
            <HubSpotConnect onDone={() => setConnecting(false)} />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-dashed border-border px-3 py-2.5 text-xs/relaxed text-muted-foreground">
                Nothing connected yet.
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => setConnecting(true)}
              >
                <Plug />
                Connect {HUBSPOT.name}
              </Button>
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

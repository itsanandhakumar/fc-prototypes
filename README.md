# Forward

Two products in one app:

- **Blogger** — you give it a brief, Claude writes the draft, you edit it in
  Markdown or as rich text, then publish it to your HubSpot blog.
- **Social Studio** — turn a brief or an existing blog post into per-platform
  social copy for LinkedIn and X, then post it now or schedule it.

Blogger is functional end to end: real accounts, a real database, real
generation, and posts that land on a live HubSpot blog. Social Studio keeps its
drafts, schedules and state in the same database, but does not send to LinkedIn
or X yet and still writes its copy from templates. See **What is and isn't
real** below.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run db:push              # create the tables in TiDB
npm run dev
```

Then open http://localhost:3000 and create an account.

### What you need in `.env.local`

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | TiDB Cloud → your cluster → **Connect** → General. Append `/<database>` to the path. |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud → Credentials → OAuth client ID (Web application). Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `CLAUDE_CODE_OAUTH_TOKEN` | Run `claude setup-token` |

You also need the Claude Code CLI on `PATH`
(`npm i -g @anthropic-ai/claude-code`) — generation shells out to it. Do **not**
set `ANTHROPIC_API_KEY`; it shadows the subscription token and bills per token
instead.

Full walkthroughs live in `ai/guide/`: `tidb-cloud-setup.md` and
`claude-cli-auth.md`.

## The flow

- **`/`** — log in or create an account. Google SSO and email/password land on
  the same user record, keyed by email.
- **`/blogger`** — your posts, filtered by status, recency and title.
- **`/editor`** — the brief generates here. `?post=<id>` opens a stored post;
  `?prompt=`/`?title=` opens an empty one that generates on arrival. Two ways
  out: **Save as draft**, or **Publish to HubSpot**.
- **`/socials`** — social posts, as a list or a calendar, with a summary strip.
- **`/socials/versions`** — three drafts per platform, dealt as a deck.
- **`/socials/editor`** — the chosen draft per platform, with live previews:
  save as a draft, schedule it, or post it now.

## What is and isn't real

**Real** — accounts, sessions, the post database, blog generation, and the
rich-text editor. Every post query is scoped by `userId`, which is also the
whole authorisation model: a guessed post id returns nothing rather than someone
else's draft.

**Real** — HubSpot publishing. Connect a portal in Settings and **Publish to
HubSpot** creates the post on your live blog through the CMS v3 API, then stores
its id so a second publish updates rather than duplicates. Setup:
`ai/guide/hubspot-setup.md`.

**Real** — social drafts, schedules and their state. Posts and their per-platform
variants live in TiDB, and a schedule is a real timestamp a worker can query
(`dueSocialPosts()`).

**Not real yet** — sending to LinkedIn and X, and the copy Social Studio writes.
Publishing a social post records it without calling any network, and
`lib/social-generator.ts` is still deterministic templates rather than a model.

Sending is blocked outside the code: LinkedIn needs an app approved for
`w_member_social`, X needs a paid API tier. Settings shows both as "Awaiting API
access" rather than offering a button that cannot finish.

### Generation

`POST /api/generate` streams newline-delimited JSON: one `{phase}` object per
stage, then `{result}` or `{error}`. The editor's log is driven off those phases,
so it reports work that is actually happening rather than playing a timed
animation.

The draft and its analysis — meta description, keyword coverage, gaps, alternate
titles, follow-up ideas — come back from a single Claude call, so the analysis
always describes the draft that shipped.

That call goes through the **Claude Code CLI**, not the HTTP API, so it bills
against a Claude subscription. `lib/ai/claude-cli.ts` spawns `claude -p` and
`lib/ai/blog.ts` validates the JSON it returns (the CLI cannot enforce a schema,
so a malformed response gets one corrective retry).

Two consequences worth knowing:

- **Concurrency, not cost, is the ceiling.** A subscription is one seat, so
  requests are gated — `CLAUDE_MAX_CONCURRENT` (default 2) with a queue. Past the
  queue depth the editor says to try again shortly.
- **Serverless will not work.** The CLI needs a real filesystem and a writable
  home directory. Deploy to a VPS or container, not Vercel.

Swapping back to the HTTP API means changing those two files and nothing else.

### The editor

Markdown is the canonical form: it is what Claude writes, what is stored, and
what **Copy Markdown** hands over. The Preview tab is a Tiptap surface editing
the same text as rich text, converting back to Markdown on every keystroke. The
conversion is verified round-trip-stable for the subset the toolbar offers —
headings, bold, italic, links, inline code, quotes, and both list kinds.

## Data

TiDB Cloud (MySQL-compatible) via Drizzle. No foreign keys — every read is
scoped by `userId` in the query layer instead, which is also the whole
authorisation model.

```bash
npm run db:generate   # write a migration to drizzle/
npm run db:migrate    # apply migrations
npm run db:studio     # browse the data
```

Tables: the four Auth.js owns, plus `post`, `connection`, `social_post` and
`social_variant`. Credentials live in `connection` rather than a cookie — a
HubSpot token can publish to a customer's live blog, so it never reaches the
browser.

> ⚠️ `npm run db:push` fails with `Multiple primary key defined` on this schema.
> That is a drizzle-kit introspection bug with composite primary keys, not a
> problem with your database — it does not see the existing keys on `account`
> and `verificationToken` and tries to add them twice. Use `db:generate` +
> `db:migrate` instead once the tables exist.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui on Base UI ·
Auth.js v5 · Drizzle + TiDB Cloud · Tiptap · Claude Code CLI (`claude-opus-5`)

```bash
npm run typecheck
npm run lint
npm run build
npm run format
```

Read `AGENTS.md` before writing code — this Next.js version has breaking changes
from what a model is likely to have been trained on. Notably: route protection
lives in `proxy.ts`, not `middleware.ts`.

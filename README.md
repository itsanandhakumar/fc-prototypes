# Blogger prototype

A working prototype of a blog-writing tool: you give it a brief, it writes a
draft, and it composes the social posts that go out with it. Everything runs
locally with no backend — there is no model call, no OAuth, and no database.

Extracted from the `forward-blog-intelligence` branch of `forward-pro`, where it
was built as an orphan branch with no shared history with that app.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Sign in with any of the demo accounts (`lib/auth.ts`), password `forward`:

| Email | Who |
| --- | --- |
| `demo@forward.tools` | Sam Okonkwo — Forward, House blog |
| `editor@forward.tools` | Priya Raman — Forward, Client work |
| `agency@northbound.co` | Northbound Studio — Northbound, Retainer |

Nothing is reachable before login — `proxy.ts` redirects every other route back
to `/`.

## The flow

- **`/`** — login
- **`/dashboard`** — the workspace's posts, drafts and published
- **`/new`** — the brief: topic, angle, audience, attachments, target platforms
- **`/editor`** — the generation log plays back while the draft is written, then
  the composer, title options, and per-platform social previews

## How the prototype fakes its work

- `lib/draft-generator.ts` writes the draft from the brief. Deterministic, no
  model runs.
- `lib/generation-steps.ts` is the log shown during generation. Every line is
  read back off the brief, the finished draft, or the posts already in the
  workspace — nothing is invented for the sake of having something to show.
- `lib/post-store.ts` is the store: an in-memory array seeded from
  `lib/blog-data.ts`. **Saves survive navigation but reset when the dev server
  restarts.**
- `lib/connectors.ts` holds each platform's real composing rules and brand
  chrome, so the previews look like the network they are previewing. Connecting
  an account is mocked.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui on Base UI
(`components.json` preset), themed via `next-themes`.

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
npm run format      # prettier
```

Read `AGENTS.md` before writing code — this Next.js version has breaking changes
from what a model is likely to have been trained on.

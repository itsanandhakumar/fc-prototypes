# Social Studio — PRD

**Status:** Draft v0.3 · **Last updated:** 2026-08-07

## What & why

One place to draft content, publish it (now or scheduled) to LinkedIn, X, and Substack, and see how it's doing. No more rewriting the same post per platform or checking three different dashboards.

## Who it's for

Solo creators — same people who'd use `blogger-prototype`. Single user per account, no teams/roles for now.

## Direction: minimal, same shape as `blogger-prototype`

That app is 4 screens in a straight line: login → dashboard (list of posts) → brief → editor (generate + compose + preview). No settings sprawl, no extra nav, one home screen.

Social Studio should feel the same — one linear create flow, one home screen doing double duty as your post list *and* your analytics, minimal chrome everywhere else.

## The flow

- **`/`** — login
- **`/dashboard`** — home. A summary strip at the top (streak, week-over-week reach/views), then the list of posts — drafts, scheduled, published. Each published post shows its own stats inline, right on its card, no separate analytics page.
- **`/new`** — start a draft: what it's about + which platforms (LinkedIn / X / Substack)
- **`/editor`** — compose, with AI help; per-platform preview; then **Publish now** or **Schedule**
- **Connect accounts** — one minimal settings page: connect/disconnect LinkedIn, X, Substack, with status (connected / expired / error)

## v1 scope

- **Draft** — write in-app (short-form for LinkedIn/X, long-form for Substack), with AI help. One draft, tweak per platform before it goes out.
- **Publish** — post now, or schedule for later. If a scheduled post fails, tell the user and let them retry.
- **Connect** — OAuth/API connection to LinkedIn, X, Substack. Show connected/expired/error status.
- **Analytics** —
  - Per-post: shown inline on that post's card in the dashboard (likes, comments, views, etc.)
  - Account-level: a summary strip at the top of the dashboard — posting streak + week-over-week reach/views trend. (Goals and a "score" were floated too; holding those back for now — they start to feel like a gamification layer rather than analytics. Revisit after the streak/trend strip is live.)

## Not doing yet

- Facebook, Instagram, Medium, Beehiiv, Ghost, Dev.to (later phases)
- Teams, roles, approvals, multi-brand accounts
- Pricing/packaging, positioning
- Ad management
- Link/UTM click-tracking — not a fit, this product isn't about conversion/funnels
- Posting goals, streak "score" — maybe later, not v1

## Later

Add Facebook + Instagram, then the rest of the long-form platforms (Medium, Beehiiv, Ghost, Dev.to). Pricing, team features, and any deeper gamification (goals/scores) come after v1 proves out.

## Open questions

- Substack's public API is limited — need to confirm what's actually postable/trackable before committing to it for v1. Same check needed for Medium/Beehiiv/Ghost/Dev.to before Phase 3.
- How much "AI help" in drafting — full generation, or just adapting one draft into per-platform variants?
- Pricing (one-time purchase, amount TBD) — punting for now.

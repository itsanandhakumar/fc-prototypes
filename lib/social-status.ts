// What each status looks like, in one place.
//
// The calendar and the list are two ways of looking at the same posts, so a
// post has to be the same colour in both — a state that reads green in the
// month and grey in the list is two states as far as anyone reading it is
// concerned. Both views take their colours from here.

import type { SocialStatus } from "@/lib/social-data"

/**
 * One hue each, because four states need four colours. Published gets green
 * rather than the theme's ink: it is by far the commonest status, and in plain
 * ink a month came out grey with the odd coloured chip in it — which reads as
 * "grey is normal" rather than "this post is out".
 *
 * Green is a fixed value rather than a token because the theme has no success
 * colour to borrow, the same way the platform previews carry fixed brand
 * values, and it is stated for both themes for the same reason.
 */
export const STATUS_TONE: Record<SocialStatus, string> = {
  Draft:
    "border-dashed border-foreground/30 bg-transparent text-muted-foreground",
  Scheduled: "border-primary/40 bg-primary/10 text-primary dark:bg-primary/25",
  Published:
    "border-emerald-600/35 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-300",
  Failed:
    "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/25",
}

/** The same colours a shade stronger, for the calendar's chips, which are
    small enough to need the hover state to be felt rather than guessed. */
export const STATUS_HOVER: Record<SocialStatus, string> = {
  Draft: "hover:bg-input/40",
  Scheduled: "hover:bg-primary/20",
  Published: "hover:bg-emerald-600/20",
  Failed: "hover:bg-destructive/20",
}

/**
 * The same four states as a solid dot, for the places too small to carry a
 * chip — chiefly the line that counts the posts a day had no room to show.
 * Solid rather than tinted: at four pixels across, a 10% fill is not a colour.
 */
export const STATUS_DOT: Record<SocialStatus, string> = {
  Draft: "bg-foreground/35",
  Scheduled: "bg-primary",
  Published: "bg-emerald-600 dark:bg-emerald-400",
  Failed: "bg-destructive",
}

/**
 * Whether opening this post means opening it to work on.
 *
 * A draft and a scheduled post are both unfinished — one has not been sent and
 * the other has not gone yet — so the useful thing to do with either is change
 * it, and clicking should land in the workspace. A published post is done and a
 * failed one is a thing that happened; for those the useful thing is to read
 * what went out and how it did, which is what the preview is for.
 */
export function isEditable(status: SocialStatus): boolean {
  return status === "Draft" || status === "Scheduled"
}

/** Where a post opens, for the callers that navigate rather than preview. */
export function editorHrefFor(id: string): string {
  return `/socials/editor?post=${encodeURIComponent(id)}`
}

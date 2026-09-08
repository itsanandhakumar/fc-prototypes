// The places the suite can send work. Two kinds, because they are two kinds:
// Social Studio posts to social networks, and Blogger publishes to a CMS.
// Connecting is mocked — there is no OAuth yet — but each social platform's
// composing rules are real, because they are what makes the composer feel like
// the platform it is posting to.

export type AttachmentKind = "image" | "video" | "document" | "gif"

export type AttachmentRule = {
  kind: AttachmentKind
  label: string
  /** How many of this kind a single post may carry. */
  max: number
  accept: string
}

// How a post from this platform looks once published. Kept as data so a new
// platform is one entry here rather than another branch in the preview.
export type PreviewAction = {
  icon: "like" | "comment" | "repost" | "send" | "heart" | "views" | "bookmark"
  /** The word on the control, where the network shows words. */
  label: string
  /**
   * Which figure sits beside the icon, where the network shows counts instead
   * of words. Only filled in for a post that has actually been published —
   * a draft has no engagement, and inventing some would make the preview lie.
   */
  metric?: "likes" | "comments" | "reposts" | "impressions"
}

// The preview is meant to look like the network it is previewing, so these are
// that network's own colours and shapes rather than Forward's tokens. They are
// deliberately fixed values: a LinkedIn card that followed our theme would stop
// looking like LinkedIn. Each surface carries a dark variant because every one
// of these networks has a real dark mode.
export type PlatformChrome = {
  /** Brand colour. Also the gradient of the generated link image. */
  accent: string
  accentTo: string
  /** The feed card itself. */
  card: string
  /** Secondary text: handles, timestamps, action labels. */
  meta: string
  /** Hairlines inside the card. */
  divider: string
  /** Corner radius of the card, and of a link card inside it. */
  radius: string
  linkRadius: string
  /** The strip under a link image. */
  linkFooter: string
  /** LinkedIn puts the headline above the domain; X and the rest invert it. */
  linkOrder: "title-first" | "domain-first"
  /** Whether the display name and handle share a line. */
  header: "stacked" | "inline"
  /** Whether this network shows a reactions line above the actions, as
      LinkedIn does. The text is built from real figures, not stored. */
  reactions?: boolean
  /** X and Threads set their mark in the card's ink, not in a brand colour. */
  glyphTint: "accent" | "ink"
}

export type PlatformPreview = {
  /** Characters shown before a "see more" fold, or null if nothing folds. */
  truncateAt: number | null
  actions: PreviewAction[]
  chrome: PlatformChrome
}

export type Platform = {
  id: string
  name: string
  /** The handle a connected account would post as. */
  handle: string
  /** How the connected account appears in a post preview. */
  profile: { name: string; subtitle: string; initials: string }
  characterLimit: number
  /** Attachment kinds are mutually exclusive on both platforms today. */
  attachments: AttachmentRule[]
  /** How the platform treats a URL in the body. */
  linkNote: string
  /**
   * Where a post on this platform lives once it is out. `{id}` is a numeric
   * post id and `{token}` an opaque one — the networks mint two different
   * shapes, and a link that carries the wrong one does not look like a link to
   * that network. Nothing is really posted, so the prototype makes the id up
   * (see `permalinkFor` in lib/social-publish.ts).
   */
  permalink: string
  /** Short-form platforms get a one-line hook; long-form ones get the argument. */
  copy: "short" | "long"
  preview: PlatformPreview
}

export const PLATFORMS: Platform[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "Sam Okonkwo · Forward",
    profile: {
      name: "Sam Okonkwo",
      subtitle: "Content lead at Forward · Now",
      initials: "SO",
    },
    characterLimit: 3000,
    attachments: [
      {
        kind: "image",
        label: "Images",
        max: 20,
        accept: "image/*",
      },
      { kind: "video", label: "Video", max: 1, accept: "video/*" },
      {
        kind: "document",
        label: "Document",
        max: 1,
        accept: ".pdf,.doc,.docx,.ppt,.pptx",
      },
    ],
    linkNote: "A link in the text renders as a preview card.",
    permalink: "linkedin.com/feed/update/urn:li:activity:{id}",
    copy: "long",
    preview: {
      truncateAt: 210,
      actions: [
        { icon: "like", label: "Like" },
        { icon: "comment", label: "Comment" },
        { icon: "repost", label: "Repost" },
        { icon: "send", label: "Send" },
      ],
      chrome: {
        accent: "#0A66C2",
        accentTo: "#004182",
        card: "bg-white text-[#000000E6] border-[#00000014] dark:bg-[#1B1F23] dark:text-[#FFFFFFE6] dark:border-[#FFFFFF1F]",
        meta: "text-[#00000099] dark:text-[#FFFFFF99]",
        divider: "bg-[#0000001A] dark:bg-[#FFFFFF1F]",
        radius: "rounded-lg",
        linkRadius: "rounded-none",
        linkFooter: "bg-[#F4F2EE] dark:bg-[#1D2226]",
        linkOrder: "title-first",
        header: "stacked",
        glyphTint: "accent",
        reactions: true,
      },
    },
  },
  {
    id: "x",
    name: "X",
    handle: "@forwardtools",
    profile: {
      name: "Forward",
      subtitle: "@forwardtools · now",
      initials: "F",
    },
    characterLimit: 280,
    attachments: [
      { kind: "image", label: "Images", max: 4, accept: "image/*" },
      { kind: "video", label: "Video", max: 1, accept: "video/*" },
      { kind: "gif", label: "GIF", max: 1, accept: "image/gif" },
    ],
    linkNote: "A link counts as 23 characters however long it is.",
    permalink: "x.com/forwardtools/status/{id}",
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "", metric: "comments" },
        { icon: "repost", label: "", metric: "reposts" },
        { icon: "heart", label: "", metric: "likes" },
        { icon: "views", label: "", metric: "impressions" },
        { icon: "bookmark", label: "" },
      ],
      chrome: {
        accent: "#1D9BF0",
        accentTo: "#0C7ABF",
        card: "bg-white text-[#0F1419] border-[#EFF3F4] dark:bg-black dark:text-[#E7E9EA] dark:border-[#2F3336]",
        meta: "text-[#536471] dark:text-[#71767B]",
        divider: "bg-[#EFF3F4] dark:bg-[#2F3336]",
        radius: "rounded-2xl",
        linkRadius: "rounded-2xl",
        linkFooter: "bg-white dark:bg-black",
        linkOrder: "domain-first",
        header: "inline",
        glyphTint: "ink",
      },
    },
  },
  {
    id: "bluesky",
    name: "Bluesky",
    handle: "@forward.bsky.social",
    profile: {
      name: "Forward",
      subtitle: "@forward.bsky.social · now",
      initials: "F",
    },
    characterLimit: 300,
    attachments: [
      { kind: "image", label: "Images", max: 4, accept: "image/*" },
      { kind: "video", label: "Video", max: 1, accept: "video/*" },
    ],
    linkNote: "Links are counted in full, unlike on X.",
    permalink: "bsky.app/profile/forward.bsky.social/post/{token}",
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "", metric: "comments" },
        { icon: "repost", label: "", metric: "reposts" },
        { icon: "heart", label: "", metric: "likes" },
      ],
      chrome: {
        accent: "#0085FF",
        accentTo: "#0056B3",
        card: "bg-white text-[#0B0F14] border-[#E1E4E8] dark:bg-[#161E27] dark:text-[#F1F3F5] dark:border-[#2E3B49]",
        meta: "text-[#42576C] dark:text-[#8D9CAD]",
        divider: "bg-[#E1E4E8] dark:bg-[#2E3B49]",
        radius: "rounded-lg",
        linkRadius: "rounded-lg",
        linkFooter: "bg-white dark:bg-[#161E27]",
        linkOrder: "domain-first",
        header: "inline",
        glyphTint: "accent",
      },
    },
  },
  {
    id: "threads",
    name: "Threads",
    handle: "@forwardtools",
    profile: { name: "forwardtools", subtitle: "now", initials: "F" },
    characterLimit: 500,
    attachments: [
      { kind: "image", label: "Images", max: 20, accept: "image/*" },
      { kind: "video", label: "Video", max: 1, accept: "video/*" },
    ],
    linkNote: "The first link in the post gets a preview card.",
    permalink: "threads.net/@forwardtools/post/{token}",
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "heart", label: "", metric: "likes" },
        { icon: "comment", label: "", metric: "comments" },
        { icon: "repost", label: "", metric: "reposts" },
        { icon: "send", label: "" },
      ],
      chrome: {
        accent: "#101010",
        accentTo: "#4A4A4A",
        card: "bg-white text-[#0A0A0A] border-[#DBDBDB] dark:bg-[#101010] dark:text-[#F5F5F5] dark:border-[#2A2A2A]",
        meta: "text-[#999999] dark:text-[#777777]",
        divider: "bg-[#DBDBDB] dark:bg-[#2A2A2A]",
        radius: "rounded-xl",
        linkRadius: "rounded-xl",
        linkFooter: "bg-white dark:bg-[#101010]",
        linkOrder: "domain-first",
        header: "inline",
        glyphTint: "ink",
      },
    },
  },
  {
    id: "mastodon",
    name: "Mastodon",
    handle: "@forward@mastodon.social",
    profile: {
      name: "Forward",
      subtitle: "@forward@mastodon.social · now",
      initials: "F",
    },
    characterLimit: 500,
    attachments: [
      { kind: "image", label: "Images", max: 4, accept: "image/*" },
      { kind: "video", label: "Video", max: 1, accept: "video/*" },
    ],
    linkNote: "Every link costs 23 characters, however long it is.",
    permalink: "mastodon.social/@forward/{id}",
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "", metric: "comments" },
        { icon: "repost", label: "", metric: "reposts" },
        { icon: "heart", label: "", metric: "likes" },
        { icon: "bookmark", label: "" },
      ],
      chrome: {
        accent: "#6364FF",
        accentTo: "#563ACC",
        card: "bg-white text-[#191B22] border-[#C0CDD9] dark:bg-[#282C37] dark:text-[#FFFFFF] dark:border-[#393F4F]",
        meta: "text-[#606984] dark:text-[#9BAEC8]",
        divider: "bg-[#C0CDD9] dark:bg-[#393F4F]",
        radius: "rounded-md",
        linkRadius: "rounded-md",
        linkFooter: "bg-[#F2F5F7] dark:bg-[#1F232B]",
        linkOrder: "domain-first",
        header: "inline",
        glyphTint: "accent",
      },
    },
  },
]

/**
 * What Social Studio offers, per the PRD. The registry carries more than this
 * — bluesky, threads and mastodon are fully specified and ready — but only
 * these are surfaced, so turning another one on is a one-line change.
 *
 * Substack is named in the PRD and is not here yet: it needs a full entry with
 * its own preview chrome before it can be offered.
 */
export const SOCIAL_PLATFORM_IDS = ["linkedin", "x"]

/**
 * Where a blog post goes when it is published. A CMS has none of what a
 * social platform has — no character limit, no attachment rules, no feed card
 * to preview — so it is its own small shape rather than a Platform with the
 * social parts left blank.
 */
export type BlogDestination = {
  id: string
  name: string
  /** The connected portal a post would publish into. */
  account: string
  /** Where the published post would live. */
  domain: string
  /**
   * The destination's own button colours, so the action that hands a post over
   * looks like the thing it is handing it to. Fixed values rather than our
   * tokens, for the same reason the social previews carry fixed ones: an orange
   * that followed our theme would stop being HubSpot's orange.
   */
  button: string
  /**
   * The brand colour as a gradient, for a share image generated for a post on
   * the way to this destination. The social previews carry the same pair for
   * the same reason (see PlatformChrome) — a generated card should look like
   * the place it is going.
   */
  accent: string
  accentTo: string
  /**
   * The same brand colour worn quietly, for a badge that reports a post already
   * went here. A status pill is read in a list of dozens, so it takes the
   * orange as a wash with the ink deepened enough to stay legible on it, rather
   * than the solid fill the button uses to ask for a click.
   */
  badge: string
}

export const HUBSPOT: BlogDestination = {
  id: "hubspot",
  name: "HubSpot",
  account: "Forward Marketing · Portal 24601",
  domain: "blog.forward.tools",
  button:
    "bg-[#FF7A59] text-white hover:bg-[#F2603C] focus-visible:border-[#FF7A59] focus-visible:ring-[#FF7A59]/40",
  accent: "#FF7A59",
  accentTo: "#B0411F",
  badge:
    "bg-[#FF7A59]/15 text-[#B0411F] dark:bg-[#FF7A59]/15 dark:text-[#FF9C82]",
}

// One today. It stays a list because the settings panel renders it as one, and
// because a second CMS should be an entry here rather than a new branch.
export const BLOG_DESTINATIONS: BlogDestination[] = [HUBSPOT]

export const CONNECTORS_COOKIE = "forward_connectors"

export function findPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((platform) => platform.id === id)
}

export function findBlogDestination(id: string): BlogDestination | undefined {
  return BLOG_DESTINATIONS.find((destination) => destination.id === id)
}

// Both kinds share one cookie: it is the account's connections, and the
// account does not think of them as two lists.
export function parseConnectedIds(value: string | undefined): string[] {
  if (!value) {
    return []
  }
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => Boolean(findPlatform(id) ?? findBlogDestination(id)))
}

/** Whether the blog has somewhere to publish to. */
export function isConnected(
  value: string | undefined,
  id: string = HUBSPOT.id
): boolean {
  return parseConnectedIds(value).includes(id)
}

// Platforms are always listed in registry order, so a post's destinations read
// the same everywhere regardless of the order they were chosen or stored in.
export function orderPlatformIds(ids: string[]): string[] {
  return PLATFORMS.filter((platform) => ids.includes(platform.id)).map(
    (platform) => platform.id
  )
}

export function platformNames(ids: string[]): string[] {
  return orderPlatformIds(ids).map((id) => findPlatform(id)?.name ?? id)
}

/**
 * The rules one set of media has to satisfy to go to all of these at once.
 *
 * A kind survives only if every platform takes it — LinkedIn accepts a document
 * and X does not, so a post going to both cannot carry one — and the count is
 * the lowest any of them allows, because the strictest is the one that would
 * reject it. Attaching the same media everywhere means meeting the tightest
 * rule rather than the average of them, which is also what makes it safe to
 * hand the same files to each platform when the writer switches to setting
 * them separately.
 */
export function sharedAttachmentRules(platforms: Platform[]): AttachmentRule[] {
  const [first, ...rest] = platforms
  if (!first) {
    return []
  }

  return first.attachments.flatMap((rule) => {
    let max = rule.max

    for (const platform of rest) {
      const match = platform.attachments.find((item) => item.kind === rule.kind)
      if (!match) {
        return []
      }
      max = Math.min(max, match.max)
    }

    return [{ ...rule, max }]
  })
}

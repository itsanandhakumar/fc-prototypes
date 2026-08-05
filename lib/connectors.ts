// Social platforms the app can post to. Connecting is mocked — there is no
// OAuth yet — but each platform's composing rules are real, because they are
// what makes the composer feel like the platform it is posting to.

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
  label: string
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
  /** A reactions line above the actions, as LinkedIn shows. */
  reactions?: string
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
        reactions: "Sam and 11 others · 4 comments",
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
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "12" },
        { icon: "repost", label: "8" },
        { icon: "heart", label: "64" },
        { icon: "views", label: "1.2K" },
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
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "6" },
        { icon: "repost", label: "14" },
        { icon: "heart", label: "38" },
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
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "heart", label: "41" },
        { icon: "comment", label: "5" },
        { icon: "repost", label: "9" },
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
    copy: "short",
    preview: {
      truncateAt: null,
      actions: [
        { icon: "comment", label: "3" },
        { icon: "repost", label: "11" },
        { icon: "heart", label: "27" },
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

export const CONNECTORS_COOKIE = "forward_connectors"

export function findPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((platform) => platform.id === id)
}

export function parseConnectedIds(value: string | undefined): string[] {
  if (!value) {
    return []
  }
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => Boolean(findPlatform(id)))
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

export function connectedPlatforms(value: string | undefined): Platform[] {
  const ids = parseConnectedIds(value)
  return PLATFORMS.filter((platform) => ids.includes(platform.id))
}

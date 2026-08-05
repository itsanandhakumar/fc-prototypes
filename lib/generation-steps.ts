// What the app says it did while a draft was being written. Every line here is
// read back off the brief, the finished draft, or the posts already in the
// workspace — nothing is invented for the sake of having something to show. No
// model runs, so the steps are a replay of work that has already happened; the
// pacing is what makes it legible.

import type { DraftBrief } from "@/lib/draft-generator"
import type { PostInsights } from "@/lib/post-insights"

export type GenerationStep = {
  id: string
  /** Present tense, shown while the step is running. */
  running: string
  /** Past tense, shown once it is done. */
  done: string
  /** How long the step is held on screen. */
  ms: number
  lines: string[]
  tags?: string[]
  tagsLabel?: string
  /** Tags that are gaps rather than hits, so they read as warnings. */
  gapTags?: string[]
  gapTagsLabel?: string
}

const list = (items: string[]) => items.join(", ")

function headingsOf(body: string): string[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^#+\s*/, ""))
}

function truncate(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`
}

export function buildGenerationSteps({
  brief,
  title,
  body,
  insights,
  relatedPosts,
}: {
  brief: DraftBrief
  title: string
  body: string
  insights: PostInsights
  /** Titles of posts already in the workspace on the same subject. */
  relatedPosts: string[]
}): GenerationStep[] {
  const headings = headingsOf(body)
  const asked = brief.keywords
  const covered = asked.filter((keyword) =>
    body.toLowerCase().includes(keyword.toLowerCase())
  )
  const missed = asked.filter((keyword) => !covered.includes(keyword))
  const characters = body.length
  const words = body.split(/\s+/).filter(Boolean).length

  return [
    {
      id: "brief",
      running: "Reading the brief",
      done: "Read the brief",
      ms: 700,
      lines: [
        brief.brief
          ? `“${truncate(brief.brief, 160)}”`
          : "No brief — title only",
        `Target length: ${brief.targetCharacters.toLocaleString()} characters`,
        asked.length
          ? `Keywords asked for: ${list(asked)}`
          : "No keywords given — taking them from the brief",
      ],
    },
    {
      id: "workspace",
      running: "Checking what you have already published",
      done: `Checked ${relatedPosts.length || "0"} related post${relatedPosts.length === 1 ? "" : "s"}`,
      ms: 900,
      lines: relatedPosts.length
        ? [
            "Read these so the new draft does not repeat them:",
            ...relatedPosts.map((post) => `· ${post}`),
          ]
        : ["Nothing in the workspace covers this subject yet."],
    },
    {
      id: "keywords",
      running: "Analysing keywords and gaps",
      done: `Found ${insights.workingKeywords.length} working terms, ${insights.gapKeywords.length} gaps`,
      ms: 1100,
      lines: [],
      tagsLabel: "Terms the draft carries:",
      tags: insights.workingKeywords,
      gapTagsLabel: "Terms it does not, and could:",
      gapTags: insights.gapKeywords,
    },
    {
      id: "titles",
      running: "Drafting title options",
      done: `Drafted ${insights.alternateTitles.length + 1} title options`,
      ms: 800,
      lines: [
        `Chosen: ${title}`,
        "Also considered:",
        ...insights.alternateTitles.map((option) => `· ${option}`),
      ],
    },
    {
      id: "outline",
      running: "Outlining sections",
      done: `Outlined ${headings.length} section${headings.length === 1 ? "" : "s"}`,
      ms: 900,
      lines: headings.length
        ? headings.map((heading) => `· ${heading}`)
        : ["Short enough to run without section headings."],
    },
    {
      id: "write",
      running: "Writing the draft",
      done: `Wrote ${characters.toLocaleString()} characters`,
      ms: 1400,
      lines: [
        `${characters.toLocaleString()} characters, ${words.toLocaleString()} words`,
        `Asked for ${brief.targetCharacters.toLocaleString()}`,
        `About a ${Math.max(1, Math.round(words / 220))} minute read`,
      ],
    },
    {
      id: "check",
      running: "Checking it against the brief",
      done: missed.length
        ? `${missed.length} keyword${missed.length === 1 ? "" : "s"} still missing`
        : "Every keyword covered",
      ms: 900,
      lines: [
        asked.length
          ? `Covered ${covered.length} of ${asked.length} keywords you asked for.`
          : "No keywords were asked for, so none were checked.",
        ...(missed.length ? [`Missing: ${list(missed)}`] : []),
        insights.metaDescription
          ? `Meta description: ${truncate(insights.metaDescription, 120)}`
          : "",
      ].filter(Boolean),
    },
  ]
}

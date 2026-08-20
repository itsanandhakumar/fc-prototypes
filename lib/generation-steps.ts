// What the app says it did while a draft was being written.
//
// The steps are no longer a timed animation over work that already finished —
// each one corresponds to a phase the generation endpoint actually emits, and
// the detail under a finished step is read back off the draft that came out.
// Nothing here is invented for the sake of having something to show.

import type { DraftBrief } from "@/lib/draft-generator"
import type { StoredInsights } from "@/lib/db/schema"

/** The phases the streaming endpoint emits, in the order it emits them. */
export const GENERATION_PHASES = [
  "reading-brief",
  "related",
  "writing",
  "analysing",
] as const

export type GenerationPhase = (typeof GENERATION_PHASES)[number]

export type GenerationStep = {
  id: GenerationPhase
  /** Present tense, shown while the step is running. */
  running: string
  /** Past tense, shown once it is done. */
  done: string
  lines: string[]
  tags?: string[]
  tagsLabel?: string
  /** Tags that are gaps rather than hits, so they read as warnings. */
  gapTags?: string[]
  gapTagsLabel?: string
}

const list = (items: string[]) => items.join(", ")

function truncate(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`
}

function headingsOf(body: string): string[] {
  return body
    .split("\n")
    .filter((line) => /^#{2,3}\s/.test(line))
    .map((line) => line.replace(/^#+\s*/, ""))
}

/**
 * The steps as they stand right now. Called on every phase update, so a step
 * with no result yet gets a placeholder detail and fills in once the draft
 * lands.
 */
export function buildGenerationSteps({
  brief,
  relatedPosts,
  body,
  insights,
}: {
  brief: DraftBrief
  /** Titles of posts already in the workspace on the same subject. */
  relatedPosts?: string[]
  /** Both absent until generation finishes. */
  body?: string
  insights?: StoredInsights
}): GenerationStep[] {
  const headings = headingsOf(body ?? "")
  const covered = brief.keywords.filter((keyword) =>
    (body ?? "").toLowerCase().includes(keyword.toLowerCase())
  )
  const missed = brief.keywords.filter((keyword) => !covered.includes(keyword))

  const steps: GenerationStep[] = [
    {
      id: "reading-brief",
      running: "Reading the brief",
      done: "Read the brief",
      lines: [
        brief.brief
          ? `Brief: "${truncate(brief.brief, 160)}"`
          : "No brief given — writing from the title alone.",
        brief.keywords.length
          ? `Must cover: ${list(brief.keywords)}`
          : "No keywords set, so nothing is forced into the draft.",
        `Target length: about ${brief.targetCharacters.toLocaleString()} characters.`,
      ],
    },
    {
      id: "related",
      running: "Checking your other posts",
      done: relatedPosts?.length
        ? `Checked ${relatedPosts.length} related post${relatedPosts.length === 1 ? "" : "s"}`
        : "Checked your workspace",
      lines: relatedPosts?.length
        ? [
            "Already in your workspace on this subject — the draft is written to sit alongside them rather than repeat them:",
            ...relatedPosts.map((post) => `· ${post}`),
          ]
        : ["Nothing in your workspace covers this subject yet."],
    },
    {
      id: "writing",
      running: "Writing the draft",
      done: body
        ? `Wrote ${body.length.toLocaleString()} characters`
        : "Wrote the draft",
      lines: body
        ? [
            headings.length
              ? `Outlined ${headings.length} section${headings.length === 1 ? "" : "s"}: ${list(headings)}`
              : "Written as continuous prose, with no section headings.",
            `Asked for about ${brief.targetCharacters.toLocaleString()} characters; wrote ${body.length.toLocaleString()}.`,
          ]
        : ["The model is drafting the post now."],
    },
  ]

  steps.push({
    id: "analysing",
    running: "Analysing the draft",
    done: insights
      ? `Found ${insights.workingKeywords.length} working terms, ${insights.gapKeywords.length} gaps`
      : "Analysed the draft",
    lines: insights
      ? [
          brief.keywords.length
            ? missed.length
              ? `Of the keywords you asked for, ${list(covered)} made it in; ${list(missed)} did not.`
              : "Every keyword you asked for is in the draft."
            : "No keywords were requested, so coverage was not checked.",
          `Drafted ${insights.alternateTitles.length} alternate title${insights.alternateTitles.length === 1 ? "" : "s"} and ${insights.postIdeas.length} follow-up post idea${insights.postIdeas.length === 1 ? "" : "s"}.`,
        ]
      : ["Reading the finished draft back."],
    tags: insights?.workingKeywords,
    tagsLabel: insights ? "Terms the draft carries:" : undefined,
    gapTags: insights?.gapKeywords,
    gapTagsLabel: insights ? "Terms it does not, and could:" : undefined,
  })

  return steps
}

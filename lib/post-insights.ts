// Mock analysis of a draft. Everything here is derived from the title and the
// body text, so the panel describes the post actually in the editor — no model
// behind it.

import { subjectOf, topicFromTitle } from "@/lib/draft-generator"

export type PostInsights = {
  metaDescription: string
  aiCitable: string
  workingKeywords: string[]
  gapKeywords: string[]
  /** Other ways to head this same post. */
  alternateTitles: string[]
  /** Separate posts, on the subjects this draft leaves out. */
  postIdeas: string[]
}

const STOP_WORDS = new Set([
  // grammar
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "another",
  "any",
  "are",
  "around",
  "as",
  "at",
  "back",
  "be",
  "because",
  "been",
  "before",
  "being",
  "both",
  "but",
  "by",
  "can",
  "cannot",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "done",
  "down",
  "each",
  "even",
  "every",
  "far",
  "few",
  "for",
  "from",
  "get",
  "gets",
  "give",
  "goes",
  "going",
  "good",
  "got",
  "had",
  "has",
  "have",
  "her",
  "here",
  "him",
  "his",
  "how",
  "however",
  "if",
  "in",
  "instead",
  "into",
  "is",
  "it",
  "its",
  "just",
  "keep",
  "less",
  "let",
  "like",
  "long",
  "made",
  "make",
  "makes",
  "many",
  "may",
  "might",
  "more",
  "most",
  "much",
  "must",
  "need",
  "needs",
  "never",
  "new",
  "next",
  "no",
  "not",
  "nothing",
  "now",
  "off",
  "often",
  "on",
  "once",
  "one",
  "only",
  "or",
  "other",
  "others",
  "our",
  "out",
  "over",
  "own",
  "put",
  "rather",
  "really",
  "same",
  "see",
  "she",
  "should",
  "since",
  "so",
  "some",
  "still",
  "such",
  "take",
  "takes",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "things",
  "this",
  "those",
  "through",
  "till",
  "time",
  "to",
  "too",
  "two",
  "under",
  "until",
  "up",
  "upon",
  "use",
  "used",
  "uses",
  "very",
  "want",
  "was",
  "way",
  "ways",
  "we",
  "well",
  "went",
  "were",
  "what",
  "when",
  "where",
  "whether",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "within",
  "without",
  "would",
  "yet",
  "you",
  "your",
  "yours",
  // verbs that lead a headline without naming its subject
  "beat",
  "beats",
  "cost",
  "costs",
  "cut",
  "cuts",
  "knows",
  "tell",
  "tells",
  "told",
  "turn",
  "turns",
  // what is left of a contraction once punctuation is stripped
  "aren",
  "can",
  "couldn",
  "didn",
  "doesn",
  "don",
  "hasn",
  "haven",
  "isn",
  "shouldn",
  "wasn",
  "won",
  "wouldn",
  // leading quantifiers ("Ten Internal Linking Mistakes…") are not the topic
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "hundred",
  "thousand",
])

// Concepts a post in the same territory would be expected to cover. Keyed by a
// word likely to appear in the draft.
const RELATED_CONCEPTS: Record<string, string[]> = {
  link: ["anchor text", "orphan pages", "crawl depth", "redirect chains"],
  linking: ["anchor text", "orphan pages", "crawl depth", "site architecture"],
  links: ["anchor text", "orphan pages", "internal link audits"],
  keyword: ["search intent", "long-tail variants", "keyword cannibalisation"],
  keywords: ["search intent", "long-tail variants", "SERP features"],
  search: ["search intent", "featured snippets", "SERP features"],
  ranking: ["click-through rate", "featured snippets", "position tracking"],
  rankings: ["click-through rate", "featured snippets", "position tracking"],
  traffic: ["click-through rate", "referral sources", "seasonality"],
  content: ["content refresh", "content audit", "topic clusters"],
  posts: ["topic clusters", "content audit", "publishing cadence"],
  post: ["topic clusters", "content pruning", "publishing cadence"],
  draft: ["style guide", "review workflow", "subject-matter interviews"],
  drafts: ["style guide", "review workflow", "editorial standards"],
  meta: ["title tag length", "rich results", "schema markup"],
  description: ["title tag length", "rich results", "snippet testing"],
  schema: ["FAQ markup", "author entities", "structured data testing"],
  markup: ["FAQ markup", "author entities", "structured data testing"],
  audit: ["crawl budget", "index coverage", "redirect chains"],
  refresh: ["historical optimisation", "decay analysis", "content pruning"],
  calendar: ["capacity planning", "publishing cadence", "editorial standards"],
  brief: ["style guide", "subject-matter interviews", "editorial standards"],
  briefs: ["style guide", "subject-matter interviews", "editorial standards"],
  analytics: ["attribution windows", "assisted conversions", "cohort analysis"],
  roi: ["attribution windows", "assisted conversions", "pipeline influence"],
  social: ["distribution channels", "newsletter repurposing", "syndication"],
  cluster: ["pillar pages", "topical authority", "internal link maps"],
  clusters: ["pillar pages", "topical authority", "internal link maps"],
  pillar: ["topical authority", "supporting posts", "internal link maps"],
}

const FALLBACK_CONCEPTS = [
  "search intent",
  "topic clusters",
  "internal linking",
  "content refresh",
  "schema markup",
  "distribution channels",
]

function significantWords(text: string, minLength = 3): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= minLength && !STOP_WORDS.has(word))
}

function topicWords(title: string): string[] {
  // subjectOf drops question openers and leading verbs, so "How to run a
  // content refresh" reduces to "content refresh".
  const words = significantWords(subjectOf(topicFromTitle(title)))
  // "Building an Editorial Calendar…" is about editorial calendars, not about
  // building.
  return words.length > 2 && words[0].endsWith("ing") ? words.slice(1) : words
}

function topicOf(title: string): string {
  return topicWords(title).slice(0, 3).join(" ") || "this topic"
}

function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

const isHeading = (block: string) => block.startsWith("#")
const isListItem = (block: string) => /^([-*]|\d+\.)\s/.test(block)

// Drafts are structured, so the parts that read as prose have to be picked out
// from the headings and lists around them.
function proseOf(blocks: string[]): string[] {
  return blocks.filter((block) => !isHeading(block) && !isListItem(block))
}

function stripMarkup(text: string): string {
  return text.replace(/\*\*/g, "").trim()
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) {
    return text
  }
  const cut = text.slice(0, limit)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Words are matched in lower case, so borrow back the casing the source used —
// otherwise "Content ROI" comes out as "Content Roi".
function asWritten(source: string, phrase: string): string {
  const tokens = source
    .split(/\s+/)
    .map((token) => token.replace(/^[^\w-]+|[^\w-]+$/g, ""))

  return phrase
    .split(" ")
    .map((word) => {
      const original = tokens.find((token) => token.toLowerCase() === word)
      return original && /[A-Z]/.test(original) ? original : titleCase(word)
    })
    .join(" ")
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

// Ranked by how often the body actually uses them, most-used first.
function rankedByUse(values: string[]): string[] {
  const counts = countBy(values)
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([value]) => value)
}

export function getInsights(title: string, body: string): PostInsights {
  const topic = topicOf(title)
  const blocks = paragraphsOf(body)
  const bodyText = body.toLowerCase()

  const headings = blocks.filter(isHeading)
  const subheadings = headings.filter((heading) => heading.startsWith("###"))
  const prose = proseOf(blocks)
  const firstParagraph = stripMarkup(prose[0] ?? "")
  const firstSentence = firstParagraph.split(/(?<=[.!?])\s/)[0] ?? ""
  const hasFaq = /frequently asked|^#+.*\?$/im.test(body)

  const metaDescription = firstSentence
    ? truncate(firstSentence, 155)
    : truncate(`A guide to ${topic}.`, 155)

  const wordCount = body.split(/\s+/).filter(Boolean).length
  const openingLength = firstParagraph.split(/\s+/).filter(Boolean).length

  // What makes a draft liftable is its structure, so describe the structure the
  // body actually has.
  const aiCitable = headings.length
    ? [
        `${wordCount} words under ${headings.length} headings, ${subheadings.length} of them subheadings,`,
        `each answering one question in the ${openingLength} words that follow it.`,
        hasFaq
          ? "The FAQ block is phrased as the questions readers actually type, which is the form answer engines quote verbatim."
          : "An answer engine can lift a heading and the passage beneath it without needing the rest of the post for context.",
      ].join(" ")
    : [
        `The draft answers the question in its first ${openingLength || 0} words, before any setup,`,
        `and breaks into ${prose.length} short paragraph${prose.length === 1 ? "" : "s"} that each make a single claim.`,
        "Adding headings would let an answer engine lift a passage without needing the rest for context.",
      ].join(" ")

  // What the post covers: phrases and terms the body itself leans on, ranked by
  // how much use they get, with the title's topic first.
  const bodyWords = significantWords(body, 4)
  const bodyPhrases = bodyWords
    .slice(0, -1)
    .map((word, index) => `${word} ${bodyWords[index + 1]}`)
  const repeatedPhrases = rankedByUse(bodyPhrases).filter(
    (phrase) => countBy(bodyPhrases).get(phrase)! > 1
  )
  const titlePhrase = significantWords(topicFromTitle(title))
    .slice(0, 2)
    .join(" ")
    .toLowerCase()

  const workingKeywords = [
    ...new Set([
      topic,
      ...(bodyText.includes(titlePhrase) ? [titlePhrase] : []),
      ...repeatedPhrases.slice(0, 2),
      ...rankedByUse(bodyWords).slice(0, 5),
    ]),
  ]
    .filter(Boolean)
    .slice(0, 7)

  // What a reader in the same territory would expect but the body never covers.
  const vocabulary = new Set([...bodyWords, ...significantWords(title)])
  const related = [...vocabulary].flatMap(
    (word) => RELATED_CONCEPTS[word] ?? []
  )
  const missing = [...new Set([...related, ...FALLBACK_CONCEPTS])].filter(
    (concept) => !bodyText.includes(concept.toLowerCase())
  )

  const gapKeywords = missing.slice(0, 6)

  // Framed around the subject the body actually covers. If the body has moved
  // off the title's subject entirely, follow the body instead.
  const subject = topicWords(title).slice(0, 2).join(" ") || topic
  const bodyCoversTitle = topicWords(title).some((term) =>
    bodyText.includes(term)
  )
  const headline = bodyCoversTitle
    ? asWritten(title, subject)
    : asWritten(body, repeatedPhrases[0] ?? bodyPhrases[0] ?? topic)

  const alternateTitles = [
    `The Complete Guide to ${headline}`,
    `What Most Teams Get Wrong About ${headline}`,
    `${headline}: A Practical Walkthrough`,
  ]

  // Built off the gaps rather than the headline: a post worth writing next is
  // one on a subject this draft does not cover, not this one renamed.
  const postIdeas = gapKeywords.slice(0, 3).map((gap, index) => {
    const subjectOfGap = titleCase(gap)
    return [
      `A Practical Guide to ${subjectOfGap}`,
      `Where ${subjectOfGap} Fits Into ${headline}`,
      `${subjectOfGap}: What Most Teams Miss`,
    ][index % 3]
  })

  return {
    metaDescription,
    aiCitable,
    workingKeywords,
    gapKeywords,
    alternateTitles,
    postIdeas,
  }
}

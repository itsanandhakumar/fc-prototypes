// Placeholder generation: a deterministic, structured first draft built from
// the writer's brief. No model behind it yet — what matters for the prototype
// is that the brief actually steers the output: the title, the keywords it has
// to cover, and how long it runs.

/** Character target the writer asks for on the slider. Intervals widen with
 * the value — 100 near the bottom, 500 near the top — and the final stop is
 * open-ended. */
export const CHARACTER_STOPS: Array<{ value: number; label: string }> = [
  ...[200, 300, 400, 500, 600, 700, 800].map((value) => ({
    value,
    label: value.toLocaleString(),
  })),
  ...[1000, 1200, 1400, 1600, 1800, 2000].map((value) => ({
    value,
    label: value.toLocaleString(),
  })),
  { value: 2500, label: "2,500" },
  { value: 3000, label: "3,000" },
  { value: 6000, label: "3,000+" },
]

export const MIN_CHARACTERS = CHARACTER_STOPS[0].value
export const MAX_CHARACTERS = CHARACTER_STOPS[CHARACTER_STOPS.length - 1].value
export const DEFAULT_CHARACTERS = 800

export type DraftTarget = "both" | "seo" | "geo"

export const DRAFT_TARGETS: Array<{ value: DraftTarget; label: string }> = [
  { value: "both", label: "Google + AI answer engines (SEO + GEO)" },
  { value: "seo", label: "Google (SEO)" },
  { value: "geo", label: "AI answer engines (GEO)" },
]

export function parseTarget(value: string | undefined): DraftTarget {
  return value === "seo" || value === "geo" ? value : "both"
}

export type DraftBrief = {
  /** What the post is about, in the writer's own words. */
  brief: string
  /** Optional — a title they already have in mind. */
  title?: string
  /** Terms the draft has to cover. */
  keywords: string[]
  targetCharacters: number
  /** What the draft is written to win: search, answer engines, or both. */
  target: DraftTarget
}

export function parseKeywords(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export function parseTargetCharacters(value: string | undefined): number {
  const asked = Number(value)
  if (!Number.isFinite(asked)) {
    return DEFAULT_CHARACTERS
  }
  return Math.min(MAX_CHARACTERS, Math.max(MIN_CHARACTERS, Math.round(asked)))
}

function toTitle(prompt: string): string {
  // A brief can run to several sentences; the title comes off the first one.
  const firstSentence = prompt.trim().split(/(?<=[.!?])\s/)[0] ?? ""
  const topic = firstSentence
    .replace(/\s+/g, " ")
    .replace(/[?.!]+$/, "")
    .trim()

  if (!topic) {
    return "Untitled post"
  }
  return topic.charAt(0).toUpperCase() + topic.slice(1)
}

// Editorial framing the panel adds to alternate titles. Clicking one of those
// should still produce a draft about the underlying topic, not about the
// framing.
const TITLE_FRAMING = [
  /^the complete guide to\s+/i,
  /^what most teams get wrong about\s+/i,
  /:\s*a practical walkthrough$/i,
]

// Titles arrive in title case; the body reads them mid-sentence.
export function topicFromTitle(title: string): string {
  let topic = title.trim()
  for (const framing of TITLE_FRAMING) {
    topic = topic.replace(framing, "")
  }
  return topic.trim().toLowerCase() || "this topic"
}

// Question and verb openers make a fine title but a poor heading fragment:
// "Why how to run a content refresh matters" does not read. Strip them so
// headings can name the subject directly.
const SUBJECT_OPENERS =
  /^(how do i|how to|how|why|what|when|where|which|should i|the|a|an)\s+/i

const LEADING_VERBS = new Set([
  "audit",
  "avoid",
  "beat",
  "build",
  "choose",
  "cut",
  "do",
  "find",
  "fix",
  "get",
  "handle",
  "keep",
  "make",
  "measure",
  "pick",
  "plan",
  "run",
  "scale",
  "start",
  "stop",
  "structure",
  "turn",
  "use",
  "write",
])

// Words that make a fine sentence but a poor end to a heading fragment.
const TRAILING_FILLER = new Set([
  "affects",
  "and",
  "are",
  "become",
  "becomes",
  "changes",
  "for",
  "from",
  "help",
  "helps",
  "in",
  "is",
  "matter",
  "matters",
  "mean",
  "means",
  "of",
  "on",
  "that",
  "to",
  "which",
  "with",
  "work",
  "works",
])

export function subjectOf(topic: string): string {
  let subject = topic.replace(SUBJECT_OPENERS, "").trim()

  let words = subject.split(/\s+/)
  if (words.length > 1 && LEADING_VERBS.has(words[0])) {
    words = words.slice(1)
  }

  // A whole title makes an unreadable heading — "Why the anchor text problem
  // nobody audits matters" — so keep the leading noun phrase only.
  words = words.slice(0, 3)
  while (words.length > 1 && TRAILING_FILLER.has(words[words.length - 1])) {
    words.pop()
  }

  subject = words
    .join(" ")
    .replace(/^(a|an|the)\s+/i, "")
    .trim()

  return subject || topic
}

// Blocks carry the shortest length that still includes them, so one outline
// serves all three lengths.
type Depth = "short" | "standard" | "long"
type Block = { tier: Depth; text: string }

// Blocks are added shallowest-first until the draft reaches the word target.
const DEPTH_ORDER: Depth[] = ["short", "standard", "long"]

// Length is measured in characters, the unit the slider speaks in.
const countCharacters = (text: string) => text.length

// Topic-agnostic sections used to reach the longer targets once a single
// angle has been exhausted.
const EXTRA_SECTIONS = (subject: string): Block[] => [
  { tier: "long", text: `## What to do in the first week` },
  {
    tier: "long",
    text: `Pick the single narrowest version of the problem and solve it end to end. A complete answer to a small question about ${subject} teaches you more than a partial answer to the whole of it, and it gives the next decision something real to sit on.`,
  },
  {
    tier: "long",
    text: `Write down what you expected before you start, in one sentence. Most of the value in this exercise comes from being able to compare the result against a prediction you cannot quietly revise afterwards.`,
  },
  { tier: "long", text: `## Where this usually stalls` },
  {
    tier: "long",
    text: `Work on ${subject} rarely fails loudly. It stalls when the person carrying it moves on, when the review slot gets used for something more urgent, or when nobody can say what the current state is without opening five documents.`,
  },
  {
    tier: "long",
    text: `The fix is unglamorous: one owner, one page describing where things stand, and a recurring half hour that survives a busy month. Teams that keep those three going outperform teams with better tactics and none of them.`,
  },
  { tier: "long", text: `### A note on tooling` },
  {
    tier: "long",
    text: `Buy tooling once the manual version has proved the value and become the bottleneck. Buying earlier tends to encode a process you have not tested yet, and the tool then becomes the reason nobody revisits the process.`,
  },
  { tier: "long", text: `## How to tell it is working` },
  {
    tier: "long",
    text: `Improvement in this area shows up as fewer surprises rather than a better number. Fewer discoveries that something has been broken for months, fewer decisions nobody can explain, fewer arguments that turn out to be about different definitions of the same word.`,
  },
  {
    tier: "long",
    text: `If the only evidence you have is a chart that went up, wait a quarter before believing it. If people who were sceptical start using the output without being asked, that is the signal worth acting on.`,
  },

  { tier: "long", text: `## Objections worth taking seriously` },
  {
    tier: "long",
    text: `The strongest objection to any of this is cost of attention. Every recurring commitment you add to ${subject} competes with something else that also deserves the slot, and a team that says yes to all of them ends up doing each one badly.`,
  },
  {
    tier: "long",
    text: `The honest answer is that it is worth the slot only if the alternative is drifting. If the current approach is producing results nobody is complaining about, leave it alone and spend the attention where the complaints are.`,
  },
  { tier: "long", text: `### When to stop` },
  {
    tier: "long",
    text: `Stop when the last three reviews produced no decisions. That is the point at which the process has become reporting rather than management, and continuing it costs more in attention than it returns in insight.`,
  },

  { tier: "long", text: `## What good looks like a year in` },
  {
    tier: "long",
    text: `A year of steady work on ${subject} does not look dramatic from the outside. The visible signs are that new people can describe the current state without asking anyone, that the same problems stop recurring, and that decisions get made in the review rather than escalated out of it.`,
  },
  {
    tier: "long",
    text: `Internally it feels like less firefighting. The work that used to arrive as an emergency arrives as an agenda item, which is the entire return on doing any of this deliberately.`,
  },
  {
    tier: "long",
    text: `If none of that has happened after four quarters, the problem is usually ownership rather than method. Someone has been doing the work without the authority to change anything based on it.`,
  },

  { tier: "long", text: `## Handing it over` },
  {
    tier: "long",
    text: `Most of what goes wrong with ${subject} over a long horizon is handover. The person who built the approach leaves, and what they carried in their head — which exceptions matter, which numbers are unreliable, which decisions were deliberate — leaves with them.`,
  },
  {
    tier: "long",
    text: `Write the exceptions down as you go rather than at the end. A short list of "things that look wrong but are intentional" is worth more to the next person than a polished document written from memory in someone's last week.`,
  },

  { tier: "long", text: `## Working with people who disagree` },
  {
    tier: "long",
    text: `Disagreement about ${subject} is usually definitional rather than substantive. Two people arguing about whether it is working are often measuring different things and would agree instantly if they compared definitions first.`,
  },
  {
    tier: "long",
    text: `Before defending a position, write down what evidence would change your mind. If nothing would, the disagreement is about priorities rather than facts, and it belongs in a planning conversation instead of an analytical one.`,
  },
  { tier: "long", text: `### Getting a decision made` },
  {
    tier: "long",
    text: `Bring one recommendation and the two alternatives you rejected, with a sentence each on why. Groups decide faster when the work of narrowing has already been done and their job is to check the reasoning rather than generate options.`,
  },

  { tier: "long", text: `## What to revisit next quarter` },
  {
    tier: "long",
    text: `Put three things on the list: the assumption you are least sure about, the metric you suspect is measuring the wrong thing, and the decision you made under time pressure and never revisited. Those three tend to hold most of the remaining upside.`,
  },
  {
    tier: "long",
    text: `Everything else can wait. A review that tries to re-examine all of ${subject} at once produces a long document and no decisions, which is how quarterly reviews quietly stop happening.`,
  },
]

const VARIANTS: Array<(topic: string, subject: string) => Block[]> = [
  // 1. The practical guide.
  (topic, subject) => [
    {
      tier: "short",
      text: `Most teams treat ${subject} as a box to tick, and it shows in the results. The work gets done once, nobody revisits it, and six months later the same problems are back in the report with nothing to show for the effort.`,
    },
    {
      tier: "standard",
      text: `This piece covers what actually moves the needle on ${topic}: why it matters more than it did two years ago, the three failure modes that account for most wasted effort, and a sequence you can start this week without buying anything new.`,
    },

    { tier: "short", text: `## Why ${subject} matters more than it used to` },
    {
      tier: "short",
      text: `The easy version of this work stopped being enough somewhere around the point where everyone else started doing it too. Doing ${subject} to a baseline standard now buys you parity, not advantage — the gap opens up in the details that are tedious enough that most teams skip them.`,
    },
    {
      tier: "long",
      text: `There is a second reason, and it is the one that tends to get attention internally: the cost of getting it wrong compounds. A single bad decision here is cheap. The same decision repeated across two hundred pages, for a year, is the kind of number that ends up in a board deck.`,
    },

    { tier: "standard", text: `## Where teams go wrong with ${subject}` },
    {
      tier: "standard",
      text: `Almost every failure we see falls into one of three patterns. None of them look like mistakes while they are happening, which is exactly why they survive so long.`,
    },
    { tier: "standard", text: `### Optimising for the wrong unit` },
    {
      tier: "standard",
      text: `The first is measuring the thing that is easy to count instead of the thing that matters. Volume is easy to count. Completeness is not. Teams that track only the countable version end up with a dashboard that improves while the outcome does not.`,
    },
    { tier: "standard", text: `### Treating it as a one-off project` },
    {
      tier: "standard",
      text: `The second is scheduling this as a project with an end date. Work related to ${topic} decays — the ground shifts, the competition moves, and the decisions that were right in January are merely defensible by August. A quarterly review beats a heroic annual overhaul every time.`,
    },
    { tier: "long", text: `### Skipping the boring diagnostic` },
    {
      tier: "long",
      text: `The third is jumping to the fix. Roughly half the effort spent on ${subject} goes into problems that were never worth solving, because nobody spent the two hours up front working out which problems were actually costing anything.`,
    },

    { tier: "standard", text: `## A framework for ${subject}` },
    {
      tier: "standard",
      text: `Work through these in order. The sequence matters more than the sophistication of any single step, and steps three and four are where most of the value sits.`,
    },
    {
      tier: "standard",
      text: `1. **Inventory.** Write down what exists today, with one line per item and a number attached. No decisions yet.`,
    },
    {
      tier: "standard",
      text: `2. **Score.** Rank each item on impact if fixed and effort to fix. Two columns, no weighting formula.`,
    },
    {
      tier: "standard",
      text: `3. **Cut.** Delete the bottom two thirds of the list. This is the step people skip, and skipping it is why the work never finishes.`,
    },
    {
      tier: "standard",
      text: `4. **Fix.** Work the remaining third top-down, shipping each one before starting the next.`,
    },
    {
      tier: "standard",
      text: `5. **Recheck.** Put a date in the calendar six weeks out to see which fixes actually held.`,
    },

    { tier: "long", text: `### What to measure` },
    {
      tier: "long",
      text: `Pick two numbers and ignore the rest for the first quarter. Adding metrics feels like rigour but usually just widens the range of things you can point at when nothing improves.`,
    },
    {
      tier: "long",
      text: `- One leading indicator you can move within a fortnight`,
    },
    {
      tier: "long",
      text: `- One lagging indicator that reflects the business outcome`,
    },
    {
      tier: "long",
      text: `- A written note of what you expect each to do, recorded before you start`,
    },

    { tier: "long", text: `### Who owns it` },
    {
      tier: "long",
      text: `Work on ${subject} that belongs to "the team" belongs to whoever has a quiet week, which means the standard drifts down a notch at a time. One named owner and one recurring review slot fixes more than any amount of process documentation.`,
    },

    { tier: "short", text: `## Getting started with ${subject} this week` },
    {
      tier: "short",
      text: `You do not need a project plan to begin. Block two hours, take the ten highest-traffic items you own, and run the first two steps above on those alone. The exercise will tell you whether the wider effort is worth funding.`,
    },
    { tier: "standard", text: `- Two hours, ten items, two columns` },
    {
      tier: "standard",
      text: `- One decision at the end: worth continuing, or not`,
    },
    {
      tier: "standard",
      text: `- If yes, book the next session before you close the document`,
    },

    { tier: "standard", text: `## Frequently asked questions` },
    { tier: "standard", text: `### How long before ${subject} shows results?` },
    {
      tier: "standard",
      text: `Six to twelve weeks for leading indicators, two quarters for anything that shows up in revenue. If someone promises faster, they are measuring something that does not matter.`,
    },
    { tier: "standard", text: `### Do I need specialist tools for this?` },
    {
      tier: "standard",
      text: `No. A spreadsheet and an afternoon covers the first pass for almost everyone. Buy tooling when the manual version has proved the value and become the bottleneck — not before.`,
    },
    { tier: "long", text: `### How often should we revisit it?` },
    {
      tier: "long",
      text: `Quarterly for the review, annually for the strategy. Anything more frequent turns into reporting theatre; anything less and you are back to the annual overhaul that nobody has time for.`,
    },

    { tier: "short", text: `## Where to go next` },
    {
      tier: "short",
      text: `The honest summary: the leverage in ${topic} is in the cutting, not the doing. Teams that get this right are not working harder than the ones that do not — they are working on a much shorter list.`,
    },
  ],

  // 2. The decision framework.
  (topic, subject) => [
    {
      tier: "short",
      text: `There are two credible ways to approach ${subject}, and most of the disagreement about ${topic} is really people arguing from different situations without saying so. This post lays out both, then says which one to pick and when.`,
    },
    {
      tier: "standard",
      text: `If you are looking for a single recommendation you can apply without thinking, this will be unsatisfying. The trade-off is real and it depends on things only you know about your own constraints.`,
    },

    { tier: "short", text: `## The two approaches` },
    {
      tier: "short",
      text: `Strip away the vocabulary and the choice is between doing this thoroughly and slowly, or doing it lightly and often. Both work. They fail in different ways, which is the useful part.`,
    },
    { tier: "standard", text: `### The thorough approach` },
    {
      tier: "standard",
      text: `Fewer passes, much deeper each time. Everything gets documented, reviewed and signed off. This wins when the cost of a mistake is high, when several teams depend on the output, or when the thing you are working on changes slowly enough that a deep pass stays valid.`,
    },
    {
      tier: "long",
      text: `The failure mode is obvious once you have lived it: the work becomes so expensive to start that it stops happening at all. Six months of no progress, then a scramble.`,
    },
    { tier: "standard", text: `### The light and frequent approach` },
    {
      tier: "standard",
      text: `Small passes, often, with less ceremony. This wins when conditions shift underneath you, when you are still learning what matters, or when the team is small enough that coordination overhead would eat the gains.`,
    },
    {
      tier: "long",
      text: `Its failure mode is drift. Without a periodic deep pass, a hundred small reasonable decisions add up to something nobody would have designed on purpose.`,
    },

    { tier: "standard", text: `## How to tell which one you are in` },
    {
      tier: "standard",
      text: `Three questions settle it in about ten minutes. Answer them honestly rather than aspirationally.`,
    },
    {
      tier: "standard",
      text: `- **How fast does the ground move?** If the answer is measured in weeks, thorough passes will be stale before they ship.`,
    },
    {
      tier: "standard",
      text: `- **How expensive is a wrong call?** If a mistake is quietly absorbed, favour speed. If it is visible externally, favour depth.`,
    },
    {
      tier: "standard",
      text: `- **Who has to agree?** Every additional stakeholder adds fixed cost to each pass, which pushes you toward fewer, deeper ones.`,
    },

    { tier: "long", text: `## What it actually costs` },
    {
      tier: "long",
      text: `Both approaches are usually costed wrong, because people count the work and forget the upkeep. A decision about ${subject} that takes a week to make and an hour a month to maintain is cheaper by the end of the year than one that takes a day and needs constant attention.`,
    },
    {
      tier: "long",
      text: `Cost it over twelve months, not over the sprint. Include the review time, the handover when someone leaves, and the cost of the decision being wrong for the period before anyone notices.`,
    },
    { tier: "long", text: `### The number most teams miss` },
    {
      tier: "long",
      text: `Reversal cost. Some choices here are cheap to undo and some quietly are not. Knowing which kind you are making tells you how much analysis is justified before committing — usually less than people assume for reversible calls, and considerably more for the others.`,
    },

    { tier: "short", text: `## Which one we would pick` },
    {
      tier: "short",
      text: `For most teams reading this: light and frequent, with one deep pass a year. The deep-pass-only teams we have watched spent more and shipped less, and the frequency habit is far easier to build than the discipline of an annual overhaul.`,
    },
    {
      tier: "standard",
      text: `That recommendation flips if your work on ${topic} is externally visible or regulated. Then the cost of a public mistake dominates everything else and you should buy the depth.`,
    },

    { tier: "standard", text: `## Frequently asked questions` },
    { tier: "standard", text: `### Can we run both at once?` },
    {
      tier: "standard",
      text: `Yes, and the good version of this is exactly that: frequent light passes plus one scheduled deep one. What does not work is alternating unpredictably, which gives you the overhead of both and the benefits of neither.`,
    },
    { tier: "long", text: `### How do we know the choice was wrong?` },
    {
      tier: "long",
      text: `You will see it within a quarter. Too thorough and nothing ships; too light and you cannot explain why the current state looks the way it does. Both are visible early if you are honest at the review.`,
    },

    { tier: "short", text: `## Testing the decision cheaply` },
    {
      tier: "short",
      text: `Before committing the whole team, run the approach you are leaning toward on a tenth of the work for six weeks. That is enough to feel the overhead without enough time to do damage, and it turns an argument about ${subject} into something you can settle with evidence.`,
    },
  ],

  // 3. Mistakes first.
  (topic, subject) => [
    {
      tier: "short",
      text: `This is the post I wish someone had handed me before we spent a quarter getting ${subject} wrong. It is organised around the mistakes rather than the method, because the mistakes are where the money went.`,
    },
    {
      tier: "standard",
      text: `Every one of these looked completely reasonable at the time. That is the point — none of them announce themselves, and each one is defensible right up until you add up what it cost.`,
    },

    { tier: "short", text: `## Mistake one: starting from the tactics` },
    {
      tier: "short",
      text: `We opened a document, listed everything we could do about ${topic}, and started at the top. What we never wrote down was what we expected to change. Six weeks in, the work was visibly happening and nobody could say whether it was working.`,
    },
    {
      tier: "standard",
      text: `The fix costs one paragraph: before any of the doing, write the sentence "we will know this worked when ___". If you cannot finish that sentence, you are not ready to start.`,
    },
    { tier: "long", text: `### What we do now` },
    {
      tier: "long",
      text: `Every piece of work related to ${subject} opens with an expected-outcome line and a date to check it. Roughly a third of proposals die at that line, which is the whole value of it.`,
    },

    { tier: "short", text: `## Mistake two: confusing activity with progress` },
    {
      tier: "short",
      text: `Our reporting counted things we had done. It went up every week. The outcome did not move for a full quarter and we did not notice, because the number we were looking at was reliably improving.`,
    },
    {
      tier: "standard",
      text: `Anything you can grind out by working longer hours is an activity metric. Useful for capacity planning, actively misleading as a measure of progress.`,
    },

    { tier: "standard", text: `## Mistake three: no owner` },
    {
      tier: "standard",
      text: `Work on ${subject} sat with "the team", which meant it sat with whoever had a quiet week. Nothing was neglected exactly, but nothing was anyone's problem either, and the standard drifted down a notch at a time.`,
    },
    { tier: "standard", text: `- One named owner, written down` },
    { tier: "standard", text: `- One review slot in the calendar, recurring` },
    {
      tier: "standard",
      text: `- One document everyone else can read without asking`,
    },

    { tier: "long", text: `## Mistake four: skipping the recheck` },
    {
      tier: "long",
      text: `We shipped fixes and moved on. When we finally went back, a meaningful share of them had quietly regressed — some through later changes, some because the original fix had never really worked and nobody had looked closely enough to tell.`,
    },
    {
      tier: "long",
      text: `A recheck six weeks out costs an hour and is the single highest-return habit we picked up from any of this.`,
    },
    { tier: "long", text: `### The regression pattern worth knowing` },
    {
      tier: "long",
      text: `The fixes that regressed were almost all the ones nobody else understood. If a change only makes sense to the person who made it, it will not survive that person's next holiday.`,
    },

    { tier: "standard", text: `## What we would do differently` },
    {
      tier: "standard",
      text: `Given the quarter back, we would spend the first two days on diagnosis and the next two on cutting scope, and start the actual work in week two with a list a third as long.`,
    },
    { tier: "standard", text: `1. Write the expected outcome before the plan` },
    {
      tier: "standard",
      text: `2. Pick one activity metric and one outcome metric, and be honest about which is which`,
    },
    {
      tier: "standard",
      text: `3. Name an owner and a recurring review before any work starts`,
    },
    {
      tier: "standard",
      text: `4. Book the six-week recheck at the same time as the work`,
    },

    { tier: "long", text: `## Frequently asked questions` },
    { tier: "long", text: `### Is any of this specific to ${subject}?` },
    {
      tier: "long",
      text: `The mistakes are not — they show up anywhere work is easy to start and hard to measure. The specifics of the diagnosis are, which is why the two days of looking before deciding matter so much here.`,
    },
    { tier: "long", text: `### What if we have already made all four?` },
    {
      tier: "long",
      text: `Then you are in the normal case. Start with the owner and the review slot; those two alone will surface the others within a month without anyone having to run a formal audit.`,
    },

    { tier: "short", text: `## The short version` },
    {
      tier: "short",
      text: `Decide what success looks like, measure the outcome rather than the effort, give it an owner, and check back in six weeks. Everything else about ${topic} is detail on top of those four.`,
    },
  ],
]

// Each keyword the brief asks for gets its own subheading, so the draft covers
// it rather than name-dropping it once.
function keywordBlocks(keywords: string[], subject: string): Block[] {
  if (!keywords.length) {
    return []
  }

  const blocks: Block[] = [
    { tier: "short", text: `## What this post has to cover` },
    {
      tier: "short",
      text: `The brief calls for ${keywords.length === 1 ? "one angle" : `${keywords.length} angles`} in particular. Each needs to earn its place rather than appear once and disappear.`,
    },
  ]

  for (const keyword of keywords) {
    blocks.push({ tier: "short", text: `### ${keyword}` })
    blocks.push({
      tier: "short",
      text: `Readers searching for ${keyword} have usually already found the surface-level answer and want to know what it costs in practice. Say what ${keyword} changes about ${subject}, give the example you would use in a meeting, and be specific about where it stops applying.`,
    })
  }

  return blocks
}

// Sections that exist because of what the draft is optimised for.
function targetBlocks(target: DraftTarget, subject: string): Block[] {
  const blocks: Block[] = []

  if (target !== "geo") {
    blocks.push({ tier: "short", text: `## Built to rank` })
    blocks.push({
      tier: "short",
      text: `Search rewards a page that answers the query it was written for and nothing else. Before publishing, check that the title, the opening paragraph and the first heading all describe the same intent — most pages about ${subject} lose here rather than on links.`,
    })
    blocks.push({
      tier: "standard",
      text: `- A meta description that names the reader's problem rather than summarising the post`,
    })
    blocks.push({
      tier: "standard",
      text: `- Two or three internal links to the posts a reader would want next, with anchor text that describes the destination`,
    })
    blocks.push({
      tier: "standard",
      text: `- One primary term per heading, and no heading that could sit on any other post`,
    })
  }

  if (target !== "seo") {
    blocks.push({ tier: "short", text: `## Built to be quoted` })
    blocks.push({
      tier: "short",
      text: `Answer engines lift passages, not pages. Each section here should stand on its own: a claim about ${subject}, the evidence for it, and enough context that quoting it in isolation still makes sense.`,
    })
    blocks.push({
      tier: "standard",
      text: `- Answer the question in the first two sentences, before the setup`,
    })
    blocks.push({
      tier: "standard",
      text: `- Phrase headings as the questions readers actually type`,
    })
    blocks.push({
      tier: "standard",
      text: `- Attribute every number, so a model has something to cite alongside the claim`,
    })
  }

  return blocks
}

// The FAQ block is an answer-engine device; a search-only draft drops it.
function withoutFaq(blocks: Block[]): Block[] {
  const start = blocks.findIndex((block) =>
    block.text.startsWith("## Frequently asked questions")
  )
  if (start === -1) {
    return blocks
  }

  const after = blocks.findIndex(
    (block, index) => index > start && block.text.startsWith("## ")
  )

  return after === -1
    ? blocks.slice(0, start)
    : [...blocks.slice(0, start), ...blocks.slice(after)]
}

export function generateBody(brief: DraftBrief, variant = 0): string {
  const title = brief.title?.trim() || toTitle(brief.brief)
  const topic = topicFromTitle(title)
  const subject = subjectOf(topic)

  const first = variant % VARIANTS.length
  const primary = VARIANTS[first](topic, subject)

  // Deeper material from the same angle first; then the remaining angles minus
  // their openings; then the shared sections. Enough to reach long targets
  // without repeating a paragraph.
  const others = VARIANTS.filter((_, index) => index !== first)
    .flatMap((build) => build(topic, subject))
    .filter((block) => block.text.startsWith("#") || block.tier !== "short")

  const closing = primary[primary.length - 1]
  const opening = primary.slice(0, primary.length - 1)

  const ordered = [
    ...DEPTH_ORDER.flatMap((depth) =>
      opening.filter((block) => block.tier === depth)
    ),
    ...targetBlocks(brief.target, subject),
    ...EXTRA_SECTIONS(subject),
    ...others,
  ]

  // Keywords were asked for explicitly and the closing ends the piece, so both
  // are always included. The optimisation sections are earned like any other
  // material — otherwise the short end of the slider could never be short.
  const keywords = keywordBlocks(brief.keywords, subject)
  const fixed = [...keywords, closing]
  const fixedCharacters = fixed.reduce(
    (total, block) => total + countCharacters(block.text),
    0
  )

  // Angles share some material, so the pool is deduped before filling.
  const seen = new Set(fixed.map((block) => block.text))
  const chosen: Block[] = []
  let characters = fixedCharacters
  for (const block of ordered) {
    if (characters >= brief.targetCharacters) {
      break
    }
    if (seen.has(block.text)) {
      continue
    }
    seen.add(block.text)
    chosen.push(block)
    characters += countCharacters(block.text)
  }

  const blocks =
    brief.target === "seo"
      ? withoutFaq([...chosen, ...fixed])
      : [...chosen, ...fixed]

  return blocks
    .map((block) => block.text)
    .join("\n\n")
    .trim()
}

export function generateDraft(
  brief: DraftBrief,
  variant = 0
): { title: string; body: string } {
  const title = brief.title?.trim() || toTitle(brief.brief)
  return { title, body: generateBody(brief, variant) }
}

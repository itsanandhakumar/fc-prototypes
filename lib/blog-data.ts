// Mock content for the prototype. `updatedMinutesAgo` is a fixed offset rather
// than a real timestamp so the server and client render the same string.

import type { PublishSettings } from "@/lib/blog-publish"
import { generateBody, type DraftBrief } from "@/lib/draft-generator"

export type PostStatus = "Published" | "Draft"

export type BlogPost = {
  id: string
  title: string
  status: PostStatus
  updatedMinutesAgo: number
  body: string
  /** The instructions this draft was written from, kept so the editor can
      always show how the post was made. */
  brief?: DraftBrief
  /** What it was last published with, so publishing it again opens on those
      answers rather than working them out from scratch. Absent until it has
      been published at least once. */
  publish?: PublishSettings
}

// Each entry's `body` is the post's own opening — the part worth writing by
// hand. The rest of the article is built from it below.
const SEED_POSTS: BlogPost[] = [
  {
    id: "pillar-page-topical-authority",
    title: "How to Structure a Pillar Page for Topical Authority",
    status: "Draft",
    updatedMinutesAgo: 25,
    body: "A pillar page only earns its keep when the cluster around it is genuinely useful on its own. Start by mapping the questions a reader asks before, during, and after the one your pillar answers.\n\nEach of those questions becomes a supporting post, and each supporting post links back with the same anchor phrasing. The pillar itself stays broad — it should read like an orientation, not a summary.",
  },
  {
    id: "q3-content-performance",
    title: "Q3 Content Performance: What Moved the Needle",
    status: "Published",
    updatedMinutesAgo: 180,
    body: "Three of our four best-performing posts this quarter were refreshes, not new work. That is the second quarter in a row where updating beat publishing, and it is starting to look less like a fluke.\n\nThe outlier was the comparison piece, which pulled traffic from a query we did not target on purpose. We are treating that as a hint rather than a strategy.",
  },
  {
    id: "internal-linking-mistakes",
    title: "Ten Internal Linking Mistakes That Quietly Cost You Rankings",
    status: "Published",
    updatedMinutesAgo: 1500,
    body: 'Most internal linking problems are not missing links — they are links pointing at the wrong level of the site. A post that links up to a category page instead of across to a sibling post wastes the signal.\n\nThe other common failure is anchor text that describes the link rather than the destination. "Read more" tells a crawler nothing about what is on the other side.',
  },
  {
    id: "meta-descriptions-clicks",
    title: "Writing Meta Descriptions People Actually Click",
    status: "Published",
    updatedMinutesAgo: 2900,
    body: "A meta description is not a summary. It is the sentence that has to win against nine other sentences on the same screen.\n\nThe ones that work tend to name the reader's problem in the first six words and leave the resolution just out of reach. The ones that fail restate the title in longer form.",
  },
  {
    id: "content-refresh-framework",
    title: "A Practical Framework for Content Refreshes",
    status: "Draft",
    updatedMinutesAgo: 4320,
    body: "Refreshing everything is as bad as refreshing nothing. Score each post on traffic trend, position volatility, and how wrong the content has become since it shipped.\n\nAnything scoring high on all three goes in the queue. Everything else waits, and most of it waits forever, which is fine.",
  },
  {
    id: "blog-traffic-plateau",
    title: "Why Your Blog Traffic Plateaued (And How to Fix It)",
    status: "Published",
    updatedMinutesAgo: 7200,
    body: "Plateaus almost always trace back to publishing into a topic you have already saturated. The tenth post about the same subject competes with your own nine, not with anyone else's.\n\nThe fix is lateral, not deeper: find the adjacent problem your reader has and write about that instead.",
  },
  {
    id: "keyword-clustering",
    title: "Keyword Clustering Without Expensive Tools",
    status: "Published",
    updatedMinutesAgo: 8640,
    body: "You can cluster a few hundred keywords with a spreadsheet and an afternoon. Group by the page that already ranks for each term, then look at what falls into the same bucket.\n\nTerms that share a ranking page share intent, whatever the volume tool says. That is the whole trick.",
  },
  {
    id: "fewer-longer-posts",
    title: "The Case for Fewer, Longer Posts",
    status: "Published",
    updatedMinutesAgo: 10080,
    body: "Publishing cadence is the easiest thing to measure and the least useful thing to optimize. Four posts a month that nobody finishes is worse than one that gets cited.\n\nLength is not the point either — completeness is. A short post that fully answers the question beats a long one that circles it.",
  },
  {
    id: "support-tickets-to-topics",
    title: "Turning Customer Support Tickets Into Blog Topics",
    status: "Published",
    updatedMinutesAgo: 13000,
    body: "Your support queue is a list of things people could not figure out, written in their own words. That is a keyword research tool most teams already own and never open.\n\nSort by ticket volume, then by how long each takes to resolve. The expensive-and-frequent quadrant is your editorial calendar.",
  },
  {
    id: "time-to-publish",
    title: "How We Cut Time-to-Publish From Three Weeks to Four Days",
    status: "Published",
    updatedMinutesAgo: 20160,
    body: "The bottleneck was never writing. It was the four days a draft sat waiting for a review that took twenty minutes.\n\nWe gave reviewers a deadline and a default: no response in 48 hours means approved. Time-to-publish fell by more than half and nothing broke.",
  },
  {
    id: "schema-markup-field-guide",
    title: "Schema Markup for Blog Content: A Field Guide",
    status: "Draft",
    updatedMinutesAgo: 25000,
    body: "Article schema is table stakes. The markup that actually changes how a post appears is FAQ, HowTo, and author markup tied to a real, verifiable person.\n\nValidate before you ship, and validate again after your CMS touches the template. Half of all broken schema is a CMS escaping a quote.",
  },
  {
    id: "intent-beats-volume",
    title: "Reader Intent Beats Search Volume Every Time",
    status: "Published",
    updatedMinutesAgo: 30240,
    body: "A term with 200 searches a month and one clear intent converts better than a 20,000-volume head term that means four different things.\n\nRank the terms you can actually satisfy completely. Volume tells you how many people asked; intent tells you whether your answer is the one they wanted.",
  },
  {
    id: "editorial-calendar",
    title: "Building an Editorial Calendar Your Team Will Actually Use",
    status: "Published",
    updatedMinutesAgo: 40320,
    body: "Calendars fail when they track dates instead of states. Writers do not need to know that a post is due Thursday — they need to know it is blocked on a review.\n\nModel the pipeline as stages with owners. The dates take care of themselves once nothing is silently stuck.",
  },
  {
    id: "analytics-blind-spots",
    title: "What Analytics Won't Tell You About Content Quality",
    status: "Published",
    updatedMinutesAgo: 50000,
    body: "Time on page cannot distinguish a reader who is absorbed from one who is confused. Scroll depth cannot tell you whether the thing they scrolled past was any good.\n\nThe only reliable quality signal we have found is whether other people link to it without being asked.",
  },
  {
    id: "anatomy-of-a-ranking-post",
    title: "The Anatomy of a Post That Ranks for Twelve Months",
    status: "Published",
    updatedMinutesAgo: 60480,
    body: "Posts with real staying power tend to answer a question whose correct answer does not change. Tooling posts decay; principle posts do not.\n\nThey also tend to be updated two or three times in the first year, which is less about freshness signals and more about the author still caring.",
  },
  {
    id: "repurposing-long-form",
    title: "Repurposing Long-Form Posts Into Social Threads",
    status: "Published",
    updatedMinutesAgo: 70560,
    body: "A good thread is not a summary of the post — it is the strongest single argument from the post, extracted and sharpened.\n\nIf a reader could get everything from the thread, the post has no reason to exist. Leave the evidence behind and link to it.",
  },
  {
    id: "audit-two-hundred-posts",
    title: "How to Audit Two Hundred Blog Posts in a Week",
    status: "Published",
    updatedMinutesAgo: 80640,
    body: "Export everything first: URL, publish date, last update, sessions, and current position. Do not open a single post until the spreadsheet is sorted.\n\nMost of the two hundred need no decision at all. The audit is really about finding the thirty that do.",
  },
  {
    id: "headline-formulas",
    title: "Headline Formulas We Stopped Using in 2026",
    status: "Published",
    updatedMinutesAgo: 90000,
    body: "The number-plus-noun formula still works, which is exactly why every result on the page uses it. Sameness is now the cost of the format.\n\nWe stopped using curiosity gaps entirely. They earn the click and lose the reader in the first paragraph.",
  },
  {
    id: "sme-replies",
    title: "Getting Subject-Matter Experts to Reply to Your Drafts",
    status: "Published",
    updatedMinutesAgo: 120000,
    body: 'Experts do not ignore your draft because they are busy. They ignore it because "any thoughts?" is not a task.\n\nAsk three specific questions with line numbers attached. Reply rates went from roughly one in four to nearly every time.',
  },
  {
    id: "content-briefs",
    title: "Content Briefs That Writers Don't Ignore",
    status: "Published",
    updatedMinutesAgo: 150000,
    body: "A brief that lists keywords is a requirements document. A brief that explains who is reading and what they already tried is an argument the writer can build on.\n\nInclude the two sources you want cited and the one claim you want challenged. Everything else is negotiable.",
  },
  {
    id: "consolidating-posts",
    title: "When to Consolidate Two Competing Posts",
    status: "Published",
    updatedMinutesAgo: 180000,
    body: "Two posts competing for one query is not always a problem worth fixing. Check whether they rank for genuinely different long-tail sets first.\n\nWhen you do consolidate, keep the older URL — it usually carries the links — and fold the better writing into it rather than the other way round.",
  },
  {
    id: "defense-of-the-faq",
    title: "A Short Defense of the Humble FAQ Section",
    status: "Published",
    updatedMinutesAgo: 220000,
    body: "FAQ sections got a bad reputation because they were used to stuff keywords into thin pages. Used honestly, they are the only place a post can answer the small questions without derailing its argument.\n\nWrite them last, from the questions readers actually sent you.",
  },
  {
    id: "content-roi",
    title: "Measuring Content ROI Without a Data Team",
    status: "Published",
    updatedMinutesAgo: 260000,
    body: "You do not need attribution modelling to know whether content is working. Track assisted signups and the share of sales calls where a prospect mentions a specific post.\n\nBoth are crude. Both are directionally right, which is more than most dashboards manage.",
  },
  {
    id: "first-year-of-blogging",
    title: "Our First Year of Blogging: Everything We Got Wrong",
    status: "Published",
    updatedMinutesAgo: 300000,
    body: "We published too often, about too many things, for an audience we had not defined. Roughly eighty percent of that first year's output has since been deleted or merged.\n\nThe posts that survived all had one thing in common: we wrote them because someone had asked us the question directly.",
  },
]

// An existing post should read like something the editor produced: the
// hand-written opening, then the same structured sections a generated draft
// gets. Lengths and angles vary so the library does not read as one template.
function withSections(post: BlogPost, index: number): BlogPost {
  // Kept on the post afterwards: these are the real instructions the body was
  // built from, so the run the editor reads back is not a reconstruction.
  const brief: DraftBrief = {
    brief: post.title,
    title: post.title,
    keywords: [],
    // Character equivalents of the ~900 / ~600 word seeds.
    targetCharacters: index % 3 === 0 ? 5400 : 3600,
    target: "both",
  }

  const generated = generateBody(brief, index % 3)

  // Drop the generator's own opening — this post already has one.
  const firstHeading = generated.indexOf("## ")
  const sections =
    firstHeading === -1 ? "" : generated.slice(firstHeading).trim()

  return {
    ...post,
    body: [post.body, sections].filter(Boolean).join("\n\n"),
    brief,
  }
}

export const blogPosts: BlogPost[] = SEED_POSTS.map(withSections)

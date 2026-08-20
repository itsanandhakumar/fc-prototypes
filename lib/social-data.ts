// Mock content for the Socials prototype. `updatedMinutesAgo` is a fixed offset
// rather than a real timestamp so the server and client render the same string —
// the same trick `lib/blog-data.ts` uses, and the reason nothing here needs a
// clock.

import { findPlatform } from "@/lib/connectors"
import { trimTo } from "@/lib/social-draft"

export type SocialStatus = "Draft" | "Scheduled" | "Published" | "Failed"

export type VariantMetrics = {
  impressions: number
  likes: number
  comments: number
  reposts: number
}

/** One platform's copy. The variant is the unit that gets posted, so the
    numbers hang off it rather than off the post: the summary can add them up
    for a sense of volume, but only the per-platform figures are a like-for-like
    measurement — each network counts an impression its own way. */
export type SocialVariant = {
  platformId: string
  text: string
  /** Published only. */
  metrics?: VariantMetrics
  /** Why this platform rejected it. One variant can fail while its siblings
      go out fine, which is why this sits here rather than on the post. */
  failure?: string
}

export type SocialPost = {
  id: string
  /** An internal label. Never posted — X has no title field. */
  name: string
  status: SocialStatus
  updatedMinutesAgo: number
  /** Scheduled only. Counts forward the way updatedMinutesAgo counts back. */
  scheduledInMinutes?: number
  variants: SocialVariant[]
}

const MINUTES_PER_DAY = 60 * 24

/** Days back, plus an hour offset so two posts on the same day do not sort as
    a tie. */
function daysAgo(days: number, hours = 9): number {
  return days * MINUTES_PER_DAY + hours * 60
}

/** The same arithmetic pointing forwards, for something not out yet. Named for
    the direction because a count of minutes reads very differently depending on
    which way it runs. */
function daysAhead(days: number, hours = 9): number {
  return daysAgo(days, hours)
}

// The seed carries the part worth writing by hand — one master text per post.
// The per-platform variants are shaped from it below.
type Seed = {
  id: string
  name: string
  status: SocialStatus
  updatedMinutesAgo: number
  scheduledInMinutes?: number
  /** Which platform rejected it, and why. Scheduled/Failed only. */
  failure?: { platformId: string; reason: string }
  master: string
}

// Spread across roughly four weeks back and three forward, so a month view has
// something on most days and the weeks either side of today are not empty.
//
// Published posts start on days 0,1,1,2,3,4 — five consecutive days back for
// the streak — then skip day 5 deliberately, because the gap is what stops the
// streak and a streak that never stops is not measuring anything. Day 1 carries
// two so the activity bars have a height to compare against; with one post
// every day they would only ever read as posted / not posted.
//
// Failed posts are rare on purpose. A queue where a tenth of everything broke
// would be a story about a broken integration rather than about a content
// plan, and the red would carry the eye off the work.
const SOCIAL_SEED: Seed[] = [
  {
    id: "content-calendars-fail",
    name: "Why most content calendars fail",
    status: "Published",
    updatedMinutesAgo: daysAgo(0, 8),
    master:
      'Most teams treat the content calendar as a scheduling tool. It is a decision log.\n\nThe date a post goes out is the least interesting thing on the row. What matters is who owns it, what it is blocked on, and what you expected it to do. Track those and the dates take care of themselves.\n\nWe stopped asking "what ships Thursday" and started asking "what is stuck". Time-to-publish halved in a quarter.',
  },
  {
    id: "three-post-rule",
    name: "The three-post rule",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 10),
    master:
      "Before any launch we write three posts: the problem, the decision, the result.\n\nIf we cannot write the third one honestly, the launch is not ready. It is the cheapest go/no-go test we have, and it costs an afternoon.\n\nThe posts are a side effect. The argument they force is the point.",
  },
  {
    id: "one-good-thread",
    name: "One good thread beats five",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 16),
    master:
      "We used to post five times a week. Now it is two, and both get read.\n\nThe five were mostly restating each other in different words, which is what happens when the cadence is the goal rather than the argument.",
  },
  {
    id: "refresh-beats-publish",
    name: "Refreshing beats publishing",
    status: "Published",
    updatedMinutesAgo: daysAgo(2, 14),
    master:
      "Three of our four best-performing posts this quarter were refreshes, not new work.\n\nSecond quarter in a row. At some point that stops being a fluke and starts being the strategy.\n\nThe uncomfortable part: it means the backlog matters more than the calendar, and the backlog is nobody's favourite meeting.",
  },
  {
    id: "search-intent-quickly",
    name: "Search intent, quickly",
    status: "Published",
    updatedMinutesAgo: daysAgo(3, 11),
    master:
      "A term with 200 searches and one clear intent beats a 20,000-volume term that means four different things.\n\nVolume tells you how many people asked. Intent tells you whether your answer is the one they wanted. Only one of those is actionable this week.",
  },
  {
    id: "support-tickets-topics",
    name: "Support tickets are an editorial calendar",
    status: "Published",
    updatedMinutesAgo: daysAgo(4, 9),
    master:
      "Your support queue is a list of things people could not figure out, written in their own words.\n\nThat is a keyword research tool most teams already own and never open. Sort by volume, then by how long each takes to resolve. The expensive-and-frequent quadrant is your next quarter.",
  },
  {
    id: "shorter-review-cycles",
    name: "The review was never the bottleneck",
    status: "Published",
    updatedMinutesAgo: daysAgo(6, 15),
    master:
      "The bottleneck was never writing. It was the four days a draft sat waiting for a review that took twenty minutes.\n\nWe gave reviewers a deadline and a default: no response in 48 hours means approved. Nothing broke. Time-to-publish fell by more than half.",
  },
  {
    id: "meta-descriptions-click",
    name: "Meta descriptions people actually click",
    status: "Published",
    updatedMinutesAgo: daysAgo(8, 12),
    master:
      "A meta description is not a summary. It is the sentence that has to win against nine other sentences on the same screen.\n\nThe ones that work name the reader's problem in the first six words and leave the resolution just out of reach. The ones that fail restate the title in longer form.",
  },
  {
    id: "internal-linking-level",
    name: "Internal links point the wrong way",
    status: "Published",
    updatedMinutesAgo: daysAgo(9, 10),
    master:
      "Most internal linking problems are not missing links. They are links pointing at the wrong level of the site.\n\nA post that links up to a category page instead of across to a sibling post wastes the signal entirely. Check the direction before you check the count.",
  },
  {
    id: "fewer-longer-posts",
    name: "Fewer, longer posts",
    status: "Published",
    updatedMinutesAgo: daysAgo(11, 13),
    master:
      "Publishing cadence is the easiest thing to measure and the least useful thing to optimise.\n\nFour posts a month nobody finishes is worse than one that gets cited. Length is not the point either — completeness is.",
  },
  {
    id: "keyword-clustering-cheap",
    name: "Keyword clustering without the tools",
    status: "Published",
    updatedMinutesAgo: daysAgo(13, 9),
    master:
      "You can cluster a few hundred keywords with a spreadsheet and an afternoon.\n\nGroup by the page that already ranks for each term, then look at what falls into the same bucket. Terms that share a ranking page share intent, whatever the volume tool says.",
  },
  {
    id: "pillar-page-thread",
    name: "Pillar pages — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(0, 16),
    master:
      "A pillar page only earns its keep when the cluster around it is genuinely useful on its own.\n\nStart by mapping the questions a reader asks before, during, and after the one your pillar answers. Each becomes a supporting post.",
  },
  {
    id: "analytics-wont-tell-you",
    name: "What analytics won't tell you — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(2, 17),
    master:
      "Analytics will tell you which post got read. It will not tell you which post got believed.\n\nThe second one is the whole job, and the only proxy we have found is whether anyone quotes it back to you unprompted.",
  },
  {
    id: "cadence-vs-argument",
    name: "Cadence vs argument",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(0, 12),
    scheduledInMinutes: 3 * 60,
    master:
      "Nobody has ever subscribed to a cadence. They subscribe to an argument they want to hear the next instalment of.\n\nIf you cannot say what yours is in a sentence, posting more often will not fix it.",
  },
  {
    id: "audit-before-you-write",
    name: "Audit before you write",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(1, 9),
    scheduledInMinutes: 2 * 24 * 60,
    master:
      "Two hours with a spreadsheet beats two weeks of writing into a gap that was never there.\n\nList what you already have, score it on impact and effort, and delete the bottom two thirds before you write a word.",
  },
  {
    id: "search-intent-rejected",
    name: "Search intent, quickly — repost",
    status: "Failed",
    updatedMinutesAgo: daysAgo(0, 7),
    failure: { platformId: "x", reason: "X rejected the post — rate limited" },
    master:
      "A term with 200 searches and one clear intent beats a 20,000-volume term that means four different things.\n\nVolume tells you how many people asked. Intent tells you whether your answer is the one they wanted.",
  },

  // Further back, filling out the weeks behind today.
  {
    id: "brief-is-the-deliverable",
    name: "The brief is the deliverable",
    status: "Published",
    updatedMinutesAgo: daysAgo(7, 14),
    master:
      "Half the value of a brief is that somebody had to decide what the post argues before anyone wrote a word.\n\nThe draft is downstream of that decision. Skip it and you get a well-made post about nothing in particular, which is the most expensive kind.",
  },
  {
    id: "nobody-reads-the-second-half",
    name: "Nobody reads the second half",
    status: "Published",
    updatedMinutesAgo: daysAgo(10, 11),
    master:
      "Scroll depth on our longest posts falls off a cliff around 40%.\n\nWe stopped treating that as a formatting problem and started reading it as a signal: the post was two posts, and only one of them was ready.",
  },
  {
    id: "algorithm-writing",
    name: "Stop writing for the algorithm",
    status: "Published",
    updatedMinutesAgo: daysAgo(12, 16),
    master:
      "Every platform's ranking changes twice a year. What people find useful does not.\n\nWrite for the second one and you get to keep the work.",
  },
  {
    id: "calendar-is-a-queue",
    name: "A calendar cannot tell you whether",
    status: "Published",
    updatedMinutesAgo: daysAgo(15, 10),
    master:
      "A calendar tells you when. It has nothing to say about whether.\n\nWe run ours as a queue with a why column, and the why column is the only part anyone argues about — which is how you know it is the part doing the work.",
  },
  {
    id: "repurposing-not-recycling",
    name: "Repurposing is not recycling",
    status: "Published",
    updatedMinutesAgo: daysAgo(17, 15),
    master:
      "Cutting a post into ten social posts gives you ten worse posts.\n\nTaking the one argument inside it and making it stand on its own gives you one good one. The difference is whether you kept the reasoning or only the sentences.",
  },
  {
    id: "headline-owes-the-reader",
    name: "What a headline owes the reader",
    status: "Published",
    updatedMinutesAgo: daysAgo(19, 9),
    master:
      "A headline is a promise about what the next two minutes are worth.\n\nWhen the post does not pay it back, the click cost you more than it earned. Do that often enough and the next headline is not believed either.",
  },
  {
    id: "distribution-is-not-a-phase",
    name: "Distribution is not a phase",
    status: "Published",
    updatedMinutesAgo: daysAgo(21, 13),
    master:
      "Publishing and distributing are one job done at one time, or the second half quietly does not happen.\n\nEvery post we shipped without a plan for who would see it has performed exactly as well as that suggests.",
  },
  {
    id: "write-the-faq-first",
    name: "Write the FAQ first",
    status: "Published",
    updatedMinutesAgo: daysAgo(24, 12),
    master:
      "The questions people ask before they buy are the outline of the post you should have written.\n\nSales calls are full of them, and almost nobody is taking notes.",
  },
  {
    id: "one-honest-number",
    name: "One honest number",
    status: "Published",
    updatedMinutesAgo: daysAgo(26, 8),
    master:
      "Pick the one number you would defend in a room full of sceptics, and report that.\n\nA dashboard with fourteen metrics is a dashboard nobody has read since the week it was built.",
  },

  // Drafts, on the days they were written.
  {
    id: "technical-seo-eighty-twenty",
    name: "The 80/20 of technical SEO — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(1, 14),
    master:
      "Most technical SEO work is worth doing once and then leaving alone.\n\nThe exceptions are the two that break silently: internal links to pages that no longer exist, and templates that quietly stop rendering the thing you optimised.",
  },
  {
    id: "why-we-killed-the-newsletter",
    name: "Why we killed the newsletter — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(3, 15),
    master:
      "Nine thousand subscribers and a 12% open rate is not an audience, it is a list.\n\nWe stopped sending and asked the people who replied what they actually wanted. It was not a weekly digest.",
  },
  {
    id: "interviewing-for-copy",
    name: "Interviewing customers for copy — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(5, 11),
    master:
      "The best line in our homepage came out of a customer call verbatim.\n\nYou cannot write your way to it. You can only notice it when somebody says it and have the sense to write it down.",
  },
  {
    id: "myth-of-evergreen",
    name: "The myth of evergreen — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(7, 18),
    master:
      "Nothing is evergreen. Some things just decay slowly enough that you stop noticing.\n\nPut a review date on every post at the moment you publish it, or the decay is invisible until the traffic is gone.",
  },
  {
    id: "editing-is-thinking",
    name: "Editing is thinking — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(9, 16),
    master:
      "If the edit is only touching sentences, the thinking was finished before it started — or it never started.\n\nThe edits that matter cut whole paragraphs, and they hurt for exactly that reason.",
  },
  {
    id: "what-to-do-with-a-dead-post",
    name: "What to do with a dead post — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(12, 10),
    master:
      "A post with no traffic is either wrong, invisible, or about nothing anyone wanted.\n\nThose need three different fixes, and rewriting the intro is not any of them.",
  },
  {
    id: "ghostwriting-for-founders",
    name: "Ghostwriting for founders — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(15, 17),
    master:
      "Writing in someone else's voice works when you have their opinions, not their vocabulary.\n\nTwenty minutes of arguing with them beats an hour of studying their old posts.",
  },
  {
    id: "content-debt-audit",
    name: "The content debt audit — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(18, 13),
    master:
      "Every post you keep is a post somebody has to maintain, redirect, or defend one day.\n\nWe audit once a quarter and delete more than we publish. The traffic has gone up every time, which still surprises people.",
  },

  // Scheduled, on the days they are due.
  {
    id: "one-number-per-post",
    name: "One number per post",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(0, 10),
    scheduledInMinutes: daysAhead(1, 9),
    master:
      "Every post should carry exactly one number you would stake something on.\n\nMore than that and the reader picks whichever one suits them. Fewer and they have no reason to believe any of it.",
  },
  {
    id: "the-follow-up-nobody-writes",
    name: "The follow-up nobody writes",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(1, 11),
    scheduledInMinutes: daysAhead(4, 15),
    master:
      "The post that says what happened six months after the advice is the one people remember.\n\nAlmost nobody writes it, because by then the team has moved on and the answer is often embarrassing.",
  },
  {
    id: "comments-are-the-second-draft",
    name: "Comments are the second draft",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(1, 14),
    scheduledInMinutes: daysAhead(5, 10),
    master:
      "The objection in the comments is the paragraph you should have written.\n\nWe keep a file of them. Half of next quarter's posts are already in it.",
  },
  {
    id: "against-the-listicle",
    name: "Against the listicle",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(2, 9),
    scheduledInMinutes: daysAhead(7, 13),
    master:
      "Eleven tips is what you write when you have not decided which one is true.\n\nPick the one you would defend on a call and spend the whole post earning it.",
  },
  {
    id: "picking-what-not-to-write",
    name: "How we pick what not to write",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(2, 16),
    scheduledInMinutes: daysAhead(9, 11),
    master:
      "Every idea goes in the queue. Nothing leaves it until somebody can say who it is for and what they do differently after reading it.\n\nMost ideas die at the second half of that sentence, which is the point.",
  },
  {
    id: "the-quarterly-cull",
    name: "The quarterly cull",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(3, 14),
    scheduledInMinutes: daysAhead(11, 16),
    master:
      "Once a quarter we read the whole library and delete anything we would not send to a customer today.\n\nIt takes a day. It is the highest-leverage day in the quarter and the only one nobody volunteers for.",
  },
  {
    id: "say-the-unpopular-thing",
    name: "Say the unpopular thing",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(4, 10),
    scheduledInMinutes: daysAhead(14, 9),
    master:
      "A post everyone agrees with has told them nothing they did not already think.\n\nThe risk is not being wrong. It is being unremarkable, and that one is certain.",
  },
  {
    id: "best-post-is-two-years-old",
    name: "Your best post is two years old",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(4, 17),
    scheduledInMinutes: daysAhead(16, 14),
    master:
      "Ours is, and it has been for three quarters running.\n\nThat is either a compliment to the old post or an indictment of everything since. We have stopped pretending it is only the first one.",
  },
  {
    id: "a-brief-is-a-bet",
    name: "A brief is a bet",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(5, 12),
    scheduledInMinutes: daysAhead(19, 10),
    master:
      "Write down what you expect the post to do before you write the post.\n\nYou will be wrong most of the time, and the record of how you were wrong is worth more than the posts.",
  },

  // The other failure. A handful in eighty is the point: rare enough that red
  // means something when it appears.
  {
    id: "one-honest-number-repost",
    name: "One honest number — repost",
    status: "Failed",
    updatedMinutesAgo: daysAgo(8, 15),
    failure: {
      platformId: "linkedin",
      reason: "LinkedIn rejected the post — duplicate content",
    },
    master:
      "Pick the one number you would defend in a room full of sceptics, and report that.\n\nA dashboard with fourteen metrics is a dashboard nobody has read since the week it was built.",
  },

  // A second pass over the same weeks, doubling up on days so the busy ones
  // are visibly busier than the quiet ones — a month where every day carries
  // exactly one post tells you nothing about where the work actually piles up.
  {
    id: "second-draft-is-the-job",
    name: "The second draft is the job",
    status: "Published",
    updatedMinutesAgo: daysAgo(0, 6),
    master:
      "Nobody writes a good first draft. The people who look like they do are editing faster than you can see.\n\nWe budget two hours for writing and four for cutting, and the ratio has never once been wrong.",
  },
  {
    id: "nobody-wants-your-ebook",
    name: "Nobody wants your ebook",
    status: "Published",
    updatedMinutesAgo: daysAgo(2, 9),
    master:
      "A gated PDF converts the people who were already going to talk to you, and annoys everyone else.\n\nWe put ours on a page, ungated. Sign-ups went down and sales conversations went up, which was the trade we wanted.",
  },
  {
    id: "read-the-losing-posts",
    name: "Read the losing posts",
    status: "Published",
    updatedMinutesAgo: daysAgo(3, 8),
    master:
      "Everyone reviews the top ten. The bottom ten is where the pattern is.\n\nOurs were all written for a reader we could not name in one sentence.",
  },
  {
    id: "seo-is-a-channel",
    name: "SEO is a channel, not a strategy",
    status: "Published",
    updatedMinutesAgo: daysAgo(4, 18),
    master:
      "Ranking is how people find the post. It has nothing to say about whether the post was worth finding.\n\nTeams that confuse the two write for the index and then wonder why nobody remembers them.",
  },
  {
    id: "meeting-that-replaced-the-calendar",
    name: "The meeting that replaced our calendar",
    status: "Published",
    updatedMinutesAgo: daysAgo(6, 9),
    master:
      "Thirty minutes a week: what shipped, what is stuck, what we learned. No slides.\n\nThe calendar became a byproduct of that conversation instead of a substitute for it.",
  },
  {
    id: "write-like-being-quoted",
    name: "Write like you are being quoted",
    status: "Published",
    updatedMinutesAgo: daysAgo(8, 11),
    master:
      "Somebody is going to screenshot one sentence and post it with no context around it.\n\nDecide now which sentence that is, and make it one you would defend on its own.",
  },
  {
    id: "volume-is-a-decision",
    name: "Volume is a decision, not a default",
    status: "Published",
    updatedMinutesAgo: daysAgo(10, 17),
    master:
      "Posting five times a week is a choice about what you will not be doing instead.\n\nMost teams make it by accident and then wonder where the depth went.",
  },
  {
    id: "the-audit-nobody-runs",
    name: "The audit nobody runs",
    status: "Published",
    updatedMinutesAgo: daysAgo(12, 9),
    master:
      "Half our internal links pointed at pages we had since rewritten past recognition.\n\nAn afternoon fixed it. Nobody had looked in two years, because nothing was visibly broken.",
  },
  {
    id: "copy-the-structure",
    name: "Copy the structure, not the sentences",
    status: "Published",
    updatedMinutesAgo: daysAgo(14, 12),
    master:
      "The post you admire works because of the order it puts things in, not the words it uses.\n\nTake the order. The words will come out yours anyway.",
  },
  {
    id: "three-questions-before-publishing",
    name: "Three questions before publishing",
    status: "Published",
    updatedMinutesAgo: daysAgo(16, 10),
    master:
      "Who is this for, what do they do differently after reading it, and would we send it to a customer unprompted?\n\nMost drafts fail the third one, and the third one is the only one that matters.",
  },
  {
    id: "traffic-was-never-the-point",
    name: "The traffic was never the point",
    status: "Published",
    updatedMinutesAgo: daysAgo(18, 16),
    master:
      "A post that brings a thousand of the wrong readers is worse than one that brings ten of the right ones.\n\nIt costs the same to write and it teaches you the wrong lesson afterwards.",
  },
  {
    id: "deadlines-make-writing-worse",
    name: "Deadlines make writing worse. Ship anyway",
    status: "Published",
    updatedMinutesAgo: daysAgo(20, 11),
    master:
      "Every post we are proud of would have been better with another week.\n\nNone of them would have been better with another month, and we can say that because we tried it.",
  },
  {
    id: "what-we-stopped-measuring",
    name: "What we stopped measuring",
    status: "Published",
    updatedMinutesAgo: daysAgo(22, 14),
    master:
      "Time on page, bounce rate, social shares. Not one of them changed a decision in two years.\n\nWe kept two numbers and got faster at everything that followed.",
  },
  {
    id: "customer-already-wrote-it",
    name: "The customer already wrote it",
    status: "Published",
    updatedMinutesAgo: daysAgo(25, 9),
    master:
      "The clearest explanation of what we do came out of a support reply written at speed by somebody not trying to be clever.\n\nWe have been failing to improve on it for a year.",
  },
  {
    id: "anniversary-posts-are-free",
    name: "Anniversary posts are free",
    status: "Published",
    updatedMinutesAgo: daysAgo(28, 13),
    master:
      "Take the post that worked a year ago, say what has changed since, and publish it again with today's date on it.\n\nIt beats new work about half the time, which says something uncomfortable about new work.",
  },

  {
    id: "style-guide-nobody-reads",
    name: "The style guide nobody reads — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(0, 19),
    master:
      "A style guide longer than a page is a document that exists so somebody could say it exists.\n\nOurs is nine rules. Six of them are about cutting words.",
  },
  {
    id: "briefing-an-agency",
    name: "Briefing an agency — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(1, 18),
    master:
      "Agencies write what you brief. If the brief is a keyword and a word count, that is exactly what comes back.\n\nGive them the argument and the objection, and the work changes overnight.",
  },
  {
    id: "when-to-say-no-to-a-topic",
    name: "When to say no to a topic — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(4, 13),
    master:
      "If the answer is already the first result and we have nothing to add, we are writing it for ourselves.\n\nThat is allowed twice a year. Not twice a week.",
  },
  {
    id: "case-for-shorter-posts",
    name: "The case for shorter posts — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(6, 20),
    master:
      "Length is what you reach for when the argument is thin and the deadline is close.\n\nEvery post we cut in half got better. We have never once regretted the shorter version.",
  },
  {
    id: "numbers-in-headlines",
    name: "Numbers in headlines — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(8, 19),
    master:
      "A number in a headline promises the post is a list. If it is not a list, the number is a lie you paid for with a click.",
  },
  {
    id: "what-we-got-wrong-about-seo",
    name: "What we got wrong about SEO — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(11, 15),
    master:
      "We spent a year optimising pages that nobody had a reason to visit.\n\nThe fix was not technical. It was deciding what we had to say that was worth finding.",
  },
  {
    id: "building-a-swipe-file",
    name: "Building a swipe file — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(14, 18),
    master:
      "Save the posts that made you stop scrolling, and write one line under each about why.\n\nThe line is the whole exercise. Without it you have a folder of screenshots.",
  },
  {
    id: "one-page-content-strategy",
    name: "The one-page content strategy — draft",
    status: "Draft",
    updatedMinutesAgo: daysAgo(20, 14),
    master:
      "Who we are for, what we believe that others do not, and the three questions we are going to answer this quarter.\n\nIf it does not fit on a page, nobody will remember it well enough to follow it.",
  },

  {
    id: "ship-the-boring-one",
    name: "Ship the boring one",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(0, 15),
    scheduledInMinutes: daysAhead(1, 16),
    master:
      "The unglamorous post that answers a real question outlives the clever one every time.\n\nWe have the numbers for it and we still have to talk ourselves into it every quarter.",
  },
  {
    id: "competitors-are-not-the-benchmark",
    name: "Your competitors are not the benchmark",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(1, 12),
    scheduledInMinutes: daysAhead(2, 18),
    master:
      "Matching a competitor's output gets you their results at best, and they are not happy with theirs either.\n\nThe benchmark is whether a reader would miss you.",
  },
  {
    id: "every-post-needs-an-owner",
    name: "Every post needs an owner",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(2, 11),
    scheduledInMinutes: daysAhead(3, 10),
    master:
      "Not an author — an owner. Somebody whose job it is to notice when it goes stale and decide what to do about it.\n\nUnowned posts do not get deleted or updated. They just sit there being slightly wrong.",
  },
  {
    id: "delete-the-introduction",
    name: "Delete the introduction",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(3, 9),
    scheduledInMinutes: daysAhead(6, 14),
    master:
      "The first paragraph is almost always throat-clearing written while you worked out what you meant.\n\nCut it. The post now starts with the point, which is where readers thought it started anyway.",
  },
  {
    id: "what-a-content-team-is-for",
    name: "What a content team is for",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(3, 16),
    scheduledInMinutes: daysAhead(8, 9),
    master:
      "Not to fill a calendar. To have opinions in public that the company is prepared to stand behind.\n\nEverything else is logistics, and logistics is the easy part.",
  },
  {
    id: "the-link-you-did-not-ask-for",
    name: "The link you did not ask for",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(4, 14),
    scheduledInMinutes: daysAhead(10, 15),
    master:
      "The links worth having come from people who used the post to make their own argument.\n\nYou cannot outreach your way to that. You can only write something worth citing.",
  },
  {
    id: "stop-ab-testing-headlines",
    name: "Stop A/B testing headlines",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(5, 10),
    scheduledInMinutes: daysAhead(12, 11),
    master:
      "At our traffic, a headline test needs six weeks to say anything, and by then the post is old.\n\nWrite two, pick the truer one, move on.",
  },
  {
    id: "write-the-objection-first",
    name: "Write the objection first",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(5, 17),
    scheduledInMinutes: daysAhead(13, 16),
    master:
      "Start with the strongest reason a smart reader would disagree, and write towards it.\n\nIf you cannot state the objection fairly, you are not ready to argue the other side.",
  },
  {
    id: "one-post-three-audiences",
    name: "One post, three audiences",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(6, 12),
    scheduledInMinutes: daysAhead(17, 10),
    master:
      "The same argument lands differently for the person doing the work, the person paying for it, and the person who has to explain it upwards.\n\nPick one. The other two will forgive you.",
  },
  {
    id: "the-quarter-in-one-sentence",
    name: "The quarter in one sentence",
    status: "Scheduled",
    updatedMinutesAgo: daysAgo(7, 11),
    scheduledInMinutes: daysAhead(21, 14),
    master:
      "If you cannot say what the last three months of content were about in one sentence, neither can your readers.\n\nWe write ours at the start now, and treat everything that does not fit as a distraction.",
  },

  // Two busy days, so the streak chart has something other than ones and twos
  // to draw. Day 1 ends up with four posts out and day 2 with three, which is
  // what a launch week actually looks like — and it is the case a chart of one
  // block per post has to survive without growing taller.
  {
    id: "launch-day-thread",
    name: "What we shipped, and why",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 8),
    master:
      "Three months of work, one paragraph: you can now see every post's whole life in one place instead of four.\n\nThe interesting part was what we cut. Half the roadmap was features that existed to work around the other half.",
  },
  {
    id: "launch-day-numbers",
    name: "The numbers behind the launch",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 13),
    master:
      "We shipped to forty teams first and watched for a fortnight before opening it up.\n\nThirty-one came back in week two without being asked. That was the number we were waiting on.",
  },
  {
    id: "launch-day-lessons",
    name: "What the beta taught us",
    status: "Published",
    updatedMinutesAgo: daysAgo(1, 20),
    master:
      "Nobody used the feature we spent longest on, and everybody used the one we nearly cut.\n\nWe have stopped being surprised by this and started shipping the small one first on purpose.",
  },
  {
    id: "quiet-week-review",
    name: "A quiet week is data too",
    status: "Published",
    updatedMinutesAgo: daysAgo(2, 20),
    master:
      "We published twice last week instead of five times, and nothing measurable moved.\n\nThat is not permission to stop. It is permission to stop panicking about the cadence.",
  },

  {
    id: "read-the-losing-posts-repost",
    name: "Read the losing posts — repost",
    status: "Failed",
    updatedMinutesAgo: daysAgo(3, 19),
    failure: {
      platformId: "linkedin",
      reason: "LinkedIn rejected the post — external link not allowed",
    },
    master:
      "Everyone reviews the top ten. The bottom ten is where the pattern is.\n\nOurs were all written for a reader we could not name in one sentence.",
  },
  {
    id: "three-questions-repost",
    name: "Three questions — repost",
    status: "Failed",
    updatedMinutesAgo: daysAgo(16, 18),
    failure: {
      platformId: "x",
      reason: "X rejected the post — media upload failed",
    },
    master:
      "Who is this for, what do they do differently after reading it, and would we send it to a customer unprompted?\n\nMost drafts fail the third one.",
  },
]

// The platforms the seed fans out across. Both are fully specced in
// lib/connectors.ts; Substack arrives with the composer that needs it.
const SEED_PLATFORM_IDS = ["linkedin", "x"]

/** FNV-1a. Small, deterministic, and stable across server and client — the
    numbers below must not move between renders. */
function hash(seed: string): number {
  let h = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    h ^= seed.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Derived in dependency order rather than drawn independently: likes come out
// of impressions, comments and reposts out of likes. Independent draws are how
// you end up showing 40 likes on 12 impressions.
function metricsFor(id: string, platformId: string): VariantMetrics {
  const h = hash(`${id}:${platformId}`)

  const impressions = 400 + (h % 5000)
  // 1.5%–6% of impressions.
  const likes = Math.round((impressions * (15 + ((h >>> 8) % 45))) / 1000)
  // 4%–14% of likes.
  const comments = Math.round((likes * (40 + ((h >>> 16) % 100))) / 1000)
  // 3%–12% of likes.
  const reposts = Math.round((likes * (30 + ((h >>> 24) % 90))) / 1000)

  return { impressions, likes, comments, reposts }
}

// Short platforms take the opening thought — a trimmed long post reads as a
// truncation, whereas the first paragraph reads as an adaptation. Long ones
// carry the whole argument.
function variantText(master: string, limit: number): string {
  const paragraphs = master
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return trimTo(limit < 600 ? (paragraphs[0] ?? master) : master, limit)
}

function withVariants(seed: Seed): SocialPost {
  const variants = SEED_PLATFORM_IDS.flatMap((platformId) => {
    const platform = findPlatform(platformId)
    if (!platform) {
      return []
    }

    // A post that failed did not fail everywhere. Each network is posted to
    // separately and answers for itself, so a rejection is one platform's — the
    // siblings went out at the same moment and have the figures to show for it.
    // Treating the whole post as unsent was the seed disagreeing with its own
    // type, where `failure` sits on the variant precisely because of this.
    const rejected =
      seed.status === "Failed" && seed.failure?.platformId === platformId
    const wentOut =
      (seed.status === "Published" || seed.status === "Failed") && !rejected

    return [
      {
        platformId,
        text: variantText(seed.master, platform.characterLimit),
        // Only a platform that took it has anything to report.
        metrics: wentOut ? metricsFor(seed.id, platformId) : undefined,
        failure:
          seed.failure?.platformId === platformId
            ? seed.failure.reason
            : undefined,
      },
    ]
  })

  return {
    id: seed.id,
    name: seed.name,
    status: seed.status,
    updatedMinutesAgo: seed.updatedMinutesAgo,
    scheduledInMinutes: seed.scheduledInMinutes,
    variants,
  }
}

export const socialPosts: SocialPost[] = SOCIAL_SEED.map(withVariants)

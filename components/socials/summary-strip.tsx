import {
  EngagementDetail,
  ImpressionsDetail,
  StreakDetail,
} from "@/components/socials/metric-detail"
import { StatTile } from "@/components/socials/stat-tile"
import {
  formatCount,
  percentChange,
  type SocialSummary,
} from "@/lib/social-insights"

// Three figures about the account, sat above the posts they are derived from.
// The streak is the one number worth a shape; the other two are a value and a
// direction, which is a stat tile's job rather than a chart's.
//
// Each tile is a sum across platforms, so each opens its own breakdown — a
// single number is what a summary is for, but it should always be possible to
// take one apart.
export function SummaryStrip({ summary }: { summary: SocialSummary }) {
  const { streakDays, daily, impressions, engagement } = summary

  return (
    <div className="flex shrink-0 flex-wrap gap-3">
      <StatTile
        label="Posting streak"
        value={`${streakDays} ${streakDays === 1 ? "day" : "days"}`}
        trend={daily}
        // No description: the chart labels its own axes, and the line under it
        // states the streak and the total. A paragraph saying the same thing in
        // sentences is two lines to read before reaching the thing that answers
        // the question faster.
        detail={{
          title: "Posting streak",
          content: <StreakDetail summary={summary} />,
        }}
      />

      {/* Impressions, not "reach". Reach means unique accounts that saw it,
          which cannot be had by adding platforms together — the same person
          following you in two places would be counted twice, and the two
          platforms do not measure an impression the same way. */}
      <StatTile
        label="Impressions this week"
        value={formatCount(impressions.thisWeek)}
        change={{
          percent: percentChange(impressions.thisWeek, impressions.lastWeek),
          caption: "vs last week",
        }}
        // No description: the rows are the answer to where the figure came
        // from, and repeating the total above them is a line to read before
        // reaching it.
        detail={{
          title: "Impressions this week",
          content: <ImpressionsDetail summary={summary} />,
        }}
      />

      {/* Engagement is safe to add up in a way impressions are not: likes,
          comments and reposts are discrete actions, and one on LinkedIn is
          the same kind of thing as one on X. */}
      <StatTile
        label="Engagement this week"
        value={formatCount(engagement.thisWeek)}
        change={{
          percent: percentChange(engagement.thisWeek, engagement.lastWeek),
          caption: "vs last week",
        }}
        // No description: the icons name the three actions, which is all the
        // sentence was doing.
        detail={{
          title: "Engagement this week",
          content: <EngagementDetail summary={summary} />,
        }}
      />
    </div>
  )
}

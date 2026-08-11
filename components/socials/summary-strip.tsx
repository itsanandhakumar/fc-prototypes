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
        detail={{
          title: "Posting streak",
          description: "Each bar is a day. The run at the right is your streak.",
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
        detail={{
          title: "Impressions this week",
          description: `Where the ${formatCount(impressions.thisWeek)} came from.`,
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
        detail={{
          title: "Engagement this week",
          description: "Likes, comments and reposts across your platforms.",
          content: <EngagementDetail summary={summary} />,
        }}
      />
    </div>
  )
}

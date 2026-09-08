import { AlertTriangle, Info, OctagonAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { AuditSeverity } from "@/lib/audit-data"

/**
 * How bad a finding is, said three ways at once: a word, a shape, and a colour.
 *
 * Never the colour alone. Severity is the one thing on this page that changes
 * what someone does next, and a reader who cannot separate red from amber would
 * be left with a page of identical grey chips. The icon and the label carry it
 * without the colour; the colour only makes it faster.
 *
 * Amber is a fixed value rather than a token for the same reason the emerald in
 * lib/social-status.ts is: the theme has a destructive colour and no warning
 * one, so the middle step has to be stated, in both themes.
 */
const SEVERITY: Record<
  AuditSeverity,
  { label: string; icon: typeof Info; tone: string }
> = {
  critical: {
    label: "Critical",
    icon: OctagonAlert,
    tone: "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/25",
  },
  serious: {
    label: "Serious",
    icon: AlertTriangle,
    tone: "border-amber-600/35 bg-amber-600/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
  },
  warning: {
    label: "Worth a look",
    icon: Info,
    tone: "border-border bg-muted text-muted-foreground",
  },
}

export function severityLabel(severity: AuditSeverity): string {
  return SEVERITY[severity].label
}

export function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const { label, icon: Icon, tone } = SEVERITY[severity]

  return (
    <Badge variant="outline" className={tone}>
      <Icon aria-hidden />
      {label}
    </Badge>
  )
}

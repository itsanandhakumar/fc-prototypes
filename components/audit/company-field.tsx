"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAuditSite } from "@/lib/audit-data"

/**
 * The one control for naming a company by its website. Two places need it and
 * they need it to behave identically: the question Audit asks the first time
 * it is opened, and the setting that changes the answer afterwards.
 *
 * Lenient about what is typed and open about what it made of it — the scheme
 * gets filled in, and the line underneath shows the result rather than
 * silently rewriting the field.
 */
export function CompanyField({
  id = "audit-company",
  label,
  initialValue = "",
  submitLabel,
  requireChange = true,
  pending,
  onSubmit,
  children,
}: {
  id?: string
  label: string
  initialValue?: string
  submitLabel: string
  /**
   * Whether the value has to differ from what it started as. True where the
   * field edits an existing answer — saving it back unchanged does nothing —
   * and false where the initial value is a suggestion, since accepting a
   * suggestion is the commonest thing to do with one.
   */
  requireChange?: boolean
  pending: boolean
  onSubmit: (site: string) => void
  /** Anything to sit beside the submit button, such as a Cancel. */
  children?: React.ReactNode
}) {
  const [typed, setTyped] = React.useState(initialValue)

  // Checked as typed rather than on submit, so the button that would fail is
  // simply not pressable — there is nothing to say about a half-typed address.
  const parsed = parseAuditSite(typed)
  const unchanged = requireChange && parsed === initialValue

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          className="h-9 py-1.5"
          value={typed}
          placeholder="example.com"
          // The browser offers its own history of URLs when a field says it
          // takes one, which drops a list of unrelated addresses over the
          // dialog. Nothing here benefits from it: the site being typed is a
          // decision, not a value to recall.
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && parsed && !unchanged) {
              event.preventDefault()
              onSubmit(parsed)
            }
          }}
        />
        {/* wrap-anywhere because an address is one long unbroken token, and
            these sit in grids where a track's min-width resolves to its
            min-content width — without it a long address widens the box. */}
        <p className="min-w-0 text-xs wrap-anywhere text-muted-foreground">
          {parsed ?? "A domain, with or without https://"}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        {children}
        <Button
          type="button"
          size="lg"
          disabled={pending || !parsed || unchanged}
          onClick={() => parsed && onSubmit(parsed)}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  )
}

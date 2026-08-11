"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { LogOut, Palette, PenLine, Plug, UserRound } from "lucide-react"

import { logout } from "@/app/login-actions"
import { setDefaultBodyView } from "@/app/settings-actions"
import { ConnectorList } from "@/components/connector-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { initialsOf, type Account } from "@/lib/auth"
import { BODY_VIEWS, type BodyView } from "@/lib/preferences"

const SECTIONS = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "editor", label: "Editor", icon: PenLine },
  { id: "connectors", label: "Connectors", icon: Plug },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
]

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  )
}

function Segmented<Value extends string>({
  options,
  value,
  onSelect,
  ariaLabel,
}: {
  options: Array<{ value: Value; label: string }>
  value: Value | undefined
  onSelect: (value: Value) => void
  ariaLabel: string
}) {
  return (
    // Boxed as one control: the options are exclusive, so they read as a
    // switch between states rather than as separate buttons.
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-md border border-input bg-input/20 p-0.5 dark:bg-input/30"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "secondary" : "ghost"}
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

function AccountSection({
  accounts,
  currentEmail,
}: {
  accounts: Account[]
  currentEmail: string
}) {
  const current = accounts.find((account) => account.email === currentEmail)
  const [pending, startPending] = React.useTransition()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {current ? initialsOf(current.name) : "?"}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs font-medium">
            {current?.name ?? "Unknown account"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {currentEmail}
          </span>
        </div>
      </div>

      <div>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => startPending(async () => logout())}
        >
          <LogOut />
          Log out
        </Button>
      </div>
    </div>
  )
}

// Controlled from the outside: the way in is the account menu at the foot of
// the sidebar, so the dialog carries no trigger of its own.
export function SettingsDialog({
  open,
  onOpenChange,
  defaultBodyView,
  connectedIds,
  accounts,
  currentEmail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultBodyView: BodyView
  connectedIds: string[]
  accounts: Account[]
  currentEmail: string
}) {
  const [section, setSection] = React.useState<SectionId>("account")
  // `theme` is undefined until next-themes has read storage, which has happened
  // long before the dialog can be opened.
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [bodyView, setBodyView] = React.useState(defaultBodyView)
  const [, startSaving] = React.useTransition()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Account, appearance, editor and connector preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings sections"
            className="flex w-44 shrink-0 flex-col gap-0.5 border-r p-2"
          >
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant={section === id ? "secondary" : "ghost"}
                aria-current={section === id ? "page" : undefined}
                className="justify-start"
                onClick={() => setSection(id)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {section === "account" ? (
              <AccountSection accounts={accounts} currentEmail={currentEmail} />
            ) : null}

            {section === "appearance" ? (
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Theme"
                  hint={
                    theme === "system"
                      ? `Following your device — currently ${resolvedTheme ?? "light"}.`
                      : "Pressing d anywhere does the same thing."
                  }
                >
                  <Segmented
                    ariaLabel="Theme"
                    options={THEMES}
                    value={theme}
                    onSelect={setTheme}
                  />
                </SettingRow>
              </div>
            ) : null}

            {section === "editor" ? (
              <div className="flex flex-col gap-4">
                <SettingRow
                  label="Default view"
                  hint="Which view a post opens in. Applies to the next post you open."
                >
                  <Segmented
                    ariaLabel="Default editor view"
                    options={BODY_VIEWS}
                    value={bodyView}
                    onSelect={(next) => {
                      setBodyView(next)
                      startSaving(async () => setDefaultBodyView(next))
                    }}
                  />
                </SettingRow>
              </div>
            ) : null}

            {section === "connectors" ? (
              <div className="flex flex-col gap-4">
                <ConnectorList connectedIds={connectedIds} />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

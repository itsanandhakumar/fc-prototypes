"use client"

// Other ways to head this same post. Picking one retitles the draft in place —
// the body, the panel and the post's place in Your posts are all untouched, and
// nothing new is created — so it applies on the spot rather than asking first.
// The headline above the draft is not typed, so this is the one way it moves.
export function TitleOptions({
  titles,
  current,
  onSelect,
  disabled,
}: {
  titles: string[]
  /** Marks the one already in use, so it is not offered as a change. */
  current: string
  onSelect: (title: string) => void
  disabled?: boolean
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {titles.map((title) => {
        const active = title === current
        return (
          <li key={title}>
            <button
              type="button"
              disabled={disabled || active}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(title)}
              className={
                active
                  ? "w-full rounded-md bg-secondary px-2 py-1.5 text-left text-xs/relaxed font-medium text-secondary-foreground"
                  : "w-full rounded-md bg-muted/60 px-2 py-1.5 text-left text-xs/relaxed transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              }
            >
              {title}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

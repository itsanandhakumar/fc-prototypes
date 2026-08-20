import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// An icon's artwork is drawn inside its box with a margin around it, so an
// icon that leads or trails a label sits further from the edge than the label
// does at the other end. Pulling it back by that margin is what makes the two
// ends of a button read as equal. Carried by the labelled sizes only: a label
// is a text node, which CSS cannot see, so there is no selector that says
// "icon beside text" — but the icon-only buttons have sizes of their own, and
// on those the pull cancels out anyway.
const ICON_EDGE =
  "[&>svg:first-child]:-ml-[calc(0.125rem+0.5px)] [&>svg:last-child]:-mr-0.5"

// A letter does not touch the edge of its own glyph box either — the last one
// in a label leaves about half a pixel of its own. Half a pixel back on the
// trailing side is what squares the two ends off exactly.
const LABEL_EDGE = "pr-[calc(var(--label-edge)+0.5px)]"

const buttonVariants = cva(
  `group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.25em]`,
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: `h-8 gap-1 px-2 [--label-edge:0.5rem] ${LABEL_EDGE} text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-[1.15em] ${ICON_EDGE}`,
        xs: `h-6 gap-1 rounded-sm px-2 [--label-edge:0.5rem] ${LABEL_EDGE} text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-[0.85em] ${ICON_EDGE}`,
        sm: `h-7 gap-1 px-2 [--label-edge:0.5rem] ${LABEL_EDGE} text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-[1em] ${ICON_EDGE}`,
        // Taller than `default`, not just wider. Every `lg` in the app is a
        // primary action at the end of something — publish, generate, sign in
        // — and at the same height as the buttons around it the size only read
        // as extra side padding, which made the label look wedged in.
        lg: `h-9 gap-1 px-2.5 [--label-edge:0.625rem] ${LABEL_EDGE} text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-[1.25em] ${ICON_EDGE}`,
        icon: "size-8 [&_svg:not([class*='size-'])]:size-[1.15em]",
        "icon-xs":
          "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-[0.85em]",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-[1em]",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-[1.25em]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

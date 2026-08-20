"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

// A card that opens against the thing that opened it, rather than in the middle
// of the screen. Same surface as the dialog — the difference is where it lands
// and that the page behind it stays live.

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  sideOffset = 4,
  align = "center",
  side = "bottom",
  ...props
}: PopoverPrimitive.Popup.Props & {
  sideOffset?: number
  align?: PopoverPrimitive.Positioner.Props["align"]
  side?: PopoverPrimitive.Positioner.Props["side"]
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        className="z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 origin-(--transform-origin) rounded-xl bg-popover p-3 text-xs/relaxed text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ ...props }: PopoverPrimitive.Title.Props) {
  return <PopoverPrimitive.Title data-slot="popover-title" {...props} />
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

export { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger }

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import type { BlogSource } from "@/components/socials/blog-picker-dialog"
import { GenerateDialog } from "@/components/socials/generate-dialog"
import { Button } from "@/components/ui/button"
import type { Platform } from "@/lib/connectors"
import {
  blankEditorHref,
  versionsHref,
  type SourceRef,
} from "@/lib/social-flow"

// Starting a post happens here, over the list, rather than on a screen of its
// own. Everything the dialog settles — where the post goes, what it is about —
// goes into the link it opens, so the screens after it can be rebuilt from
// their URLs instead of being handed state by the one before.
export function NewPostButton({
  platforms,
  blogs,
}: {
  platforms: Platform[]
  blogs: BlogSource[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  // Two is the useful default: most posts go to both, and the one destination
  // that is left cannot be turned off.
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    platforms.slice(0, 2).map((platform) => platform.id)
  )

  function togglePlatform(id: string) {
    setSelectedIds((current) => {
      if (!current.includes(id)) {
        return [...current, id]
      }
      // A post with nowhere to go is not a post, so the last one stays on.
      return current.length === 1
        ? current
        : current.filter((item) => item !== id)
    })
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus />
        New Post
      </Button>

      <GenerateDialog
        blogs={blogs}
        platforms={platforms}
        selectedIds={selectedIds}
        onTogglePlatform={togglePlatform}
        open={open}
        onOpenChange={setOpen}
        onGenerate={(ref: SourceRef) =>
          router.push(versionsHref(ref, selectedIds))
        }
        onWriteOwn={() => router.push(blankEditorHref(selectedIds))}
      />
    </>
  )
}

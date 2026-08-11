import { AppShell } from "@/components/app-shell"
import { Composer } from "@/components/socials/composer"
import { PLATFORMS, SOCIAL_PLATFORM_IDS } from "@/lib/connectors"
import { getSocialPost } from "@/lib/social-store"

// The editor is the way in, not the second step. A social post is short enough
// to just type, so this opens empty and the brief is a button inside it.
export default async function SocialsEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>
}) {
  const { post: postId } = await searchParams
  const post = getSocialPost(postId)

  const platforms = PLATFORMS.filter((platform) =>
    SOCIAL_PLATFORM_IDS.includes(platform.id)
  )

  return (
    <AppShell
      breadcrumbs={[
        { label: "Socials", href: "/socials" },
        { label: post?.name ?? "New post" },
      ]}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <Composer platforms={platforms} post={post} />
      </main>
    </AppShell>
  )
}

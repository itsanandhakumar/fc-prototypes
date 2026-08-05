import { AppHeader } from "@/components/app-header"
import { NewPostForm } from "@/components/editor/new-post-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// One screen: the whole brief and the Generate button live in the same form.
export default function NewPostPage() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "New post" },
        ]}
      />

      {/* Centred while it fits, scrollable — with padding — once it does not.
          Centring directly on the scroll container would clip the top of a
          tall card beyond reach. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6">
          {/* Tighter than a card's usual gap: the title is the brief field's
              label, so it sits as close to it as the labels below do to
              theirs. */}
          <Card className="w-full max-w-lg gap-1.5">
            <CardHeader>
              {/* The title is the brief's label, so what the brief needs is
                  marked against it. */}
              <CardTitle>
                What do you want to write about?{" "}
                <span aria-hidden className="text-destructive">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <NewPostForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

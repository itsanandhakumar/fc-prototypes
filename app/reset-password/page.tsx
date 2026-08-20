import Link from "next/link"

import { BrandLockup } from "@/components/brand-lockup"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FORGOT_PASSWORD_ROUTE, LOGIN_ROUTE } from "@/lib/auth"
import { checkResetToken } from "@/lib/password-reset"

// The token is checked here, before the form renders, so a dead link says so
// immediately rather than after someone has typed a password twice.
//
// Checking is not spending: the token is only consumed when the form is
// submitted. Mail scanners and link previewers follow URLs in email, and a
// check that burned the token would let them destroy the link before the
// recipient ever clicked it.

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token = "" } = await searchParams
  const check = await checkResetToken(token)

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <BrandLockup orientation="stacked" className="text-sm font-medium" />
        <Card className="w-full">
          <CardHeader className="items-center gap-1 text-center">
            <CardTitle>
              {check.valid ? "Choose a new password" : "This link doesn't work"}
            </CardTitle>
            <CardDescription>
              {check.valid
                ? "Pick something you haven't used before"
                : check.reason === "used"
                  ? "It has already been used to set a password"
                  : check.reason === "expired"
                    ? "Reset links expire an hour after they are sent"
                    : "It may have been mistyped, or replaced by a newer one"}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {check.valid ? (
              <ResetPasswordForm token={token} />
            ) : (
              <Link
                href={FORGOT_PASSWORD_ROUTE}
                className={buttonVariants({ size: "lg", className: "w-full" })}
              >
                Request a new link
              </Link>
            )}

            <p className="text-center text-xs/relaxed text-muted-foreground">
              <Link
                href={LOGIN_ROUTE}
                className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
              >
                Back to log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

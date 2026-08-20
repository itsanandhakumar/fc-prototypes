"use client"

import * as React from "react"
import Link from "next/link"

import { requestPasswordReset } from "@/app/password-actions"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LOGIN_ROUTE } from "@/lib/auth"

export default function ForgotPasswordPage() {
  const [state, action, pending] = React.useActionState(requestPasswordReset, {
    done: false,
    error: null,
  })

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <BrandLockup orientation="stacked" className="text-sm font-medium" />
        <Card className="w-full">
          <CardHeader className="items-center gap-1 text-center">
            <CardTitle>
              {state.done ? "Check your inbox" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {state.done
                ? "If that address has an account, a reset link is on its way"
                : "We'll email you a link to choose a new one"}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {state.done ? (
              // Deliberately says "if". Confirming the address exists would
              // turn this form into a way to test which emails are registered.
              <p className="text-center text-xs/relaxed text-muted-foreground">
                The link works once and expires in an hour. Nothing arrived?
                Check spam, then try again in a minute.
              </p>
            ) : (
              <form className="flex flex-col gap-3" action={action}>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={state.error ? true : undefined}
                    autoFocus
                    required
                  />
                </div>

                {state.error ? (
                  <p role="alert" className="text-xs/relaxed text-destructive">
                    {state.error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 w-full"
                  disabled={pending}
                >
                  {pending ? "Sending…" : "Send reset link"}
                </Button>
              </form>
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

"use client"

import * as React from "react"

import { loginWithGoogle, loginWithPassword } from "@/app/login-actions"
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
import { Separator } from "@/components/ui/separator"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.25em]">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [state, formAction, isPending] = React.useActionState(
    loginWithPassword,
    { error: null }
  )

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <BrandLockup orientation="stacked" className="text-sm font-medium" />
        <Card className="w-full">
          <CardHeader className="items-center gap-1 text-center">
            <CardTitle>Log in to your account</CardTitle>
            <CardDescription>
              Log in with your email and password to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <form className="flex flex-col gap-3" action={formAction}>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={state.error ? true : undefined}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-xs/relaxed text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={state.error ? true : undefined}
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
                disabled={isPending}
              >
                Log in
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs/relaxed text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <form action={loginWithGoogle}>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full gap-2"
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

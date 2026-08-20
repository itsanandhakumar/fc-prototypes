"use client"

import * as React from "react"
import Link from "next/link"

import { resetPassword } from "@/app/password-actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LOGIN_ROUTE, MIN_PASSWORD_LENGTH } from "@/lib/auth"

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = React.useActionState(resetPassword, {
    done: false,
    error: null,
  })

  if (state.done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-xs/relaxed text-muted-foreground">
          Your password has been changed. Any other reset links you were sent no
          longer work.
        </p>
        <Link
          href={LOGIN_ROUTE}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Log in
        </Link>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-3" action={action}>
      <input type="hidden" name="token" value={token} />

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">New password</Label>
          <span className="text-xs/relaxed text-muted-foreground">
            {MIN_PASSWORD_LENGTH}+ characters
          </span>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          aria-invalid={state.error ? true : undefined}
          autoFocus
          required
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
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
        disabled={pending}
      >
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  )
}

import type { DefaultSession } from "next-auth"

// Every post query is scoped by the signed-in user, so `session.user.id` is
// read constantly. Auth.js does not put it there by default — the session
// callback in `auth.ts` does, and this is what makes it visible to TypeScript.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

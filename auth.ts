import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { db } from "@/lib/db"
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  // JWT rather than database sessions: the session is read on nearly every
  // request, and a signed cookie saves that round trip to TiDB. The adapter is
  // still what persists users and linked Google accounts.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },

  pages: { signIn: "/", error: "/" },

  providers: [
    Google({
      // Google verifies the address before it ever reaches us, so an email that
      // already has a password account is the same person. Without this, that
      // user hits OAuthAccountNotLinked and has no way through.
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? "")

        if (!email || !password) {
          return null
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        // An account created through Google has no password to check. Returning
        // null rather than a distinct error keeps the failure identical to a
        // wrong password, so the form cannot be used to discover which
        // addresses are registered.
        if (!user?.passwordHash) {
          return null
        }

        if (!(await compare(password, user.passwordHash))) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  callbacks: {
    // Everything the app reads off the session comes through here. `token.sub`
    // is the user id, and it is what every post query is scoped by — so it has
    // to survive onto the session object.
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})

import type { NextAuthOptions } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { getServerSession } from 'next-auth'
import { db } from './db/client'
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from './db/schema'

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as NextAuthOptions['adapter'],
  // JWT sessions are required for next-auth/middleware (Edge runtime can't
  // talk to the database). The Drizzle adapter still persists users +
  // accounts so we keep GitHub OAuth tokens server-side for API calls.
  session: { strategy: 'jwt' },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
      authorization: {
        params: {
          // `repo` allows reading/writing private repos; `read:user` for profile.
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in `user` is the row returned by the adapter and
      // contains its database id. Persist it onto the token so we can read
      // it back in the session callback.
      if (user) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token?.uid) {
        session.user.id = token.uid as string
      }
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}

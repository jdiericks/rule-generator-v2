import type { NextAuthOptions } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from './db/client'
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from './db/schema'
import { getServerSession } from 'next-auth'

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as NextAuthOptions['adapter'],
  session: { strategy: 'database' },
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
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}

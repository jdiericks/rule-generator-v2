import { Octokit } from '@octokit/rest'
import { and, eq } from 'drizzle-orm'
import { db } from './db/client'
import { accounts } from './db/schema'

export async function getGithubAccessToken(userId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'github')))
    .limit(1)
  return row?.access_token ?? null
}

export async function getOctokit(userId: string): Promise<Octokit | null> {
  const token = await getGithubAccessToken(userId)
  if (!token) return null
  return new Octokit({ auth: token })
}

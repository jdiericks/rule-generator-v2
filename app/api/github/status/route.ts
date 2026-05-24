import { NextResponse } from 'next/server'
import { requireUserId, serverError } from '@/lib/api-utils'
import { getOctokit } from '@/lib/github'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const octokit = await getOctokit(auth.userId)
    if (!octokit) return NextResponse.json({ connected: false })
    const { data } = await octokit.users.getAuthenticated()
    return NextResponse.json({
      connected: true,
      login: data.login,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
      name: data.name,
    })
  } catch (err) {
    return serverError(err)
  }
}

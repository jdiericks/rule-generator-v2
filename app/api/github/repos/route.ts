import { NextResponse } from 'next/server'
import { requireUserId, serverError } from '@/lib/api-utils'
import { getOctokit } from '@/lib/github'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const octokit = await getOctokit(auth.userId)
    if (!octokit) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 412 })
    }
    // List up to 100 repos the user has access to, sorted by last push.
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'pushed',
      affiliation: 'owner,collaborator,organization_member',
    })
    return NextResponse.json({
      repos: data.map((r) => ({
        id: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch,
        private: r.private,
        htmlUrl: r.html_url,
        permissions: r.permissions,
      })),
    })
  } catch (err) {
    return serverError(err)
  }
}

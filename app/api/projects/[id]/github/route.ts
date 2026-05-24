import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, projectGithubLinks } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'

export const runtime = 'nodejs'

async function ownsProject(userId: string, id: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)
  return !!row
}

function serializeLink(row: typeof projectGithubLinks.$inferSelect | undefined) {
  if (!row) return null
  return {
    owner: row.owner,
    repo: row.repo,
    branch: row.branch,
    rulesPath: row.rulesPath,
    defaultBranch: row.defaultBranch,
    lastPushedSha: row.lastPushedSha,
    lastPushedAt: row.lastPushedAt?.toISOString() ?? null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')
    const [link] = await db
      .select()
      .from(projectGithubLinks)
      .where(eq(projectGithubLinks.projectId, params.id))
    return NextResponse.json({ link: serializeLink(link) })
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  let body: {
    owner?: string
    repo?: string
    branch?: string
    rulesPath?: string
    defaultBranch?: string
  }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }
  if (!body.owner || !body.repo) return badRequest('owner and repo are required')

  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')
    const branch = body.branch?.trim() || body.defaultBranch?.trim() || 'main'
    const rulesPath = (body.rulesPath?.trim() || '.cursor/rules').replace(/^\/+|\/+$/g, '')

    const [row] = await db
      .insert(projectGithubLinks)
      .values({
        projectId: params.id,
        owner: body.owner,
        repo: body.repo,
        branch,
        rulesPath,
        defaultBranch: body.defaultBranch ?? null,
      })
      .onConflictDoUpdate({
        target: projectGithubLinks.projectId,
        set: {
          owner: body.owner,
          repo: body.repo,
          branch,
          rulesPath,
          defaultBranch: body.defaultBranch ?? null,
        },
      })
      .returning()

    return NextResponse.json({ link: serializeLink(row) })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')
    await db
      .delete(projectGithubLinks)
      .where(eq(projectGithubLinks.projectId, params.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

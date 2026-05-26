import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, skills } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { serializeSkill } from '@/lib/db/serialize'
import { buildInitialSkillBody } from '@/lib/skills'

export const runtime = 'nodejs'

async function ownsProject(userId: string, id: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)
  return !!row
}

interface IncomingSkill {
  name?: string
  description?: string
  body?: string
  allowedTools?: string[]
  order?: number
}

function normalize(input: IncomingSkill) {
  const name = (input.name ?? '').trim() || 'Untitled Skill'
  const description = input.description ?? ''
  const allowedTools = Array.isArray(input.allowedTools) ? input.allowedTools : []
  let body = input.body ?? ''
  if (!body.trim()) {
    body = buildInitialSkillBody({ name, description, allowedTools })
  }
  return {
    name,
    description,
    body,
    allowedTools,
    order: typeof input.order === 'number' ? input.order : 0,
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { skill?: IncomingSkill }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }
  if (!body.skill) return badRequest('Missing `skill`')

  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')

    const [row] = await db
      .insert(skills)
      .values({ projectId: params.id, ...normalize(body.skill) })
      .returning()

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))

    return NextResponse.json({ skill: serializeSkill(row) })
  } catch (err) {
    return serverError(err)
  }
}

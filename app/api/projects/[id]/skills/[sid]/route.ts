import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, skills } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { serializeSkill } from '@/lib/db/serialize'
import { syncSkillFrontMatter } from '@/lib/skills'

export const runtime = 'nodejs'

async function ownsProject(userId: string, id: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)
  return !!row
}

const EDITABLE = ['name', 'description', 'body', 'allowedTools', 'order'] as const
const META_FIELDS = ['name', 'description', 'allowedTools'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')

    const updates: Record<string, unknown> = {}
    for (const k of EDITABLE) {
      if (k in body) updates[k] = body[k]
    }
    if (Object.keys(updates).length === 0) return badRequest('No editable fields supplied')

    // If metadata changed but the caller didn't supply a new body, re-sync
    // the frontmatter against the stored body.
    const metaChanged = META_FIELDS.some((f) => f in body)
    const explicitBody = 'body' in body
    if (metaChanged && !explicitBody) {
      const [existing] = await db
        .select()
        .from(skills)
        .where(and(eq(skills.id, params.sid), eq(skills.projectId, params.id)))
        .limit(1)
      if (existing) {
        updates.body = syncSkillFrontMatter(existing.body, {
          name: (updates.name as string | undefined) ?? existing.name,
          description: (updates.description as string | undefined) ?? existing.description,
          allowedTools:
            (updates.allowedTools as string[] | undefined) ?? existing.allowedTools ?? [],
        })
      }
    }

    const [row] = await db
      .update(skills)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(skills.id, params.sid), eq(skills.projectId, params.id)))
      .returning()
    if (!row) return notFound('Skill not found')

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))

    return NextResponse.json({ skill: serializeSkill(row) })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    if (!(await ownsProject(auth.userId, params.id))) return notFound('Project not found')
    await db
      .delete(skills)
      .where(and(eq(skills.id, params.sid), eq(skills.projectId, params.id)))
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

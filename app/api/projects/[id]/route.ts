import { NextRequest, NextResponse } from 'next/server'
import { and, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections, skills } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { serializeSection, serializeSkill } from '@/lib/db/serialize'
import type { RuleFormat, SkillFormat } from '@/lib/types'

export const runtime = 'nodejs'

async function loadOwned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  try {
    const project = await loadOwned(auth.userId, params.id)
    if (!project) return notFound('Project not found')

    const [secRows, skillRows] = await Promise.all([
      db
        .select()
        .from(sections)
        .where(eq(sections.projectId, project.id))
        .orderBy(asc(sections.order)),
      db
        .select()
        .from(skills)
        .where(eq(skills.projectId, project.id))
        .orderBy(asc(skills.order)),
    ])

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        techStack: project.techStack ?? [],
        ruleFormat: (project.ruleFormat as RuleFormat) ?? 'cursor',
        skillFormat: (project.skillFormat as SkillFormat) ?? 'cursor',
        sections: secRows.map(serializeSection),
        skills: skillRows.map(serializeSkill),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return serverError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { name?: string; description?: string; techStack?: string[]; ruleFormat?: string; skillFormat?: string }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  try {
    const project = await loadOwned(auth.userId, params.id)
    if (!project) return notFound('Project not found')

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.description === 'string') updates.description = body.description
    if (Array.isArray(body.techStack)) updates.techStack = body.techStack
    if (typeof body.skillFormat === 'string') {
      updates.skillFormat = body.skillFormat === 'opencode' ? 'opencode' : 'cursor'
    }
    if (typeof body.ruleFormat === 'string') {
      updates.ruleFormat = body.ruleFormat === 'opencode' ? 'opencode' : 'cursor'
    }

    const [row] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, project.id))
      .returning()

    return NextResponse.json({
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        techStack: row.techStack ?? [],
        ruleFormat: (row.ruleFormat as RuleFormat) ?? 'cursor',
        skillFormat: (row.skillFormat as SkillFormat) ?? 'cursor',
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
    })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const project = await loadOwned(auth.userId, params.id)
    if (!project) return notFound('Project not found')
    await db.delete(projects).where(eq(projects.id, project.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

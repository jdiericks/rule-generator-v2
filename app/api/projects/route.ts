import { NextRequest, NextResponse } from 'next/server'
import { eq, desc, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections, skills } from '@/lib/db/schema'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { serializeSection, serializeSkill } from '@/lib/db/serialize'
import type { RuleFormat, SkillFormat } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, auth.userId))
      .orderBy(desc(projects.updatedAt))

    const projectIds = rows.map((p) => p.id)
    const sectionRows = projectIds.length
      ? await db.select().from(sections).where(inArray(sections.projectId, projectIds))
      : []
    const skillRows = projectIds.length
      ? await db.select().from(skills).where(inArray(skills.projectId, projectIds))
      : []
    const sectionsByProject = new Map<string, typeof sectionRows>()
    for (const s of sectionRows) {
      const list = sectionsByProject.get(s.projectId) ?? []
      list.push(s)
      sectionsByProject.set(s.projectId, list)
    }
    const skillsByProject = new Map<string, typeof skillRows>()
    for (const s of skillRows) {
      const list = skillsByProject.get(s.projectId) ?? []
      list.push(s)
      skillsByProject.set(s.projectId, list)
    }

    const out = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      techStack: p.techStack ?? [],
      ruleFormat: (p.ruleFormat as RuleFormat) ?? 'cursor',
      skillFormat: (p.skillFormat as SkillFormat) ?? 'cursor',
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      sections: (sectionsByProject.get(p.id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map(serializeSection),
      skills: (skillsByProject.get(p.id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map(serializeSkill),
    }))

    return NextResponse.json({ projects: out })
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { name?: string; description?: string; techStack?: string[]; ruleFormat?: string; skillFormat?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  const name = body.name?.trim()
  if (!name) return badRequest('Project name is required')

  const skillFormat: SkillFormat = body.skillFormat === 'opencode' ? 'opencode' : 'cursor'
  const ruleFormat: RuleFormat = body.ruleFormat === 'opencode' ? 'opencode' : 'cursor'

  try {
    const [row] = await db
      .insert(projects)
      .values({
        userId: auth.userId,
        name,
        description: body.description?.trim() ?? '',
        techStack: body.techStack ?? [],
        ruleFormat,
        skillFormat,
      })
      .returning()

    return NextResponse.json({
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        techStack: row.techStack ?? [],
        ruleFormat: (row.ruleFormat as RuleFormat) ?? 'cursor',
        skillFormat: (row.skillFormat as SkillFormat) ?? 'cursor',
        sections: [],
        skills: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections } from '@/lib/db/schema'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { serializeSection } from '@/lib/db/serialize'

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
      ? await db.select().from(sections)
      : []
    const sectionsByProject = new Map<string, typeof sectionRows>()
    for (const s of sectionRows) {
      if (!projectIds.includes(s.projectId)) continue
      const list = sectionsByProject.get(s.projectId) ?? []
      list.push(s)
      sectionsByProject.set(s.projectId, list)
    }

    const out = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      techStack: p.techStack ?? [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      sections: (sectionsByProject.get(p.id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map(serializeSection),
    }))

    return NextResponse.json({ projects: out })
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { name?: string; description?: string; techStack?: string[] }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  const name = body.name?.trim()
  if (!name) return badRequest('Project name is required')

  try {
    const [row] = await db
      .insert(projects)
      .values({
        userId: auth.userId,
        name,
        description: body.description?.trim() ?? '',
        techStack: body.techStack ?? [],
      })
      .returning()

    return NextResponse.json({
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        techStack: row.techStack ?? [],
        sections: [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return serverError(err)
  }
}

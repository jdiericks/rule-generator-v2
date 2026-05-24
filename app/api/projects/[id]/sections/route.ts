import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { serializeSection } from '@/lib/db/serialize'

export const runtime = 'nodejs'

async function ownsProject(userId: string, id: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)
  return !!row
}

interface IncomingSection {
  name?: string
  type?: string
  globs?: string
  alwaysApply?: boolean
  description?: string
  requirements?: string
  order?: number
}

function normalize(input: IncomingSection) {
  return {
    name: (input.name ?? '').trim() || 'Untitled Section',
    type: input.type ?? 'custom',
    globs: input.globs ?? '',
    alwaysApply: !!input.alwaysApply,
    description: input.description ?? '',
    requirements: input.requirements ?? '',
    order: typeof input.order === 'number' ? input.order : 0,
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { section?: IncomingSection; sections?: IncomingSection[]; techStack?: string[] }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  try {
    const ok = await ownsProject(auth.userId, params.id)
    if (!ok) return notFound('Project not found')

    if (Array.isArray(body.sections)) {
      // Bulk insert (template apply).
      const values = body.sections.map((s) => ({
        projectId: params.id,
        ...normalize(s),
      }))
      const rows = values.length
        ? await db.insert(sections).values(values).returning()
        : []

      if (Array.isArray(body.techStack)) {
        // Adopt template tech stack only if project currently has none.
        const [p] = await db
          .select({ techStack: projects.techStack })
          .from(projects)
          .where(eq(projects.id, params.id))
        if (p && (!p.techStack || p.techStack.length === 0)) {
          await db
            .update(projects)
            .set({ techStack: body.techStack, updatedAt: new Date() })
            .where(eq(projects.id, params.id))
        } else {
          await db
            .update(projects)
            .set({ updatedAt: new Date() })
            .where(eq(projects.id, params.id))
        }
      } else {
        await db
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(eq(projects.id, params.id))
      }

      return NextResponse.json({ sections: rows.map(serializeSection) })
    }

    if (!body.section) return badRequest('Missing `section`')

    const [row] = await db
      .insert(sections)
      .values({ projectId: params.id, ...normalize(body.section) })
      .returning()

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))

    return NextResponse.json({ section: serializeSection(row) })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { serializeSection } from '@/lib/db/serialize'
import { buildInitialMdc, buildTemplateContent } from '@/lib/mdc'

export const runtime = 'nodejs'

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

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
  generatedContent?: string
  order?: number
}

interface NormalizedSection {
  name: string
  type: string
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
  generatedContent: string
  filename: string
  order: number
}

function normalize(input: IncomingSection, opts: { templateApply?: boolean } = {}): NormalizedSection {
  const name = (input.name ?? '').trim() || 'Untitled Section'
  const globs = input.globs ?? ''
  const alwaysApply = !!input.alwaysApply
  const description = input.description ?? ''
  const requirements = input.requirements ?? ''

  // Always seed the generated rule content so the file is ready to ship the
  // moment a section is created. Callers can still pass their own
  // `generatedContent` to override.
  let generatedContent = input.generatedContent ?? ''
  if (!generatedContent.trim()) {
    if (opts.templateApply) {
      generatedContent = buildTemplateContent(
        { description, globs, alwaysApply },
        name,
        requirements
      )
    } else {
      generatedContent = buildInitialMdc(
        { description, globs, alwaysApply },
        name
      )
    }
  }

  // Template requirements live in the rule file body now (not duplicated in
  // the section's notes field).
  const storedRequirements = opts.templateApply ? '' : requirements

  return {
    name,
    type: input.type ?? 'custom',
    globs,
    alwaysApply,
    description,
    requirements: storedRequirements,
    generatedContent,
    filename: `${kebab(name)}.mdc`,
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
      const values = body.sections.map((s) => ({
        projectId: params.id,
        ...normalize(s, { templateApply: true }),
      }))
      const rows = values.length
        ? await db.insert(sections).values(values).returning()
        : []

      if (Array.isArray(body.techStack)) {
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

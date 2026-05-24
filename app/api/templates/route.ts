import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { userTemplates, type TemplateSectionData } from '@/lib/db/schema'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { TEMPLATES } from '@/lib/templates'
import type { RuleTemplate, SectionType, TemplateCategory } from '@/lib/types'

export const runtime = 'nodejs'

type StoredTemplate = RuleTemplate & {
  source: 'system' | 'user'
  updatedAt?: string
  createdAt?: string
}

function serializeUserTemplate(row: typeof userTemplates.$inferSelect): StoredTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as TemplateCategory,
    techTags: row.techTags ?? [],
    sections: (row.sections ?? []).map((s) => ({
      ...s,
      type: s.type as SectionType,
    })),
    source: 'user',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function withSystemSource(t: RuleTemplate): StoredTemplate {
  return { ...t, source: 'system' }
}

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const rows = await db
      .select()
      .from(userTemplates)
      .where(eq(userTemplates.userId, auth.userId))
      .orderBy(desc(userTemplates.updatedAt))
    return NextResponse.json({
      templates: [
        ...rows.map(serializeUserTemplate),
        ...TEMPLATES.map(withSystemSource),
      ],
    })
  } catch (err) {
    return serverError(err)
  }
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

function normalizeSection(s: IncomingSection, fallbackOrder: number): TemplateSectionData {
  return {
    name: (s.name ?? '').trim() || 'Untitled Section',
    type: s.type ?? 'custom',
    globs: s.globs ?? '',
    alwaysApply: !!s.alwaysApply,
    description: s.description ?? '',
    requirements: s.requirements ?? '',
    order: typeof s.order === 'number' ? s.order : fallbackOrder,
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: {
    name?: string
    description?: string
    category?: string
    techTags?: string[]
    sections?: IncomingSection[]
  }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  const name = body.name?.trim()
  if (!name) return badRequest('Template name is required')
  const sections = (body.sections ?? []).map((s, i) => normalizeSection(s, i))

  try {
    const [row] = await db
      .insert(userTemplates)
      .values({
        userId: auth.userId,
        name,
        description: body.description?.trim() ?? '',
        category: body.category?.trim() || 'custom',
        techTags: body.techTags ?? [],
        sections,
      })
      .returning()
    return NextResponse.json({ template: serializeUserTemplate(row) })
  } catch (err) {
    return serverError(err)
  }
}

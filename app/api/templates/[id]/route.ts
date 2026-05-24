import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { userTemplates, type TemplateSectionData } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import type { SectionType, TemplateCategory } from '@/lib/types'

export const runtime = 'nodejs'

async function loadOwned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(userTemplates)
    .where(and(eq(userTemplates.id, id), eq(userTemplates.userId, userId)))
    .limit(1)
  return row ?? null
}

function serialize(row: typeof userTemplates.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as TemplateCategory,
    techTags: row.techTags ?? [],
    sections: (row.sections ?? []).map((s) => ({ ...s, type: s.type as SectionType })),
    source: 'user' as const,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const existing = await loadOwned(auth.userId, params.id)
    if (!existing) return notFound('Template not found')

    const updates: Partial<typeof userTemplates.$inferInsert> = { updatedAt: new Date() }
    if (typeof body.name === 'string') {
      const n = body.name.trim()
      if (!n) return badRequest('Template name cannot be empty')
      updates.name = n
    }
    if (typeof body.description === 'string') updates.description = body.description
    if (typeof body.category === 'string') updates.category = body.category.trim() || 'custom'
    if (Array.isArray(body.techTags)) updates.techTags = body.techTags
    if (Array.isArray(body.sections)) {
      updates.sections = body.sections.map((s, i) => normalizeSection(s, i))
    }

    const [row] = await db
      .update(userTemplates)
      .set(updates)
      .where(eq(userTemplates.id, params.id))
      .returning()
    return NextResponse.json({ template: serialize(row) })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const existing = await loadOwned(auth.userId, params.id)
    if (!existing) return notFound('Template not found')
    await db.delete(userTemplates).where(eq(userTemplates.id, params.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

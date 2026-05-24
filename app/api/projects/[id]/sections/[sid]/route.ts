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

const EDITABLE = [
  'name',
  'type',
  'globs',
  'alwaysApply',
  'description',
  'requirements',
  'generatedContent',
  'filename',
  'order',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  try {
    const ok = await ownsProject(auth.userId, params.id)
    if (!ok) return notFound('Project not found')

    const updates: Record<string, unknown> = {}
    for (const k of EDITABLE) {
      if (k in body) updates[k] = body[k]
    }
    if (Object.keys(updates).length === 0) return badRequest('No editable fields supplied')

    const [row] = await db
      .update(sections)
      .set(updates)
      .where(and(eq(sections.id, params.sid), eq(sections.projectId, params.id)))
      .returning()
    if (!row) return notFound('Section not found')

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))

    return NextResponse.json({ section: serializeSection(row) })
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
    const ok = await ownsProject(auth.userId, params.id)
    if (!ok) return notFound('Project not found')
    await db
      .delete(sections)
      .where(and(eq(sections.id, params.sid), eq(sections.projectId, params.id)))
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { userSettings } from '@/lib/db/schema'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { encryptSecret } from '@/lib/crypto'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const [row] = await db
      .select({
        hint: userSettings.anthropicKeyHint,
        hasKey: userSettings.anthropicKeyCiphertext,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, auth.userId))
    return NextResponse.json({
      hasKey: !!row?.hasKey,
      hint: row?.hint ?? null,
    })
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { apiKey?: string }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }
  const key = body.apiKey?.trim() ?? ''
  if (!key) return badRequest('apiKey is required')

  try {
    const enc = encryptSecret(key)
    const hint = key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : '••••'
    await db
      .insert(userSettings)
      .values({
        userId: auth.userId,
        anthropicKeyCiphertext: enc.ciphertext,
        anthropicKeyIv: enc.iv,
        anthropicKeyTag: enc.tag,
        anthropicKeyHint: hint,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          anthropicKeyCiphertext: enc.ciphertext,
          anthropicKeyIv: enc.iv,
          anthropicKeyTag: enc.tag,
          anthropicKeyHint: hint,
          updatedAt: new Date(),
        },
      })
    return NextResponse.json({ ok: true, hint })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    await db
      .update(userSettings)
      .set({
        anthropicKeyCiphertext: null,
        anthropicKeyIv: null,
        anthropicKeyTag: null,
        anthropicKeyHint: null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, auth.userId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { userSettings } from '@/lib/db/schema'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'

export const runtime = 'nodejs'

const VALID_PROVIDERS = ['anthropic', 'ollama'] as const
type Provider = (typeof VALID_PROVIDERS)[number]

function normalizeBaseUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

export async function GET() {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth
  try {
    const [row] = await db
      .select({
        llmProvider: userSettings.llmProvider,
        ollamaBaseUrl: userSettings.ollamaBaseUrl,
        ollamaModel: userSettings.ollamaModel,
        hasAnthropicKey: userSettings.anthropicKeyCiphertext,
        anthropicKeyHint: userSettings.anthropicKeyHint,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, auth.userId))
    return NextResponse.json({
      provider: (row?.llmProvider as Provider | undefined) ?? 'anthropic',
      ollamaBaseUrl: row?.ollamaBaseUrl ?? null,
      ollamaModel: row?.ollamaModel ?? null,
      hasAnthropicKey: !!row?.hasAnthropicKey,
      anthropicKeyHint: row?.anthropicKeyHint ?? null,
    })
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { provider?: string; ollamaBaseUrl?: string | null; ollamaModel?: string | null }
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  const provider = body.provider as Provider | undefined
  if (provider && !VALID_PROVIDERS.includes(provider)) {
    return badRequest(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`)
  }

  const baseUrl = normalizeBaseUrl(body.ollamaBaseUrl)
  if (body.ollamaBaseUrl && body.ollamaBaseUrl.trim() && !baseUrl) {
    return badRequest('ollamaBaseUrl must be an http(s) URL, e.g. http://localhost:11434')
  }
  const model = body.ollamaModel?.trim() || null

  if (provider === 'ollama' && !baseUrl) {
    return badRequest('Ollama base URL is required when selecting the Ollama provider')
  }

  try {
    const insertValues = {
      userId: auth.userId,
      llmProvider: provider ?? 'anthropic',
      ollamaBaseUrl: baseUrl,
      ollamaModel: model,
      updatedAt: new Date(),
    }
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    }
    if (provider) updateValues.llmProvider = provider
    if ('ollamaBaseUrl' in body) updateValues.ollamaBaseUrl = baseUrl
    if ('ollamaModel' in body) updateValues.ollamaModel = model

    await db
      .insert(userSettings)
      .values(insertValues)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: updateValues,
      })

    return NextResponse.json({
      ok: true,
      provider: provider ?? 'anthropic',
      ollamaBaseUrl: baseUrl,
      ollamaModel: model,
    })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { getStoredAnthropicKey } from '@/lib/anthropic-key'
import {
  RULE_GENERATION_SYSTEM_PROMPT,
  buildDraftPrompt,
  buildExpandPrompt,
} from '@/lib/prompts'

export const runtime = 'nodejs'

type Mode = 'draft' | 'expand'

interface GenerateBody {
  mode?: Mode
  projectName?: string
  projectDescription?: string
  techStack?: string[]
  existingContent?: string
  section?: {
    name: string
    type: string
    globs: string
    alwaysApply: boolean
    description: string
    requirements: string
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  const apiKey = await getStoredAnthropicKey(auth.userId)
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Anthropic API key not configured. AI assistance is optional — add a key or switch to a local Ollama provider in Settings.',
      },
      { status: 412 }
    )
  }

  let body: GenerateBody
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  const { mode = 'draft', projectName, projectDescription, techStack, section, existingContent } = body
  if (!section) return badRequest('Missing section data')
  if (mode === 'expand' && !existingContent?.trim()) {
    return badRequest('`expand` mode requires `existingContent`')
  }

  const project = { projectName, projectDescription, techStack }
  const userPrompt =
    mode === 'expand'
      ? buildExpandPrompt(project, section, existingContent!)
      : buildDraftPrompt(project, section)

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: RULE_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const content = (message.content[0] as { text: string }).text
    return NextResponse.json({ content, mode, provider: 'anthropic' })
  } catch (err) {
    return serverError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { getStoredAnthropicKey } from '@/lib/anthropic-key'
import {
  SYSTEM_PROMPTS,
  buildRuleDraftPrompt,
  buildRuleExpandPrompt,
  buildSkillDraftPrompt,
  buildSkillExpandPrompt,
  type RuleSectionPrompt,
  type SkillPrompt,
} from '@/lib/prompts'

export const runtime = 'nodejs'

type Mode = 'draft' | 'expand'
type Kind = 'rule' | 'skill'

interface GenerateBody {
  kind?: Kind
  mode?: Mode
  projectName?: string
  projectDescription?: string
  techStack?: string[]
  existingContent?: string
  notes?: string
  section?: RuleSectionPrompt
  skill?: SkillPrompt
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  const apiKey = await getStoredAnthropicKey(auth.userId)
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Anthropic API key not configured. AI assistance is optional — add a key in Settings to use it.',
      },
      { status: 412 }
    )
  }

  let body: GenerateBody
  try { body = await req.json() } catch { return badRequest('Invalid JSON body') }

  const { kind = 'rule', mode = 'draft', projectName, projectDescription, techStack, existingContent, notes } = body
  if (mode === 'expand' && !existingContent?.trim()) {
    return badRequest('`expand` mode requires `existingContent`')
  }

  const project = { projectName, projectDescription, techStack }
  let system: string
  let user: string

  if (kind === 'skill') {
    if (!body.skill) return badRequest('Missing `skill` data')
    system = SYSTEM_PROMPTS.skill
    user =
      mode === 'expand'
        ? buildSkillExpandPrompt(project, body.skill, existingContent!, notes)
        : buildSkillDraftPrompt(project, body.skill, notes)
  } else {
    if (!body.section) return badRequest('Missing `section` data')
    system = SYSTEM_PROMPTS.rule
    user =
      mode === 'expand'
        ? buildRuleExpandPrompt(project, body.section, existingContent!)
        : buildRuleDraftPrompt(project, body.section)
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const content = (message.content[0] as { text: string }).text
    return NextResponse.json({ content, mode, kind })
  } catch (err) {
    return serverError(err)
  }
}

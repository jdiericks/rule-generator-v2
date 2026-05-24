import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireUserId, badRequest, serverError } from '@/lib/api-utils'
import { getStoredAnthropicKey } from '@/lib/anthropic-key'

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
          'Anthropic API key not configured. AI assistance is optional — add a key in Settings to use it.',
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

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are an expert in Cursor AI rules (.mdc files) and software engineering best practices.
Generate high-quality, specific, and opinionated .mdc rule files.

MDC format:
---
description: One-line description of what this rule enforces
globs: comma-separated glob patterns (leave empty string if alwaysApply is true and no specific files)
alwaysApply: true or false
---

# Rule Title

## Section

Content with actionable rules...

Rules for good MDC files:
- Be specific and opinionated — vague rules are useless to Cursor
- Include concrete code examples in fenced code blocks where helpful
- Cover the "why" briefly for non-obvious rules
- Use nested bullet points for related sub-rules
- Tailor everything precisely to the tech stack provided
- Output ONLY the raw MDC file content starting with ---
- No preamble, no explanation, just the MDC`

  const projectBlock = `PROJECT:
  Name: ${projectName || 'My Project'}
  Description: ${projectDescription || 'A software project'}
  Tech Stack: ${techStack?.join(', ') || 'Not specified'}

RULE SECTION:
  Name: ${section.name}
  Type: ${section.type}
  Globs: ${section.globs || '(not specified — applies broadly)'}
  Always Apply: ${section.alwaysApply}
  Purpose: ${section.description || 'Not specified'}`

  const userPrompt =
    mode === 'expand'
      ? `Expand and refine the existing Cursor .mdc rule file below.

${projectBlock}

AUTHOR NOTES (optional priorities, requirements, or things to emphasize):
${section.requirements || '(none — use your judgement to expand thoroughly)'}

EXISTING .mdc CONTENT:
"""
${existingContent}
"""

Rewrite the file so it:
- Preserves every intent and rule already present
- Fills in concrete examples, edge cases, and rationale where it would help
- Tightens vague language into specific, enforceable rules
- Keeps the MDC frontmatter consistent with the section's globs / alwaysApply

Output the complete MDC file starting with ---. No preamble.`
      : `Generate a .mdc Cursor rules file.

${projectBlock}

DEVELOPER REQUIREMENTS:
${section.requirements || 'Apply industry best practices for this rule type.'}

Output the complete MDC file starting with ---`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const content = (message.content[0] as { text: string }).text
    return NextResponse.json({ content, mode })
  } catch (err) {
    return serverError(err)
  }
}

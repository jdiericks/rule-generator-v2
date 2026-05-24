import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const body = await req.json()
  const { projectName, projectDescription, techStack, section } = body

  if (!section) {
    return NextResponse.json({ error: 'Missing section data' }, { status: 400 })
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

  const userPrompt = `Generate a .mdc Cursor rules file.

PROJECT:
  Name: ${projectName || 'My Project'}
  Description: ${projectDescription || 'A software project'}
  Tech Stack: ${techStack?.join(', ') || 'Not specified'}

RULE SECTION:
  Name: ${section.name}
  Type: ${section.type}
  Globs: ${section.globs || '(not specified — applies broadly)'}
  Always Apply: ${section.alwaysApply}
  Purpose: ${section.description || 'Not specified'}

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
    return NextResponse.json({ content })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

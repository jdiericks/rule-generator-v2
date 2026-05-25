// Shared system + user prompt construction for generating / expanding
// .mdc rule files. Used by both the server-side Anthropic path and the
// client-side Ollama path so the two providers produce comparable output.

export const RULE_GENERATION_SYSTEM_PROMPT = `You are an expert in .mdc rule files (Cursor, Windsurf, and other compatible AI coding tools) and software engineering best practices.
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
- Be specific and opinionated — vague rules are useless to the AI
- Include concrete code examples in fenced code blocks where helpful
- Cover the "why" briefly for non-obvious rules
- Use nested bullet points for related sub-rules
- Tailor everything precisely to the tech stack provided
- Output ONLY the raw MDC file content starting with ---
- No preamble, no explanation, just the MDC`

export interface SectionPromptInput {
  name: string
  type: string
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
}

export interface ProjectPromptInput {
  projectName?: string
  projectDescription?: string
  techStack?: string[]
}

function projectBlock(p: ProjectPromptInput, s: SectionPromptInput): string {
  return `PROJECT:
  Name: ${p.projectName || 'My Project'}
  Description: ${p.projectDescription || 'A software project'}
  Tech Stack: ${p.techStack?.join(', ') || 'Not specified'}

RULE SECTION:
  Name: ${s.name}
  Type: ${s.type}
  Globs: ${s.globs || '(not specified — applies broadly)'}
  Always Apply: ${s.alwaysApply}
  Purpose: ${s.description || 'Not specified'}`
}

export function buildDraftPrompt(p: ProjectPromptInput, s: SectionPromptInput): string {
  return `Generate a .mdc rule file.

${projectBlock(p, s)}

DEVELOPER REQUIREMENTS:
${s.requirements || 'Apply industry best practices for this rule type.'}

Output the complete MDC file starting with ---`
}

export function buildExpandPrompt(
  p: ProjectPromptInput,
  s: SectionPromptInput,
  existingContent: string
): string {
  return `Expand and refine the existing .mdc rule file below.

${projectBlock(p, s)}

AUTHOR NOTES (optional priorities, requirements, or things to emphasize):
${s.requirements || '(none — use your judgement to expand thoroughly)'}

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
}

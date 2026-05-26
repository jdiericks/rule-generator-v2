// Shared system + user prompt construction for the AI assist.
// Consumed by both the server-side Anthropic path and the client-side
// Ollama path so the two providers produce comparable output, plus the
// rule + skill kinds both flow through here.

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

export const SKILL_GENERATION_SYSTEM_PROMPT = `You are an expert in AI coding-agent skills (Cursor, OpenCode, Claude Code, and compatible tools).
A skill is a markdown file describing a reusable capability the agent can read on demand.

SKILL.md format:
---
name: Concise skill name
description: One- to two-sentence summary of when the agent should reach for this skill
---

# Skill Title

(Optional) ## When to use
- Concrete trigger conditions / signals

## Steps
1. Sequence of actions the agent walks through
2. Include code snippets where it materially helps

## References
- Files, docs, or commands the agent should consult

Rules for good skill files:
- Make the description specific enough that the agent can recognise when it applies
- Be operational, not theoretical — give the agent steps and concrete examples
- Tailor everything to the project's tech stack
- Output ONLY the raw markdown file starting with ---. No preamble, no explanation`

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

export interface SkillPromptInput {
  name: string
  description: string
  allowedTools: string[]
}

function projectBlock(p: ProjectPromptInput): string {
  return `PROJECT:
  Name: ${p.projectName || 'My Project'}
  Description: ${p.projectDescription || 'A software project'}
  Tech Stack: ${p.techStack?.join(', ') || 'Not specified'}`
}

function ruleSectionBlock(s: SectionPromptInput): string {
  return `RULE SECTION:
  Name: ${s.name}
  Type: ${s.type}
  Globs: ${s.globs || '(not specified — applies broadly)'}
  Always Apply: ${s.alwaysApply}
  Purpose: ${s.description || 'Not specified'}`
}

function skillBlock(s: SkillPromptInput): string {
  return `SKILL:
  Name: ${s.name}
  Description: ${s.description || 'Not specified'}
  Allowed Tools: ${s.allowedTools.length ? s.allowedTools.join(', ') : '(any)'}`
}

// --- Rules --------------------------------------------------------------

export function buildDraftPrompt(p: ProjectPromptInput, s: SectionPromptInput): string {
  return `Generate a .mdc rule file.

${projectBlock(p)}

${ruleSectionBlock(s)}

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

${projectBlock(p)}

${ruleSectionBlock(s)}

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

// --- Skills -------------------------------------------------------------

export function buildSkillDraftPrompt(
  p: ProjectPromptInput,
  s: SkillPromptInput,
  notes?: string
): string {
  return `Generate a SKILL.md file for an AI coding agent.

${projectBlock(p)}

${skillBlock(s)}

AUTHOR NOTES:
${notes || 'Use your judgement based on the skill name + description.'}

Output the complete markdown file starting with ---. No preamble.`
}

export function buildSkillExpandPrompt(
  p: ProjectPromptInput,
  s: SkillPromptInput,
  existingContent: string,
  notes?: string
): string {
  return `Expand and refine the existing SKILL.md file below.

${projectBlock(p)}

${skillBlock(s)}

AUTHOR NOTES:
${notes || '(none — use your judgement to expand thoroughly)'}

EXISTING SKILL.md:
"""
${existingContent}
"""

Rewrite the file so it preserves every existing instruction, adds concrete steps / examples / references where they help the agent succeed, and keeps the frontmatter consistent with the skill's name + description.

Output the complete markdown file starting with ---. No preamble.`
}

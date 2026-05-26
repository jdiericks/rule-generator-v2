// Shared prompt construction for the AI assist. Currently used by the
// server-side Anthropic path; the same helpers will be reused by any
// future client-side providers so both produce comparable output.

const RULE_SYSTEM = `You are an expert in .mdc rule files (Cursor, Windsurf, and other compatible AI coding tools) and software engineering best practices.
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

const SKILL_SYSTEM = `You are an expert in AI coding-agent skills (Cursor, OpenCode, Claude Code, and compatible tools).
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

export interface ProjectPromptInput {
  projectName?: string
  projectDescription?: string
  techStack?: string[]
}

function projectHeader(p: ProjectPromptInput): string {
  return `PROJECT:
  Name: ${p.projectName || 'My Project'}
  Description: ${p.projectDescription || 'A software project'}
  Tech Stack: ${p.techStack?.join(', ') || 'Not specified'}`
}

// --- Rules --------------------------------------------------------------

export interface RuleSectionPrompt {
  name: string
  type: string
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
}

export function buildRuleDraftPrompt(p: ProjectPromptInput, s: RuleSectionPrompt): string {
  return `Generate a .mdc rule file.

${projectHeader(p)}

RULE SECTION:
  Name: ${s.name}
  Type: ${s.type}
  Globs: ${s.globs || '(not specified — applies broadly)'}
  Always Apply: ${s.alwaysApply}
  Purpose: ${s.description || 'Not specified'}

DEVELOPER REQUIREMENTS:
${s.requirements || 'Apply industry best practices for this rule type.'}

Output the complete MDC file starting with ---`
}

export function buildRuleExpandPrompt(
  p: ProjectPromptInput,
  s: RuleSectionPrompt,
  existing: string
): string {
  return `Expand and refine the existing .mdc rule file below.

${projectHeader(p)}

RULE SECTION:
  Name: ${s.name}
  Type: ${s.type}
  Globs: ${s.globs || '(not specified — applies broadly)'}
  Always Apply: ${s.alwaysApply}
  Purpose: ${s.description || 'Not specified'}

AUTHOR NOTES:
${s.requirements || '(none — use your judgement to expand thoroughly)'}

EXISTING .mdc CONTENT:
"""
${existing}
"""

Rewrite the file so it preserves every intent already present, fills in concrete examples + edge cases + rationale where it would help, tightens vague language into specific enforceable rules, and keeps the frontmatter consistent with the section's globs / alwaysApply.

Output the complete MDC file starting with ---. No preamble.`
}

// --- Skills -------------------------------------------------------------

export interface SkillPrompt {
  name: string
  description: string
  allowedTools: string[]
}

function skillHeader(s: SkillPrompt): string {
  return `SKILL:
  Name: ${s.name}
  Description: ${s.description || 'Not specified'}
  Allowed Tools: ${s.allowedTools.length ? s.allowedTools.join(', ') : '(any)'}`
}

export function buildSkillDraftPrompt(
  p: ProjectPromptInput,
  s: SkillPrompt,
  notes?: string
): string {
  return `Generate a SKILL.md file for an AI coding agent.

${projectHeader(p)}

${skillHeader(s)}

AUTHOR NOTES:
${notes || 'Use your judgement based on the skill name + description.'}

Output the complete markdown file starting with ---. No preamble.`
}

export function buildSkillExpandPrompt(
  p: ProjectPromptInput,
  s: SkillPrompt,
  existing: string,
  notes?: string
): string {
  return `Expand and refine the existing SKILL.md file below.

${projectHeader(p)}

${skillHeader(s)}

AUTHOR NOTES:
${notes || '(none — use your judgement to expand thoroughly)'}

EXISTING SKILL.md:
"""
${existing}
"""

Rewrite the file so it preserves every existing instruction, adds concrete steps / examples / references where they help the agent succeed, and keeps the frontmatter consistent with the skill's name + description.

Output the complete markdown file starting with ---. No preamble.`
}

export const SYSTEM_PROMPTS = {
  rule: RULE_SYSTEM,
  skill: SKILL_SYSTEM,
}

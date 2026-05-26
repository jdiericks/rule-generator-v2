// Skill = a reusable, progressively-loaded capability description that
// AI coding tools (Cursor, OpenCode, Claude Code, etc.) can read on
// demand. The content is markdown with YAML frontmatter holding the
// skill's name, description, and (optionally) the list of tools the AI
// is allowed to call while the skill is active.
//
// Different tools place the file at slightly different paths and use
// slightly different folder shapes — handle that here so the rest of
// the app stays format-agnostic.

export type SkillFormat = 'cursor' | 'opencode'

export const SKILL_FORMATS: { value: SkillFormat; label: string; description: string }[] = [
  {
    value: 'cursor',
    label: 'Cursor',
    description: 'One folder per skill at .cursor/skills/<slug>/SKILL.md',
  },
  {
    value: 'opencode',
    label: 'OpenCode',
    description: 'Single file per skill at .opencode/skill/<slug>.md',
  },
]

export interface SkillFrontMatter {
  name: string
  description: string
  allowedTools?: string[]
}

export function buildSkillFrontMatter(meta: SkillFrontMatter): string {
  const lines = [
    '---',
    `name: ${meta.name || ''}`,
    `description: ${meta.description || ''}`,
  ]
  if (meta.allowedTools && meta.allowedTools.length > 0) {
    lines.push(`allowed-tools: [${meta.allowedTools.map((t) => JSON.stringify(t)).join(', ')}]`)
  }
  lines.push('---')
  return lines.join('\n')
}

export function buildInitialSkillBody(meta: SkillFrontMatter): string {
  const fm = buildSkillFrontMatter(meta)
  const head = `# ${(meta.name || 'Skill').trim()}`
  const stub = `Describe when this skill should run, the steps it walks the AI through, and any references it should consult.`
  return [fm, '', head, '', stub].join('\n').replace(/\n+$/, '') + '\n'
}

/**
 * Replace just the frontmatter block of an existing skill file with one
 * derived from the skill's current metadata. The markdown body is left
 * intact, so manual edits survive metadata changes.
 */
export function syncSkillFrontMatter(existing: string, meta: SkillFrontMatter): string {
  if (!existing || !existing.trim()) return buildInitialSkillBody(meta)
  const trimmed = existing.replace(/^\s+/, '')
  const m = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const newFm = buildSkillFrontMatter(meta)
  if (!m) {
    return `${newFm}\n\n${trimmed}`.replace(/\n+$/, '') + '\n'
  }
  return `${newFm}\n${trimmed.slice(m[0].length)}`.replace(/\n+$/, '') + '\n'
}

export function skillSlug(name: string): string {
  return (name || 'skill')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'skill'
}

/**
 * Repo-relative output path for a single skill given the project's
 * configured `skillFormat`. Returns the path AND the content as it
 * should be written — currently identical across formats, but kept
 * together so future format-specific tweaks land in one place.
 */
export function skillFilePath(format: SkillFormat, name: string): string {
  const slug = skillSlug(name)
  switch (format) {
    case 'opencode':
      return `.opencode/skill/${slug}.md`
    case 'cursor':
    default:
      return `.cursor/skills/${slug}/SKILL.md`
  }
}

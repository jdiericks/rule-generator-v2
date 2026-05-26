import type { RuleFormat } from './types'

export const RULE_FORMATS: { value: RuleFormat; label: string; description: string }[] = [
  {
    value: 'cursor',
    label: 'Cursor',
    description: 'One file per rule at .cursor/rules/<slug>.mdc',
  },
  {
    value: 'opencode',
    label: 'OpenCode',
    description: 'One file per rule at .opencode/rule/<slug>.md',
  },
]

function slug(name: string): string {
  return (name || 'rule')
    .toLowerCase()
    .replace(/\.mdc?$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'rule'
}

/**
 * Repo-relative path where the rule file should live for the given format.
 * If the section already has a stored filename, its slug is reused so users
 * who renamed a section keep their existing filename style.
 */
export function ruleFilePath(format: RuleFormat, name: string, storedFilename?: string): string {
  const base = slug(storedFilename || name)
  switch (format) {
    case 'opencode':
      return `.opencode/rule/${base}.md`
    case 'cursor':
    default:
      return `.cursor/rules/${base}.mdc`
  }
}

/**
 * Basename portion of the rule file (e.g. `code-style.mdc` or `code-style.md`).
 */
export function ruleFilename(format: RuleFormat, name: string, storedFilename?: string): string {
  return ruleFilePath(format, name, storedFilename).split('/').pop() ?? `${slug(name)}.mdc`
}

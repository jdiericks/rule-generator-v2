// Helpers for the .mdc rule-file format used by Cursor and compatible
// AI coding tools:
//
//   ---
//   description: ...
//   globs: ...
//   alwaysApply: true|false
//   ---
//
//   # Title
//   body...
//
// We keep the frontmatter in sync with the section's metadata fields so
// users don't have to maintain the header by hand.

export interface FrontMatter {
  description: string
  globs: string
  alwaysApply: boolean
}

export function buildFrontMatter(meta: FrontMatter): string {
  return [
    '---',
    `description: ${meta.description ?? ''}`,
    `globs: ${meta.globs ?? ''}`,
    `alwaysApply: ${meta.alwaysApply ? 'true' : 'false'}`,
    '---',
  ].join('\n')
}

/**
 * Split an MDC file into its frontmatter body and the markdown body. Returns
 * `frontmatter: null` when the input has no parseable frontmatter (legacy or
 * partially-typed content).
 */
export function splitContent(content: string): {
  frontmatter: string | null
  body: string
} {
  const trimmedLeading = content.replace(/^\s+/, '')
  const m = trimmedLeading.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { frontmatter: null, body: content }
  const body = trimmedLeading.slice(m[0].length)
  return { frontmatter: m[1], body }
}

/**
 * Build a starter .mdc file for a freshly-created section: frontmatter +
 * blank-line + `# Heading` (with optional body content appended).
 */
export function buildInitialMdc(
  meta: FrontMatter,
  name: string,
  body: string = ''
): string {
  const head = `# ${(name || 'Rule').trim()}`
  const parts = [buildFrontMatter(meta), '', head]
  if (body && body.trim()) {
    parts.push('', body.trim())
  }
  return parts.join('\n').replace(/\n+$/, '') + '\n'
}

/**
 * Build the file content for a section pulled in from a template. The
 * template's bullet-list "requirements" become the body under a `## Rules`
 * heading so users don't have to copy them out of the notes field.
 */
export function buildTemplateContent(
  meta: FrontMatter,
  name: string,
  requirements: string
): string {
  const trimmed = (requirements ?? '').trim()
  if (!trimmed) return buildInitialMdc(meta, name)
  return buildInitialMdc(meta, name, `## Rules\n\n${trimmed}`)
}

/**
 * Replace just the frontmatter block of an existing .mdc file with one
 * derived from the section's current metadata. The markdown body is left
 * untouched, so any manual edits the user made survive metadata changes.
 *
 * If the existing content has no frontmatter, one is prepended. If the
 * content is empty, we build a full starter file via `buildInitialMdc`.
 */
export function syncFrontMatter(
  existingContent: string,
  meta: FrontMatter,
  name: string
): string {
  if (!existingContent || !existingContent.trim()) {
    return buildInitialMdc(meta, name)
  }
  const { frontmatter, body } = splitContent(existingContent)
  const newFm = buildFrontMatter(meta)
  if (frontmatter === null) {
    const trimmedBody = existingContent.replace(/^\s+/, '')
    return `${newFm}\n\n${trimmedBody}`.replace(/\n+$/, '') + '\n'
  }
  // Preserve the body (including its leading whitespace) exactly.
  return `${newFm}\n${body}`.replace(/\n+$/, '') + '\n'
}

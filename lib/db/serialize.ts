import type { sections, skills } from './schema'

export function serializeSection(s: typeof sections.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    globs: s.globs,
    alwaysApply: s.alwaysApply,
    description: s.description,
    requirements: s.requirements,
    generatedContent: s.generatedContent,
    filename: s.filename,
    order: s.order,
  }
}

export function serializeSkill(s: typeof skills.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    body: s.body,
    allowedTools: s.allowedTools ?? [],
    order: s.order,
  }
}

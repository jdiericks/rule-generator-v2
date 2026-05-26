'use client'
import { getLlmSettings, LlmSettings } from './storage'
import { ollamaChat } from './ollama'
import {
  RULE_GENERATION_SYSTEM_PROMPT,
  SKILL_GENERATION_SYSTEM_PROMPT,
  buildDraftPrompt,
  buildExpandPrompt,
  buildSkillDraftPrompt,
  buildSkillExpandPrompt,
} from './prompts'

export type GenerateMode = 'draft' | 'expand'

interface ProjectInput {
  name: string
  description: string
  techStack: string[]
}

interface SectionInput {
  name: string
  type: string
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
}

interface SkillInput {
  name: string
  description: string
  allowedTools: string[]
}

export interface GenerateRuleOptions {
  mode: GenerateMode
  project: ProjectInput
  section: SectionInput
  existingContent?: string
}

export interface GenerateSkillOptions {
  mode: GenerateMode
  project: ProjectInput
  skill: SkillInput
  notes?: string
  existingContent?: string
}

export interface GenerateResult {
  content: string
  mode: GenerateMode
  provider: 'anthropic' | 'ollama'
}

export async function loadLlmStatus(): Promise<LlmSettings & { ready: boolean }> {
  const s = await getLlmSettings()
  const ready =
    s.provider === 'anthropic'
      ? s.hasAnthropicKey
      : Boolean(s.ollamaBaseUrl && s.ollamaModel)
  return { ...s, ready }
}

function projectPromptInput(p: ProjectInput) {
  return {
    projectName: p.name,
    projectDescription: p.description,
    techStack: p.techStack,
  }
}

function notReadyMessage(status: { provider: LlmSettings['provider'] }) {
  return status.provider === 'ollama'
    ? 'Configure an Ollama base URL and model in Settings before using AI assist.'
    : 'Configure an Anthropic API key in Settings or switch to a local Ollama provider.'
}

/**
 * Draft or expand a .mdc rule file using whichever provider is configured.
 * Anthropic stays server-side; Ollama goes browser → local daemon.
 */
export async function generateRule(opts: GenerateRuleOptions): Promise<GenerateResult> {
  const status = await loadLlmStatus()
  if (!status.ready) throw new Error(notReadyMessage(status))

  if (status.provider === 'ollama') {
    const userPrompt =
      opts.mode === 'expand'
        ? buildExpandPrompt(
            projectPromptInput(opts.project),
            opts.section,
            opts.existingContent ?? ''
          )
        : buildDraftPrompt(projectPromptInput(opts.project), opts.section)
    const { content } = await ollamaChat(
      status.ollamaBaseUrl!,
      status.ollamaModel!,
      RULE_GENERATION_SYSTEM_PROMPT,
      userPrompt
    )
    return { content, mode: opts.mode, provider: 'ollama' }
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'rule',
      mode: opts.mode,
      projectName: opts.project.name,
      projectDescription: opts.project.description,
      techStack: opts.project.techStack,
      existingContent: opts.existingContent,
      section: opts.section,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Generation failed')
  return { content: data.content as string, mode: opts.mode, provider: 'anthropic' }
}

/**
 * Draft or expand a SKILL.md file using whichever provider is configured.
 */
export async function generateSkill(opts: GenerateSkillOptions): Promise<GenerateResult> {
  const status = await loadLlmStatus()
  if (!status.ready) throw new Error(notReadyMessage(status))

  if (status.provider === 'ollama') {
    const userPrompt =
      opts.mode === 'expand'
        ? buildSkillExpandPrompt(
            projectPromptInput(opts.project),
            opts.skill,
            opts.existingContent ?? '',
            opts.notes
          )
        : buildSkillDraftPrompt(projectPromptInput(opts.project), opts.skill, opts.notes)
    const { content } = await ollamaChat(
      status.ollamaBaseUrl!,
      status.ollamaModel!,
      SKILL_GENERATION_SYSTEM_PROMPT,
      userPrompt
    )
    return { content, mode: opts.mode, provider: 'ollama' }
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'skill',
      mode: opts.mode,
      projectName: opts.project.name,
      projectDescription: opts.project.description,
      techStack: opts.project.techStack,
      existingContent: opts.existingContent,
      notes: opts.notes,
      skill: opts.skill,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Generation failed')
  return { content: data.content as string, mode: opts.mode, provider: 'anthropic' }
}

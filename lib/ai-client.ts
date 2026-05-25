'use client'
import { getLlmSettings, LlmSettings } from './storage'
import { ollamaChat } from './ollama'
import {
  RULE_GENERATION_SYSTEM_PROMPT,
  buildDraftPrompt,
  buildExpandPrompt,
} from './prompts'

export type GenerateMode = 'draft' | 'expand'

export interface GenerateOptions {
  mode: GenerateMode
  project: { name: string; description: string; techStack: string[] }
  section: {
    name: string
    type: string
    globs: string
    alwaysApply: boolean
    description: string
    requirements: string
  }
  existingContent?: string
}

export interface GenerateResult {
  content: string
  mode: GenerateMode
  provider: 'anthropic' | 'ollama'
}

/**
 * Returns the user's LLM configuration plus a flag describing whether the
 * AI assist is usable as currently configured.
 */
export async function loadLlmStatus(): Promise<LlmSettings & { ready: boolean }> {
  const s = await getLlmSettings()
  const ready =
    s.provider === 'anthropic'
      ? s.hasAnthropicKey
      : Boolean(s.ollamaBaseUrl && s.ollamaModel)
  return { ...s, ready }
}

/**
 * Dispatches a draft/expand request through the configured provider. For
 * Anthropic, the call goes server-side to keep the API key on the server.
 * For Ollama, the browser talks to the user's local daemon directly so the
 * request never leaves their network.
 */
export async function generateRule(opts: GenerateOptions): Promise<GenerateResult> {
  const status = await loadLlmStatus()
  if (!status.ready) {
    throw new Error(
      status.provider === 'ollama'
        ? 'Configure an Ollama base URL and model in Settings before using AI assist.'
        : 'Configure an Anthropic API key in Settings or switch to a local Ollama provider.'
    )
  }

  if (status.provider === 'ollama') {
    const userPrompt =
      opts.mode === 'expand'
        ? buildExpandPrompt(
            {
              projectName: opts.project.name,
              projectDescription: opts.project.description,
              techStack: opts.project.techStack,
            },
            opts.section,
            opts.existingContent ?? ''
          )
        : buildDraftPrompt(
            {
              projectName: opts.project.name,
              projectDescription: opts.project.description,
              techStack: opts.project.techStack,
            },
            opts.section
          )
    const { content } = await ollamaChat(
      status.ollamaBaseUrl!,
      status.ollamaModel!,
      RULE_GENERATION_SYSTEM_PROMPT,
      userPrompt
    )
    return { content, mode: opts.mode, provider: 'ollama' }
  }

  // Anthropic — keep the request server-side.
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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

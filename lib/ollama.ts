'use client'
// Ollama is the user's own LLM runtime, usually running on their local
// machine. The browser talks to it directly using the user-configured
// base URL — no server proxy involved — so no API keys are exposed and
// requests never leave the user's network.
//
// CORS: Ollama by default only allows requests from `http://localhost:*`.
// To use it from a hosted version of this app, the user has to start
// Ollama with `OLLAMA_ORIGINS="*"` (or the app's origin). We surface
// network errors clearly so this is obvious in the UI.

export interface OllamaModel {
  name: string
  size?: number
  modifiedAt?: string
  family?: string
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

async function ollamaFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`
  try {
    return await fetch(url, init)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    throw new Error(
      `Couldn't reach Ollama at ${url} (${msg}). Make sure Ollama is running and started with OLLAMA_ORIGINS allowing this app's origin.`
    )
  }
}

export async function listOllamaModels(baseUrl: string): Promise<OllamaModel[]> {
  const res = await ollamaFetch(baseUrl, '/api/tags')
  if (!res.ok) {
    throw new Error(`Ollama responded ${res.status}: ${await res.text().catch(() => '')}`)
  }
  const data = (await res.json()) as {
    models?: Array<{ name: string; size?: number; modified_at?: string; details?: { family?: string } }>
  }
  return (data.models ?? []).map((m) => ({
    name: m.name,
    size: m.size,
    modifiedAt: m.modified_at,
    family: m.details?.family,
  }))
}

export interface OllamaChatResult {
  content: string
}

/**
 * Send a chat completion request to a local Ollama daemon. Streaming is
 * disabled so the call resolves to a single MDC string.
 */
export async function ollamaChat(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<OllamaChatResult> {
  if (!model) throw new Error('No Ollama model selected')
  const res = await ollamaFetch(baseUrl, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        // Match Anthropic call ceiling so larger sections still render.
        num_predict: 1500,
      },
    }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string }
      detail = body.error ? ` — ${body.error}` : ''
    } catch {
      detail = ` — ${await res.text().catch(() => '')}`
    }
    throw new Error(`Ollama responded ${res.status}${detail}`)
  }
  const data = (await res.json()) as { message?: { content?: string }; response?: string }
  const content = data.message?.content ?? data.response ?? ''
  if (!content) throw new Error('Ollama returned an empty response')
  return { content }
}

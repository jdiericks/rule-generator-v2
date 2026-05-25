'use client'
import { useEffect, useState } from 'react'
import {
  getApiKeyStatus,
  saveApiKey,
  clearApiKey,
  getLlmSettings,
  updateLlmSettings,
  LlmSettings,
  LlmProvider,
} from '@/lib/storage'
import { listOllamaModels, OllamaModel } from '@/lib/ollama'

interface Props {
  onClose: () => void
  onChanged?: () => void
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'

export default function SettingsModal({ onClose, onChanged }: Props) {
  const [settings, setSettings] = useState<LlmSettings | null>(null)
  const [provider, setProvider] = useState<LlmProvider>('anthropic')

  // Anthropic
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keyHint, setKeyHint] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(false)

  // Ollama
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('')
  const [ollamaModel, setOllamaModel] = useState('')
  const [savingProvider, setSavingProvider] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState<OllamaModel[] | null>(null)
  const [ollamaError, setOllamaError] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [llm, key] = await Promise.all([getLlmSettings(), getApiKeyStatus()])
        setSettings(llm)
        setProvider(llm.provider)
        setOllamaBaseUrl(llm.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL)
        setOllamaModel(llm.ollamaModel ?? '')
        setHasKey(key.hasKey)
        setKeyHint(key.hint)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      }
    })()
  }, [])

  async function handleSaveKey() {
    if (!apiKey.trim()) return
    setSavingKey(true)
    setError(null)
    try {
      const res = await saveApiKey(apiKey.trim())
      setHasKey(true)
      setKeyHint(res.hint)
      setApiKey('')
      setNotice('Anthropic key saved')
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key')
    } finally {
      setSavingKey(false)
    }
  }

  async function handleRemoveKey() {
    if (!confirm('Remove your stored Anthropic API key?')) return
    try {
      await clearApiKey()
      setHasKey(false)
      setKeyHint(null)
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove key')
    }
  }

  async function fetchModels() {
    setOllamaError(null)
    setLoadingModels(true)
    try {
      const list = await listOllamaModels(ollamaBaseUrl)
      setModels(list)
      if (list.length === 0) {
        setOllamaError('Connected, but no models are installed. Run `ollama pull <model>` to add one.')
      } else if (!ollamaModel) {
        setOllamaModel(list[0].name)
      }
    } catch (e) {
      setOllamaError(e instanceof Error ? e.message : 'Failed to load models')
    } finally {
      setLoadingModels(false)
    }
  }

  async function saveProvider(nextProvider?: LlmProvider) {
    setSavingProvider(true)
    setError(null)
    try {
      const payload: { provider: LlmProvider; ollamaBaseUrl?: string | null; ollamaModel?: string | null } = {
        provider: nextProvider ?? provider,
        ollamaBaseUrl: ollamaBaseUrl.trim() || null,
        ollamaModel: ollamaModel.trim() || null,
      }
      const res = await updateLlmSettings(payload)
      setProvider(res.provider)
      setOllamaBaseUrl(res.ollamaBaseUrl ?? '')
      setOllamaModel(res.ollamaModel ?? '')
      setSettings((s) => (s ? { ...s, ...res } : s))
      setNotice(
        res.provider === 'ollama'
          ? `Using local Ollama${res.ollamaModel ? ` (${res.ollamaModel})` : ''}`
          : 'Using Anthropic Claude'
      )
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSavingProvider(false)
    }
  }

  return (
    <div
      data-mobile-modal-overlay
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        data-mobile-modal-full="true"
        className="fade-in"
        style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 500 }}>Settings</span>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {(error || notice) && (
          <div style={{ marginBottom: 12 }}>
            {error && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>{error}</p>
            )}
            {notice && (
              <p style={{ fontSize: 12, color: 'var(--green)' }}>✓ {notice}</p>
            )}
          </div>
        )}

        <p className="label" style={{ marginBottom: 6 }}>LLM provider</p>
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 2, gap: 2, marginBottom: 16 }}>
          {(['anthropic', 'ollama'] as LlmProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); saveProvider(p) }}
              disabled={savingProvider}
              style={{
                flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 4,
                background: provider === p ? 'var(--bg4)' : 'transparent',
                color: provider === p ? 'var(--text)' : 'var(--text3)',
                fontWeight: provider === p ? 500 : 400,
              }}
            >
              {p === 'anthropic' ? 'Anthropic (Claude)' : 'Ollama (local)'}
            </button>
          ))}
        </div>

        {provider === 'anthropic' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p className="label" style={{ marginBottom: 6 }}>Anthropic API key</p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? 'Enter new key to replace' : 'sk-ant-...'}
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.5 }}>
                Stored encrypted on the server, scoped to your account. Used only when calling{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Anthropic →</a>
              </p>
              {hasKey && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                    ✓ Stored: {keyHint}
                  </p>
                  <button className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }} onClick={handleRemoveKey}>
                    Remove key
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button className="btn btn-accent" onClick={handleSaveKey} disabled={!apiKey.trim() || savingKey}>
                {savingKey ? 'Saving…' : 'Save key'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p className="label" style={{ marginBottom: 6 }}>Ollama base URL</p>
              <input
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder={DEFAULT_OLLAMA_URL}
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.5 }}>
                Where your Ollama daemon is listening. Your browser talks to it directly — no traffic leaves your network. For hosted deployments,
                start Ollama with <code style={{ fontFamily: 'var(--mono)' }}>OLLAMA_ORIGINS=&quot;*&quot;</code> (or the app&apos;s origin) so CORS allows the request.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <p className="label">Model</p>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11 }}
                  onClick={fetchModels}
                  disabled={loadingModels || !ollamaBaseUrl.trim()}
                >
                  {loadingModels ? (
                    <>
                      <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Connecting…
                    </>
                  ) : models === null ? 'Load models' : 'Reload'}
                </button>
              </div>
              {models && models.length > 0 ? (
                <select
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="e.g. llama3.1:8b — load models above or type manually"
                  style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                />
              )}
              {ollamaError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>{ollamaError}</p>}
              {models && models.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 5 }}>
                  ✓ {models.length} model{models.length === 1 ? '' : 's'} available
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                className="btn btn-accent"
                onClick={() => saveProvider('ollama')}
                disabled={savingProvider || !ollamaBaseUrl.trim() || !ollamaModel.trim()}
              >
                {savingProvider ? 'Saving…' : 'Save Ollama settings'}
              </button>
            </div>

            {settings?.provider === 'ollama' && settings.ollamaBaseUrl === ollamaBaseUrl.trim() && settings.ollamaModel === ollamaModel.trim() && (
              <p style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                ✓ Active: {settings.ollamaModel} @ {settings.ollamaBaseUrl}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

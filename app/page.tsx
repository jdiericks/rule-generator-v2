'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Project } from '@/lib/types'
import {
  loadProjects,
  createProject,
  deleteProject,
  getApiKeyStatus,
  saveApiKey,
  clearApiKey,
  ApiKeyStatus,
} from '@/lib/storage'
import { TECH_OPTIONS } from '@/lib/types'
import TemplatesModal from '@/components/TemplatesModal'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [apiKey, setApiKeyState] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({ hasKey: false, hint: null })
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStack, setNewStack] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [ps, ks] = await Promise.all([loadProjects(), getApiKeyStatus()])
        setProjects(ps)
        setApiKeyStatus(ks)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function refresh() {
    setProjects(await loadProjects())
  }

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const p = await createProject({
        name: newName.trim(),
        description: newDesc.trim(),
        techStack: newStack,
      })
      setNewName(''); setNewDesc(''); setNewStack([])
      setShowNew(false)
      router.push(`/projects/${p.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create project')
    }
  }

  async function handleDeleteProject(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this project and all its sections?')) return
    await deleteProject(id)
    refresh()
  }

  async function saveKey() {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const res = await saveApiKey(apiKey.trim())
      setApiKeyStatus({ hasKey: true, hint: res.hint })
      setApiKeyState('')
      setShowSettings(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  async function removeKey() {
    if (!confirm('Remove your stored Anthropic API key?')) return
    await clearApiKey()
    setApiKeyStatus({ hasKey: false, hint: null })
  }

  function toggleTech(t: string) {
    setNewStack((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: '-0.01em' }}>rules/</span>
          <span style={{ color: 'var(--text3)', fontSize: 13 }}>builder</span>
        </div>
        <div data-mobile-wrap="true" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowTemplates(true)} title="Templates">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <span className="hide-mobile">Templates</span>
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowSettings(true)} title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="hide-mobile">Settings</span>
          </button>
          <button className="btn btn-accent" onClick={() => setShowNew(true)} title="New project">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hide-mobile">New project</span>
          </button>
          {session?.user && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn-ghost"
                onClick={() => setMenuOpen((v) => !v)}
                style={{ padding: 2, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}
                title={session.user.email ?? session.user.name ?? 'Account'}
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    width={26}
                    height={26}
                    style={{ borderRadius: '50%', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', background: 'var(--bg3)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--text2)',
                  }}>
                    {(session.user.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div
                  className="fade-in"
                  style={{
                    position: 'absolute', right: 0, top: 36, background: 'var(--bg1)',
                    border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
                    minWidth: 220, padding: 6, zIndex: 50,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                  }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, fontWeight: 500 }}>{session.user.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12,
                      color: 'var(--text2)', borderRadius: 4,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg2)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {!apiKeyStatus.hasKey && !loading && (
        <div style={{ background: 'var(--bg1)', borderBottom: '1px solid var(--border)', padding: '8px 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            AI drafting is optional. Add an Anthropic API key in{' '}
            <button onClick={() => setShowSettings(true)} style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: 12 }}>Settings</button>
            {' '}if you want Claude to help draft or expand rule content.
          </span>
        </div>
      )}

      {err && (
        <div style={{ background: 'rgba(220,60,60,0.08)', borderBottom: '1px solid var(--red)', padding: '10px 1.5rem', fontSize: 12, color: 'var(--red)' }}>
          {err} <button onClick={() => setErr(null)} style={{ color: 'var(--red)', textDecoration: 'underline', fontSize: 12, marginLeft: 8 }}>Dismiss</button>
        </div>
      )}

      <main style={{ flex: 1, padding: '1.25rem 1rem', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        {showNew && (
          <div className="fade-in" style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 500 }}>New project</span>
              <button className="btn-ghost" onClick={() => setShowNew(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" />
              <div>
                <p className="label" style={{ marginBottom: 8 }}>Tech stack</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TECH_OPTIONS.map((t) => (
                    <button key={t} onClick={() => toggleTech(t)} className={`tag${newStack.includes(t) ? ' active' : ''}`} style={{ cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="btn btn-accent" onClick={handleCreate} disabled={!newName.trim()}>Create project</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : projects.length === 0 && !showNew ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text3)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 32, marginBottom: 16, opacity: 0.3 }}>./</div>
            <p style={{ fontSize: 14, marginBottom: '1.25rem', color: 'var(--text2)' }}>No projects yet</p>
            <button className="btn btn-accent" onClick={() => setShowNew(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Create first project
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                data-mobile-wrap="true"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg1)' }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--text3)', width: 22, textAlign: 'center' }}>/</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{p.sections.length} section{p.sections.length !== 1 ? 's' : ''}</span>
                    {p.description && <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {p.description}</span>}
                  </div>
                </div>
                {p.techStack.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {p.techStack.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
                    {p.techStack.length > 3 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>+{p.techStack.length - 3}</span>}
                  </div>
                )}
                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, fontFamily: 'var(--mono)' }}>
                  {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button
                  className="btn-ghost project-row-delete"
                  onClick={(e) => handleDeleteProject(e, p.id)}
                  style={{ padding: '4px 6px', flexShrink: 0 }}
                  title="Delete project"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showTemplates && (
        <TemplatesModal onClose={() => setShowTemplates(false)} />
      )}

      {showSettings && (
        <div data-mobile-modal-overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSettings(false)}>
          <div data-mobile-modal-full="true" className="fade-in" style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 460, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 500 }}>Settings</span>
              <button className="btn-ghost" onClick={() => setShowSettings(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p className="label" style={{ marginBottom: 6 }}>Anthropic API Key</p>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  placeholder={apiKeyStatus.hasKey ? 'Enter new key to replace' : 'sk-ant-...'}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                  autoFocus
                />
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.5 }}>
                  Stored encrypted on the server, scoped to your account. Used only when calling{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Anthropic →</a>
                </p>
                {apiKeyStatus.hasKey && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <p style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                      ✓ Stored: {apiKeyStatus.hint}
                    </p>
                    <button className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }} onClick={removeKey}>
                      Remove key
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Close</button>
                <button className="btn btn-accent" onClick={saveKey} disabled={!apiKey.trim() || saving}>
                  {saving ? 'Saving…' : 'Save key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

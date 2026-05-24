'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/lib/types'
import { loadProjects, createProject, deleteProject, getApiKey, setApiKey } from '@/lib/storage'
import { TECH_OPTIONS } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKeyState] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStack, setNewStack] = useState<string[]>([])

  useEffect(() => {
    setProjects(loadProjects())
    const k = getApiKey()
    setSavedKey(k)
    setApiKeyState(k)
  }, [])

  function refresh() { setProjects(loadProjects()) }

  function handleCreate() {
    if (!newName.trim()) return
    const p = createProject({ name: newName.trim(), description: newDesc.trim(), techStack: newStack })
    setNewName(''); setNewDesc(''); setNewStack([])
    setShowNew(false)
    router.push(`/projects/${p.id}`)
  }

  function handleDeleteProject(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this project and all its sections?')) return
    deleteProject(id)
    refresh()
  }

  function saveKey() {
    setApiKey(apiKey)
    setSavedKey(apiKey)
    setShowSettings(false)
  }

  function toggleTech(t: string) {
    setNewStack(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])
  }

  const masked = savedKey ? savedKey.slice(0, 7) + '••••••••••••••' + savedKey.slice(-4) : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: '-0.01em' }}>rules/</span>
          <span style={{ color: 'var(--text3)', fontSize: 13 }}>builder</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowSettings(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button className="btn btn-accent" onClick={() => setShowNew(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New project
          </button>
        </div>
      </header>

      {/* API key warning */}
      {!savedKey && (
        <div style={{ background: 'rgba(212,168,83,0.06)', borderBottom: '1px solid var(--accent-border)', padding: '10px 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize: 13, color: 'var(--accent)' }}>Add your Anthropic API key in <button onClick={() => setShowSettings(true)} style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: 13 }}>Settings</button> to generate rule files.</span>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        {/* New project form */}
        {showNew && (
          <div className="fade-in" style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 500 }}>New project</span>
              <button className="btn-ghost" onClick={() => setShowNew(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" />
              <div>
                <p className="label" style={{ marginBottom: 8 }}>Tech stack</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TECH_OPTIONS.map(t => (
                    <button key={t} onClick={() => toggleTech(t)} className={`tag${newStack.includes(t) ? ' active' : ''}`} style={{ cursor: 'pointer' }}>{t}</button>
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

        {/* Projects */}
        {projects.length === 0 && !showNew ? (
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
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg1)' }}
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
                    {p.techStack.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                    {p.techStack.length > 3 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>+{p.techStack.length - 3}</span>}
                  </div>
                )}
                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, fontFamily: 'var(--mono)' }}>
                  {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button
                  className="btn-ghost"
                  onClick={e => handleDeleteProject(e, p.id)}
                  style={{ padding: '4px 6px', flexShrink: 0, opacity: 0, transition: 'opacity 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                  title="Delete project"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSettings(false)}>
          <div className="fade-in" style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 500 }}>Settings</span>
              <button className="btn-ghost" onClick={() => setShowSettings(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p className="label" style={{ marginBottom: 6 }}>Anthropic API Key</p>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKeyState(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                  autoFocus
                />
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.5 }}>
                  Stored only in your browser's localStorage. Never sent to any server except Anthropic's API.{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Get a key →</a>
                </p>
              </div>
              {masked && (
                <p style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                  ✓ Current key: {masked}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
                <button className="btn btn-accent" onClick={saveKey} disabled={!apiKey.trim()}>Save key</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

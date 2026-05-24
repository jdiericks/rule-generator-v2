'use client'
import { useEffect, useState } from 'react'
import { Project, RuleTemplate, TECH_OPTIONS, TemplateCategory } from '@/lib/types'
import { createTemplate, listTemplates, updateTemplate } from '@/lib/storage'

interface Props {
  project: Project
  onClose: () => void
  onSaved?: () => void
}

const CATEGORIES: TemplateCategory[] = [
  'frontend',
  'backend',
  'fullstack',
  'testing',
  'devops',
  'mcp',
]

export default function SaveAsTemplateModal({ project, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'new' | 'overwrite'>('new')
  const [userTemplates, setUserTemplates] = useState<RuleTemplate[]>([])
  const [overwriteId, setOverwriteId] = useState<string>('')

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [category, setCategory] = useState<TemplateCategory>('fullstack')
  const [techTags, setTechTags] = useState<string[]>(project.techStack)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  useEffect(() => {
    listTemplates()
      .then((all) => {
        const mine = all.filter((t) => t.source === 'user')
        setUserTemplates(mine)
        if (mine.length === 0) setMode('new')
      })
      .catch(() => {/* non-fatal */})
  }, [])

  useEffect(() => {
    if (mode === 'overwrite' && overwriteId) {
      const t = userTemplates.find((x) => x.id === overwriteId)
      if (t) {
        setName(t.name)
        setDescription(t.description)
        setCategory(t.category)
        setTechTags(t.techTags)
      }
    }
  }, [mode, overwriteId, userTemplates])

  function toggleTag(t: string) {
    setTechTags((tags) => (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]))
  }

  async function save() {
    if (!name.trim()) {
      setErr('Name is required')
      return
    }
    if (project.sections.length === 0) {
      setErr('This project has no sections to save')
      return
    }
    if (mode === 'overwrite' && !overwriteId) {
      setErr('Pick a template to overwrite')
      return
    }

    setBusy(true)
    setErr(null)
    const sections = project.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({
        name: s.name,
        type: s.type,
        globs: s.globs,
        alwaysApply: s.alwaysApply,
        description: s.description,
        requirements: s.requirements,
        order: i,
      }))

    try {
      if (mode === 'overwrite') {
        await updateTemplate(overwriteId, {
          name: name.trim(),
          description,
          category,
          techTags,
          sections,
        })
      } else {
        await createTemplate({
          name: name.trim(),
          description,
          category,
          techTags,
          sections,
        })
      }
      setSavedName(name.trim())
      onSaved?.()
      setTimeout(onClose, 900)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save template')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 500 }}>Save as template</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Captures {project.sections.length} section{project.sections.length !== 1 ? 's' : ''} for reuse. Generated content isn't included.
            </p>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {userTemplates.length > 0 && (
            <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 2, gap: 2 }}>
              {(['new', 'overwrite'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '5px 10px', fontSize: 12, borderRadius: 4,
                    background: mode === m ? 'var(--bg4)' : 'transparent',
                    color: mode === m ? 'var(--text)' : 'var(--text3)',
                    fontWeight: mode === m ? 500 : 400,
                  }}
                >
                  {m === 'new' ? 'New template' : 'Overwrite existing'}
                </button>
              ))}
            </div>
          )}

          {mode === 'overwrite' && (
            <div>
              <p className="label" style={{ marginBottom: 5 }}>Template to overwrite</p>
              <select value={overwriteId} onChange={(e) => setOverwriteId(e.target.value)}>
                <option value="">Choose…</option>
                {userTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="label" style={{ marginBottom: 5 }}>Template name</p>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Description</p>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this template set up?" />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Category</p>
            <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Tech stack tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TECH_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`tag${techTags.includes(t) ? ' active' : ''}`}
                  style={{ cursor: 'pointer', fontSize: 10 }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {err && <p style={{ fontSize: 11, color: 'var(--red)' }}>{err}</p>}
          {savedName && <p style={{ fontSize: 11, color: 'var(--green)' }}>✓ Saved "{savedName}"</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : mode === 'overwrite' ? 'Overwrite template' : 'Save template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
